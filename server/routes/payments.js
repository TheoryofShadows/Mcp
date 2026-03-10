/**
 * Payments route — Stripe Checkout for Pro/Enterprise subscriptions
 *
 * Stripe Connect (publisher payouts) and Solana Pay are out of MVP scope.
 */

import Stripe from "stripe";
import { Router } from "express";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const APP_URL = process.env.APP_URL || "http://localhost:5173";

// Initialise Stripe client — null when key not configured
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// ─── Price ID resolution ──────────────────────────────────────────────────────
// Returns the Stripe Price ID for a given tier. Checks env vars first, then
// searches existing Stripe products, and finally creates them if missing.

const TIER_CONFIG = {
  pro:        { name: "MCPX Pro Publisher",  amount: 2900,  env: "STRIPE_PRICE_PRO" },
  enterprise: { name: "MCPX Enterprise",     amount: 49900, env: "STRIPE_PRICE_ENTERPRISE" },
};

const priceIdCache = {};

async function getPriceId(tierId) {
  if (priceIdCache[tierId]) return priceIdCache[tierId];

  const cfg = TIER_CONFIG[tierId];
  if (!cfg) throw new Error(`Unknown tier: ${tierId}`);

  // 1. Use pinned env var if set
  if (process.env[cfg.env]) {
    priceIdCache[tierId] = process.env[cfg.env];
    return priceIdCache[tierId];
  }

  // 2. Search existing products by metadata
  const products = await stripe.products.list({ limit: 100, active: true });
  const existing = products.data.find(p => p.metadata?.mcpx_tier === tierId);

  if (existing) {
    const prices = await stripe.prices.list({ product: existing.id, active: true, limit: 1 });
    if (prices.data.length) {
      priceIdCache[tierId] = prices.data[0].id;
      console.log(`[stripe] Found existing price for ${tierId}: ${priceIdCache[tierId]}`);
      return priceIdCache[tierId];
    }
  }

  // 3. Create product + recurring price
  const product = existing || await stripe.products.create({
    name: cfg.name,
    metadata: { mcpx_tier: tierId },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: cfg.amount,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { mcpx_tier: tierId },
  });

  priceIdCache[tierId] = price.id;
  console.log(`[stripe] Created price for ${tierId}: ${price.id} — save as ${cfg.env}=${price.id}`);
  return priceIdCache[tierId];
}

// ─── POST /api/payments/stripe/checkout ──────────────────────────────────────

router.post("/stripe/checkout", requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(501).json({ error: "Stripe is not configured" });
  }

  const { tier } = req.body;
  if (!TIER_CONFIG[tier]) {
    return res.status(400).json({ error: "tier must be 'pro' or 'enterprise'" });
  }

  try {
    const user = db.prepare("SELECT stripe_customer_id, email FROM users WHERE id = ?").get(req.user.id);
    const priceId = await getPriceId(tier);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(user?.stripe_customer_id
        ? { customer: user.stripe_customer_id }
        : { customer_email: user?.email || req.user.email }),
      client_reference_id: req.user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/dashboard?upgraded=1`,
      cancel_url:  `${APP_URL}/tiers?cancelled=1`,
    });

    res.json({ checkout_url: session.url });
  } catch (err) {
    console.error("[stripe] checkout error:", err.message);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// ─── POST /api/payments/stripe/webhook ───────────────────────────────────────
// Body is raw (express.raw applied in app.js before express.json)

router.post("/stripe/webhook", async (req, res) => {
  if (!stripe) {
    return res.status(501).json({ error: "Stripe is not configured" });
  }

  const sig    = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    return res.status(501).json({ error: "STRIPE_WEBHOOK_SECRET is not set" });
  }
  if (!sig) {
    return res.status(400).json({ error: "Missing stripe-signature header" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId  = session.client_reference_id;
      if (!userId) return res.json({ received: true });

      // Determine tier from the subscription's price metadata
      const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
      const priceId   = stripeSub.items.data[0]?.price?.id;
      const tier = Object.entries(TIER_CONFIG).find(
        ([, cfg]) => priceIdCache[cfg.env === "STRIPE_PRICE_PRO" ? "pro" : "enterprise"] === priceId
          || (process.env[cfg.env] && process.env[cfg.env] === priceId)
      )?.[0] || stripeSub.items.data[0]?.price?.metadata?.mcpx_tier;

      if (tier) {
        db.prepare("UPDATE users SET stripe_customer_id = ?, tier = ?, updated_at = datetime('now') WHERE id = ?")
          .run(session.customer, tier, userId);

        db.prepare("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'")
          .run(userId);

        const expiresAt = new Date(stripeSub.current_period_end * 1000).toISOString();
        db.prepare(
          "INSERT INTO subscriptions (id, user_id, tier, status, stripe_subscription_id, expires_at) VALUES (?, ?, ?, 'active', ?, ?)"
        ).run(uuid(), userId, tier, session.subscription, expiresAt);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      db.prepare("UPDATE users SET tier = 'starter', updated_at = datetime('now') WHERE stripe_customer_id = ?")
        .run(sub.customer);
      db.prepare("UPDATE subscriptions SET status = 'expired' WHERE stripe_subscription_id = ?")
        .run(sub.id);
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      // Sync expiry on renewal
      const expiresAt = new Date(sub.current_period_end * 1000).toISOString();
      db.prepare("UPDATE subscriptions SET expires_at = ? WHERE stripe_subscription_id = ?")
        .run(expiresAt, sub.id);
    }
  } catch (err) {
    console.error("[stripe] webhook handler error:", err.message);
    return res.status(500).json({ error: "Webhook handler failed" });
  }

  res.json({ received: true });
});

// ─── GET /api/payments/stripe/connect ────────────────────────────────────────
// Stripe Connect (publisher payouts) — out of MVP scope

router.get("/stripe/connect", requireAuth, (_req, res) => {
  res.status(501).json({
    error: "Stripe Connect onboarding coming soon",
    docs: "https://stripe.com/docs/connect/onboarding",
  });
});

// ─── Solana Pay ───────────────────────────────────────────────────────────────

router.post("/solana/request", async (_req, res) => {
  res.status(501).json({
    error: "Solana Pay integration coming soon",
    docs: "https://docs.solanapay.com",
  });
});

export default router;

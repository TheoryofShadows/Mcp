/**
 * Payments — Stripe Connect SaaS platform integration
 *
 * Two flows:
 *  1. Platform subscriptions — publishers pay MCPX (Pro $29/mo, Enterprise $499/mo)
 *     via Stripe Checkout in "subscription" mode.
 *
 *  2. Stripe Connect (publisher payouts) — publishers onboard as Express connected
 *     accounts; when users purchase paid tools the charge is a destination charge
 *     with 15% application_fee_amount retained by the platform.
 *
 * References:
 *   https://docs.stripe.com/connect/saas/quickstart
 *   https://docs.stripe.com/connect/destination-charges
 *   https://docs.stripe.com/connect/onboarding/quickstart
 */

import Stripe from "stripe";
import { Router } from "express";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const APP_URL = process.env.APP_URL || "http://localhost:5173";
const PLATFORM_FEE_PCT = 0.15; // 15% — publishers keep 85%

// Initialise Stripe client — null when key not configured
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

function requireStripe(res) {
  if (!stripe) {
    res.status(501).json({ error: "Stripe is not configured (STRIPE_SECRET_KEY missing)" });
    return false;
  }
  return true;
}

// ─── Platform subscription price IDs ─────────────────────────────────────────

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
// Create a Checkout Session for a platform subscription (Pro / Enterprise).

router.post("/stripe/checkout", requireAuth, async (req, res) => {
  if (!requireStripe(res)) return;

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

// ─── POST /api/payments/stripe/tool-checkout ─────────────────────────────────
// Destination charge checkout for a paid MCP tool.
// 15% application_fee_amount stays with the platform; 85% goes to the publisher.

router.post("/stripe/tool-checkout", requireAuth, async (req, res) => {
  if (!requireStripe(res)) return;

  const { server_slug } = req.body;
  if (!server_slug) return res.status(400).json({ error: "server_slug required" });

  const server = db.prepare(`
    SELECT s.*, u.stripe_account_id, u.stripe_onboarding_done
    FROM servers s JOIN users u ON u.id = s.author_id
    WHERE s.slug = ? AND s.status = 'active'
  `).get(server_slug);

  if (!server) return res.status(404).json({ error: "Server not found" });
  if (server.price_type !== "paid" || !server.price_amount) {
    return res.status(400).json({ error: "This tool is free" });
  }
  if (!server.stripe_account_id || !server.stripe_onboarding_done) {
    return res.status(402).json({ error: "Publisher has not completed Stripe onboarding" });
  }

  try {
    const appFee = Math.round(server.price_amount * PLATFORM_FEE_PCT);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: req.user.email,
      client_reference_id: req.user.id,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: server.price_amount,
          product_data: {
            name: server.name,
            description: server.description?.slice(0, 255),
            metadata: { server_slug, server_id: server.id },
          },
        },
      }],
      payment_intent_data: {
        application_fee_amount: appFee,
        transfer_data: { destination: server.stripe_account_id },
      },
      success_url: `${APP_URL}/tools/${server_slug}?purchased=1`,
      cancel_url:  `${APP_URL}/tools/${server_slug}`,
      metadata: { server_slug, server_id: server.id, buyer_id: req.user.id },
    });

    res.json({ checkout_url: session.url });
  } catch (err) {
    console.error("[stripe] tool-checkout error:", err.message);
    res.status(500).json({ error: "Failed to create tool checkout session" });
  }
});

// ─── GET /api/payments/stripe/connect ────────────────────────────────────────
// Creates an Express connected account (if not already created) and returns
// an account_onboarding link so the publisher can complete KYC/bank setup.

router.get("/stripe/connect", requireAuth, async (req, res) => {
  if (!requireStripe(res)) return;

  try {
    const user = db.prepare("SELECT stripe_account_id, stripe_onboarding_done, email FROM users WHERE id = ?")
      .get(req.user.id);

    let accountId = user?.stripe_account_id;

    if (!accountId) {
      // Create an Express connected account per the SaaS quickstart:
      // https://docs.stripe.com/connect/saas/quickstart
      const account = await stripe.accounts.create({
        controller: {
          stripe_dashboard: { type: "express" },
          fees:             { payer: "application" },     // platform pays Stripe fees
          losses:           { payments: "application" },  // platform covers disputes
          requirement_collection: "application",          // platform drives onboarding
        },
        capabilities: {
          card_payments: { requested: true },
          transfers:     { requested: true },
        },
        email: user?.email || req.user.email,
      });

      accountId = account.id;
      db.prepare("UPDATE users SET stripe_account_id = ? WHERE id = ?")
        .run(accountId, req.user.id);
      console.log(`[stripe] Created Connect account ${accountId} for user ${req.user.id}`);
    }

    if (user?.stripe_onboarding_done) {
      // Already onboarded — return Express dashboard login link
      const loginLink = await stripe.accounts.createLoginLink(accountId);
      return res.json({ dashboard_url: loginLink.url, onboarding_done: true });
    }

    // Generate an onboarding AccountLink (single-use, expires after 5 min)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      return_url:  `${APP_URL}/dashboard?connect=success`,
      refresh_url: `${APP_URL}/api/payments/stripe/connect/refresh`,
      type: "account_onboarding",
    });

    res.json({ onboarding_url: accountLink.url, account_id: accountId });
  } catch (err) {
    console.error("[stripe] connect error:", err.message);
    res.status(500).json({ error: "Failed to create Connect account" });
  }
});

// ─── GET /api/payments/stripe/connect/refresh ────────────────────────────────
// Re-generates an onboarding AccountLink when the previous one expired.
// Stripe redirects the publisher here if they close the tab and come back.

router.get("/stripe/connect/refresh", requireAuth, async (req, res) => {
  if (!requireStripe(res)) return;

  try {
    const user = db.prepare("SELECT stripe_account_id FROM users WHERE id = ?").get(req.user.id);
    if (!user?.stripe_account_id) {
      return res.redirect(`${APP_URL}/dashboard?connect=not_started`);
    }

    const accountLink = await stripe.accountLinks.create({
      account: user.stripe_account_id,
      return_url:  `${APP_URL}/dashboard?connect=success`,
      refresh_url: `${APP_URL}/api/payments/stripe/connect/refresh`,
      type: "account_onboarding",
    });

    res.redirect(accountLink.url);
  } catch (err) {
    console.error("[stripe] connect refresh error:", err.message);
    res.redirect(`${APP_URL}/dashboard?connect=error`);
  }
});

// ─── POST /api/payments/stripe/webhook ───────────────────────────────────────
// Handles both platform (subscription) and Connect (account) events.
// Body is raw Buffer — express.raw() applied in app.js before express.json().

router.post("/stripe/webhook", async (req, res) => {
  if (!stripe) {
    return res.status(501).json({ error: "Stripe is not configured" });
  }

  const sig    = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) return res.status(501).json({ error: "STRIPE_WEBHOOK_SECRET is not set" });
  if (!sig)    return res.status(400).json({ error: "Missing stripe-signature header" });

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` });
  }

  try {
    switch (event.type) {

      // ── Platform subscription purchased ───────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId  = session.client_reference_id;
        if (!userId) break;

        if (session.mode === "subscription") {
          // Publisher tier upgrade
          const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
          const priceId   = stripeSub.items.data[0]?.price?.id;
          const tier = Object.entries(TIER_CONFIG).find(
            ([id, cfg]) => priceIdCache[id] === priceId || process.env[cfg.env] === priceId
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

        if (session.mode === "payment") {
          // Tool purchase — record the install
          const { server_id } = session.metadata || {};
          if (server_id) {
            db.prepare("INSERT INTO installs (id, server_id, user_id) VALUES (?, ?, ?)")
              .run(uuid(), server_id, userId);
          }
        }
        break;
      }

      // ── Subscription renewed / upgraded / downgrade-pending ───────────────
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const expiresAt = new Date(sub.current_period_end * 1000).toISOString();
        db.prepare("UPDATE subscriptions SET expires_at = ? WHERE stripe_subscription_id = ?")
          .run(expiresAt, sub.id);
        break;
      }

      // ── Subscription cancelled / payment failed ───────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        db.prepare("UPDATE users SET tier = 'starter', updated_at = datetime('now') WHERE stripe_customer_id = ?")
          .run(sub.customer);
        db.prepare("UPDATE subscriptions SET status = 'expired' WHERE stripe_subscription_id = ?")
          .run(sub.id);
        break;
      }

      // ── Connect: publisher completed onboarding ───────────────────────────
      // Fired when a connected account's requirements change (including first-time
      // submission). Mark the publisher as ready to receive payouts.
      case "account.updated": {
        const account = event.data.object;
        if (account.details_submitted) {
          db.prepare(
            "UPDATE users SET stripe_onboarding_done = 1, updated_at = datetime('now') WHERE stripe_account_id = ?"
          ).run(account.id);
          console.log(`[stripe] Publisher onboarding complete for account ${account.id}`);
        }
        break;
      }
    }
  } catch (err) {
    console.error("[stripe] webhook handler error:", err.message);
    return res.status(500).json({ error: "Webhook handler failed" });
  }

  res.json({ received: true });
});

// ─── Solana Pay ───────────────────────────────────────────────────────────────

router.post("/solana/request", async (_req, res) => {
  res.status(501).json({
    error: "Solana Pay integration coming soon",
    docs: "https://docs.solanapay.com",
  });
});

export default router;

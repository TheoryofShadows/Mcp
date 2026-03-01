import { Router } from "express";
import Stripe from "stripe";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { v4 as uuid } from "uuid";

const router = Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
};

const APP_URL = process.env.APP_URL || "http://localhost:5173";

// POST /api/billing/checkout — create a Stripe Checkout session
router.post("/checkout", requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: "Stripe is not configured. Set STRIPE_SECRET_KEY." });
  }
  const { tier } = req.body;
  if (!PRICE_IDS[tier]) {
    return res.status(400).json({ error: "Invalid tier. Must be 'pro' or 'enterprise'." });
  }

  try {
    const user = db.prepare("SELECT id, email, display_name, stripe_customer_id FROM users WHERE id = ?").get(req.user.id);

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.display_name || user.email,
        metadata: { mcpx_user_id: user.id },
      });
      customerId = customer.id;
      db.prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?").run(customerId, user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: PRICE_IDS[tier], quantity: 1 }],
      mode: "subscription",
      success_url: `${APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&upgraded=true`,
      cancel_url: `${APP_URL}/revenue`,
      subscription_data: {
        metadata: { mcpx_user_id: user.id, tier },
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/portal — create a Stripe Customer Portal session
router.post("/portal", requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: "Stripe is not configured." });
  }
  const user = db.prepare("SELECT stripe_customer_id FROM users WHERE id = ?").get(req.user.id);
  if (!user?.stripe_customer_id) {
    return res.status(400).json({ error: "No billing account found. Subscribe to a paid plan first." });
  }
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${APP_URL}/dashboard`,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/billing/status — get current subscription status
router.get("/status", requireAuth, (req, res) => {
  const sub = db.prepare(`
    SELECT tier, status, current_period_end, cancel_at_period_end, stripe_subscription_id, created_at
    FROM subscriptions
    WHERE user_id = ? AND status = 'active'
    ORDER BY created_at DESC LIMIT 1
  `).get(req.user.id);

  const user = db.prepare("SELECT tier FROM users WHERE id = ?").get(req.user.id);

  res.json({
    tier: user?.tier || "starter",
    subscription: sub || null,
  });
});

// POST /api/billing/webhook — handle Stripe webhook events
// NOTE: This handler requires express.raw() body — mounted separately in index.js
export async function webhookHandler(req, res) {
  if (!stripe) {
    return res.status(503).json({ error: "Stripe is not configured." });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency — skip already-processed events
  const existing = db.prepare("SELECT id FROM webhook_events WHERE id = ?").get(event.id);
  if (existing) return res.json({ received: true });
  db.prepare("INSERT INTO webhook_events (id, type) VALUES (?, ?)").run(event.id, event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription") break;

        const sub = await stripe.subscriptions.retrieve(session.subscription);
        const userId = sub.metadata?.mcpx_user_id;
        const tier = sub.metadata?.tier;
        if (!userId || !tier) break;

        // Cancel any existing active subscriptions
        db.prepare("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'").run(userId);

        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        db.prepare(`
          INSERT INTO subscriptions (id, user_id, tier, status, stripe_subscription_id, stripe_price_id, current_period_end, expires_at)
          VALUES (?, ?, ?, 'active', ?, ?, ?, ?)
        `).run(uuid(), userId, tier, sub.id, sub.items.data[0]?.price?.id || null, periodEnd, periodEnd);

        db.prepare("UPDATE users SET tier = ?, stripe_customer_id = ?, updated_at = datetime('now') WHERE id = ?")
          .run(tier, sub.customer, userId);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        db.prepare(`
          UPDATE subscriptions SET current_period_end = ?, expires_at = ?, status = 'active'
          WHERE stripe_subscription_id = ?
        `).run(periodEnd, periodEnd, sub.id);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        db.prepare(`
          UPDATE subscriptions SET cancel_at_period_end = ?, current_period_end = ?
          WHERE stripe_subscription_id = ?
        `).run(sub.cancel_at_period_end ? 1 : 0, periodEnd, sub.id);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const userId = sub.metadata?.mcpx_user_id;
        db.prepare("UPDATE subscriptions SET status = 'expired' WHERE stripe_subscription_id = ?").run(sub.id);
        if (userId) {
          db.prepare("UPDATE users SET tier = 'starter', updated_at = datetime('now') WHERE id = ?").run(userId);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    // Still return 200 to prevent Stripe retries for non-recoverable errors
  }

  res.json({ received: true });
}

export default router;

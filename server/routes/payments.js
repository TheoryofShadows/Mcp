/**
 * Payments route — stubs for Stripe + Solana Pay
 *
 * TODO: Implement full payment flows:
 *   Stripe: https://stripe.com/docs/connect
 *   Solana Pay: https://docs.solanapay.com
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ─── Stripe ──────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/stripe/checkout
 * Create a Stripe Checkout session for a paid server subscription.
 *
 * Body: { server_slug, price_id }
 * Returns: { checkout_url }
 */
router.post("/stripe/checkout", requireAuth, async (req, res) => {
  // TODO: Integrate Stripe SDK
  // const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  // const session = await stripe.checkout.sessions.create({ ... });
  // res.json({ checkout_url: session.url });

  res.status(501).json({
    error: "Stripe payments coming soon",
    docs: "https://stripe.com/docs/checkout",
  });
});

/**
 * POST /api/payments/stripe/webhook
 * Handle Stripe webhook events (payment_intent.succeeded, etc.)
 *
 * Stripe requires the raw body for signature verification — mount this route
 * BEFORE express.json() or use express.raw({ type: "application/json" }) here.
 */
router.post("/stripe/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  // Reject all webhook calls if no secret is configured — prevents spoofed events.
  if (!secret) {
    return res.status(501).json({ error: "Stripe webhook not configured" });
  }

  if (!sig) {
    return res.status(400).json({ error: "Missing stripe-signature header" });
  }

  // TODO: Uncomment when Stripe SDK is installed:
  // import Stripe from "stripe";
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  // try {
  //   const event = stripe.webhooks.constructEvent(req.body, sig, secret);
  //   // handle event.type ...
  //   return res.json({ received: true });
  // } catch (err) {
  //   return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` });
  // }

  res.status(501).json({ error: "Stripe webhook handler not yet implemented" });
});

/**
 * GET /api/payments/stripe/connect
 * Initiate Stripe Connect onboarding for a creator.
 */
router.get("/stripe/connect", requireAuth, async (req, res) => {
  // TODO: Create Stripe Connect account link
  // const accountLink = await stripe.accountLinks.create({ ... });

  res.status(501).json({
    error: "Stripe Connect onboarding coming soon",
    docs: "https://stripe.com/docs/connect/onboarding",
  });
});

// ─── Solana Pay ───────────────────────────────────────────────────────────────

/**
 * POST /api/payments/solana/request
 * Generate a Solana Pay transfer request URL for a one-time payment.
 *
 * Body: { server_slug, amount_usd }
 * Returns: { solana_pay_url, qr_data }
 */
router.post("/solana/request", async (req, res) => {
  // TODO: Integrate @solana/pay
  // const { server_slug, amount_usd } = req.body;
  // const recipient = new PublicKey(process.env.SOLANA_PAY_MERCHANT_WALLET);
  // const url = encodeURL({ recipient, amount, label, memo });

  res.status(501).json({
    error: "Solana Pay integration coming soon",
    docs: "https://docs.solanapay.com",
  });
});

export default router;

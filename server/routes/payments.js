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
 */
router.post("/stripe/webhook", async (req, res) => {
  // TODO: Verify Stripe webhook signature
  // const sig = req.headers["stripe-signature"];
  // const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

  res.json({ received: true });
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

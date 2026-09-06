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
import {
  getSolanaConfig,
  isValidPubkey,
  centsToLamports,
  splitLamports,
  newReferencePubkey,
  verifyPurchaseTransaction,
} from "../lib/solanaPay.js";

const router = Router();

const APP_URL = process.env.APP_URL || "http://localhost:5173";
const PLATFORM_FEE_PCT = 0.15; // 15% — publishers keep 85%

// Initialise Stripe client — null when key not configured.
// Pin the API version so object shapes can't drift under us on an SDK bump.
// As of Basil (2025-03-31) and later — which this SDK defaults to — the billing
// period fields live on the subscription *item*, not the subscription.
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" })
  : null;

// Live vs test is decided by the key prefix — Stripe never mixes the two, so a
// `sk_test_`/`rk_test_` key means every charge below is a sandbox charge and no
// real money moves. Derived from the prefix only; the key itself never leaves here.
export function stripeKeyMode(key = process.env.STRIPE_SECRET_KEY) {
  if (!key) return "unset";
  if (/^(sk|rk)_live_/.test(key)) return "live";
  if (/^(sk|rk)_test_/.test(key)) return "test";
  return "unknown";
}

// A connected account can have submitted its details and still be unable to take
// money: Stripe holds `transfers` inactive until verification clears, and a
// missing bank account leaves `payouts_enabled` false. Destination charges need
// the transfers capability active, and the publisher needs payouts_enabled to
// ever see the money in their bank — so both gate "this publisher can be paid".
export function payoutReadiness(account) {
  const transfers = account?.capabilities?.transfers;
  const ready = !!(
    account?.details_submitted &&
    account?.charges_enabled &&
    account?.payouts_enabled &&
    transfers === "active"
  );
  let status;
  if (ready) status = "enabled";
  else if (!account?.details_submitted) status = "pending";
  else if (account?.requirements?.disabled_reason) status = "restricted";
  else status = "verifying";
  return {
    ready,
    status,
    details_submitted: !!account?.details_submitted,
    charges_enabled: !!account?.charges_enabled,
    payouts_enabled: !!account?.payouts_enabled,
    transfers_capability: transfers || "inactive",
    disabled_reason: account?.requirements?.disabled_reason || null,
    currently_due: account?.requirements?.currently_due || [],
  };
}

// `processed_events` is the webhook idempotency ledger — it grows by one row per
// Stripe event forever. Stripe never replays an event older than a few days, so
// rows past the retention window are dead weight. Prune them periodically to keep
// the table bounded. Exported so it can be unit-tested directly.
const PROCESSED_EVENT_RETENTION_DAYS = 90;
export function cleanupProcessedEvents() {
  return db.prepare(
    `DELETE FROM processed_events WHERE processed_at < datetime('now', ?)`
  ).run(`-${PROCESSED_EVENT_RETENTION_DAYS} days`).changes;
}
// .unref() so this never keeps the process (or a test runner) alive.
setInterval(cleanupProcessedEvents, 24 * 60 * 60 * 1000).unref();

// Current billing period end moved from the Subscription to its items in Basil.
// Prefer the item-level field (Basil+, what our SDK and recent webhook endpoints
// emit) and fall back to the legacy top-level field, since webhook payload shape
// follows the *endpoint's* API version — which may lag the SDK. Either way we
// never throw: a missing value yields null ("no expiry"), not new Date(NaN).
export function periodEndISO(subscription) {
  const end =
    subscription?.items?.data?.[0]?.current_period_end ??
    subscription?.current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}

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

  // 3. Create product + recurring price — idempotency key prevents duplicate
  //    products if two requests race before the cache is populated.
  const product = existing || await stripe.products.create(
    { name: cfg.name, metadata: { mcpx_tier: tierId } },
    { idempotencyKey: `mcpx-product-${tierId}` }
  );

  const price = await stripe.prices.create(
    {
      product: product.id,
      unit_amount: cfg.amount,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { mcpx_tier: tierId },
    },
    { idempotencyKey: `mcpx-price-${tierId}` }
  );

  priceIdCache[tierId] = price.id;
  console.log(`[stripe] Created price for ${tierId}: ${price.id} — save as ${cfg.env}=${price.id}`);
  return priceIdCache[tierId];
}

// ─── GET /api/payments/stripe/config ─────────────────────────────────────────
// Public readiness, mirroring /solana/config. No secrets — only whether the
// pieces that have to be set for real money to move actually are, and whether
// the key in use is live or test. This is the endpoint to curl after a deploy
// to answer "are we live?" without opening the Stripe Dashboard.

router.get("/stripe/config", (_req, res) => {
  const mode = stripeKeyMode();
  const configured = !!stripe;
  const webhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
  const live = configured && mode === "live" && webhookSecret;

  res.json({
    enabled: configured,
    mode,                              // live | test | unknown | unset
    livemode: mode === "live",
    webhook_secret_set: webhookSecret,
    publishable_key_set: !!process.env.VITE_STRIPE_PUBLISHABLE_KEY,
    prices_pinned: {
      pro: !!process.env.STRIPE_PRICE_PRO,
      enterprise: !!process.env.STRIPE_PRICE_ENTERPRISE,
    },
    platform_fee_pct: PLATFORM_FEE_PCT * 100,
    publisher_share_pct: (1 - PLATFORM_FEE_PCT) * 100,
    app_url: APP_URL,
    label: !configured
      ? "Not configured"
      : live
        ? "Live (mainnet money)"
        : mode === "test"
          ? "Test mode — no real charges"
          : "Configured (incomplete)",
  });
});

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
      success_url: `${APP_URL}/tool/${server_slug}?purchased=1`,
      cancel_url:  `${APP_URL}/tool/${server_slug}`,
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
    let onboardingDone = !!user?.stripe_onboarding_done;

    if (!accountId) {
      // Create an Express connected account per the SaaS quickstart:
      // https://docs.stripe.com/connect/saas/quickstart
      // Stripe requirement: when requirement_collection is "application",
      // dashboard must be "none" and fees/losses must also be platform-controlled.
      const account = await stripe.accounts.create({
        type: "express",
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

    // Connected-account webhooks are easy to miss in Dashboard config, so always
    // reconcile against Stripe — in both directions. An account that finished KYC
    // becomes payout-ready even if account.updated never arrived, and one Stripe
    // has since restricted stops being advertised as able to take money.
    let readiness = null;
    if (accountId) {
      try {
        const live = await stripe.accounts.retrieve(accountId);
        readiness = payoutReadiness(live);
        if (readiness.ready !== onboardingDone) {
          console.log(
            `[stripe] Payout readiness for ${accountId} (user ${req.user.id}): ` +
            `${onboardingDone ? "ready" : "not ready"} → ${readiness.ready ? "ready" : readiness.status}`
          );
        }
        db.prepare(
          "UPDATE users SET stripe_onboarding_done = ?, stripe_payouts_status = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(readiness.ready ? 1 : 0, readiness.status, req.user.id);
        onboardingDone = readiness.ready;
      } catch (syncErr) {
        console.error("[stripe] onboarding sync error:", syncErr.message);
      }
    }

    if (onboardingDone) {
      // Already onboarded — return Express dashboard login link
      const loginLink = await stripe.accounts.createLoginLink(accountId);
      return res.json({
        dashboard_url: loginLink.url,
        onboarding_done: true,
        payouts: readiness,
      });
    }

    // Generate an onboarding AccountLink (single-use, expires after 5 min)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      return_url:  `${APP_URL}/dashboard?connect=success`,
      refresh_url: `${APP_URL}/api/payments/stripe/connect/refresh`,
      type: "account_onboarding",
    });

    res.json({ onboarding_url: accountLink.url, account_id: accountId, payouts: readiness });
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

// Grant a paid tool: unlock the install and record the sale that feeds both the
// publisher's earnings and the platform's 15%. One transaction, so a Stripe retry
// after a failed delivery re-applies it cleanly instead of finding a half-written
// grant. Exported for tests.

export function grantToolPurchase({ server_id, buyer_id, gross_cents }) {
  if (!server_id || !buyer_id) return { granted: false, reason: "missing server_id or buyer_id" };

  const grossCents = Number(gross_cents) || 0;
  const feeCents = Math.round(grossCents * PLATFORM_FEE_PCT);

  db.transaction(() => {
    // installs is UNIQUE(server_id, user_id) — a buyer who already had this tool
    // installed for free must not blow up the sale row that pays the publisher.
    // Same INSERT OR IGNORE + counter pattern as POST /api/servers/:slug/install,
    // so a paid install counts toward adoption exactly once.
    const inserted = db.prepare(
      "INSERT OR IGNORE INTO installs (id, server_id, user_id) VALUES (?, ?, ?)"
    ).run(uuid(), server_id, buyer_id).changes;
    if (inserted > 0) {
      db.prepare("UPDATE servers SET installs = installs + 1 WHERE id = ?").run(server_id);
    }

    if (grossCents > 0) {
      db.prepare(
        "INSERT INTO sales (id, server_id, buyer_id, gross_cents, fee_cents, payment_method) VALUES (?, ?, ?, ?, ?, 'stripe')"
      ).run(uuid(), server_id, buyer_id, grossCents, feeCents);
    }
  })();

  return { granted: true, gross_cents: grossCents, fee_cents: feeCents };
}

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

  // Claim the event so two concurrent deliveries can't both run the handler.
  // The claim is *released* below if the handler throws — otherwise a transient
  // failure would be permanent: we'd 500, Stripe would retry, and the retry
  // would short-circuit as a duplicate with the money taken and nothing granted.
  const claimed = db.prepare(
    "INSERT INTO processed_events (event_id, event_type) VALUES (?, ?) ON CONFLICT(event_id) DO NOTHING"
  ).run(event.id, event.type).changes;

  if (!claimed) {
    return res.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {

      // ── Platform subscription purchased / paid tool bought ────────────────
      // async_payment_succeeded carries the same session shape and lands here
      // when a delayed-notification method (e.g. bank debit) finally clears.
      case "checkout.session.async_payment_succeeded":
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

          if (!tier) {
            // Payment taken but tier unresolvable — log for manual recovery, don't swallow
            console.error(
              `[stripe] UNRESOLVED TIER for user ${userId} — priceId=${priceId}` +
              ` subscriptionId=${session.subscription} — manual upgrade required`
            );
            break;
          }

          // One transaction: the tier bump and the subscription row land together
          // or not at all, so a released retry can't leave a user upgraded with no
          // subscription row (or cancel their old one for nothing).
          const expiresAt = periodEndISO(stripeSub);
          db.transaction(() => {
            db.prepare("UPDATE users SET stripe_customer_id = ?, tier = ?, updated_at = datetime('now') WHERE id = ?")
              .run(session.customer, tier, userId);
            db.prepare("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'")
              .run(userId);
            db.prepare(
              "INSERT INTO subscriptions (id, user_id, tier, status, stripe_subscription_id, expires_at) VALUES (?, ?, ?, 'active', ?, ?)"
            ).run(uuid(), userId, tier, session.subscription, expiresAt);
          })();
        }

        if (session.mode === "payment") {
          // Tool purchase — unlock the install and record the sale (real revenue).
          // Only grant once the money is actually in: a card checkout arrives here
          // already paid, but a delayed-notification method completes the session
          // while still unpaid and clears later via async_payment_succeeded.
          if (session.payment_status !== "paid") {
            console.log(
              `[stripe] session ${session.id} completed but payment_status=` +
              `${session.payment_status} — deferring grant`
            );
            break;
          }
          grantToolPurchase({
            server_id: session.metadata?.server_id,
            buyer_id: userId,
            gross_cents: session.amount_total,
          });
        }
        break;
      }

      // ── Subscription renewed / upgraded / downgrade-pending ───────────────
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const expiresAt = periodEndISO(sub);
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

      // ── Connect: publisher payout readiness changed ───────────────────────
      // Fired when a connected account's requirements change (including first-time
      // submission). Mirror Stripe's own verdict on whether this publisher can be
      // paid — including revoking readiness when Stripe restricts the account.
      case "account.updated": {
        const account = event.data.object;
        const readiness = payoutReadiness(account);
        db.prepare(
          "UPDATE users SET stripe_onboarding_done = ?, stripe_payouts_status = ?, updated_at = datetime('now') WHERE stripe_account_id = ?"
        ).run(readiness.ready ? 1 : 0, readiness.status, account.id);
        console.log(
          `[stripe] Account ${account.id} payout status: ${readiness.status}` +
          (readiness.disabled_reason ? ` (${readiness.disabled_reason})` : "")
        );
        break;
      }
    }
  } catch (err) {
    // Release the claim so Stripe's retry is actually reprocessed. Guarded: a
    // failing release must not replace the 500 that tells Stripe to retry.
    try {
      db.prepare("DELETE FROM processed_events WHERE event_id = ?").run(event.id);
    } catch (releaseErr) {
      console.error("[stripe] failed to release event claim:", releaseErr.message);
    }
    console.error(`[stripe] webhook handler error (${event.type} ${event.id}):`, err.message);
    return res.status(500).json({ error: "Webhook handler failed" });
  }

  res.json({ received: true });
});

// ─── Solana Pay (paid tools — Phantom / Wallet Standard) ─────────────────────

function requireSolana(res) {
  const cfg = getSolanaConfig();
  if (!cfg.enabled) {
    res.status(501).json({
      error: "Solana Pay is not configured (set SOLANA_TREASURY_WALLET)",
      cluster: cfg.cluster,
      docs: "https://docs.solanapay.com",
    });
    return null;
  }
  return cfg;
}

// GET /api/payments/solana/config — public readiness (no secrets)
router.get("/solana/config", (_req, res) => {
  const cfg = getSolanaConfig();
  res.json({
    enabled: cfg.enabled,
    cluster: cfg.cluster,
    currency: cfg.currency,
    currency_label: cfg.currency_label,
    fx_note: cfg.fx_note,
    usd_per_sol: cfg.usdPerSol,
    platform_fee_pct: PLATFORM_FEE_PCT * 100,
    label: cfg.enabled
      ? (cfg.cluster === "mainnet-beta" ? "Live (mainnet)" : `Live (${cfg.cluster})`)
      : "Coming soon",
  });
});

// PUT /api/payments/solana/wallet — publisher saves payout pubkey
router.put("/solana/wallet", requireAuth, (req, res) => {
  const { solana_wallet } = req.body || {};
  if (!solana_wallet || !isValidPubkey(solana_wallet)) {
    return res.status(400).json({ error: "solana_wallet must be a valid base58 Solana pubkey" });
  }
  db.prepare(
    "UPDATE users SET solana_wallet = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(solana_wallet, req.user.id);
  res.json({ solana_wallet, saved: true });
});

// DELETE /api/payments/solana/wallet — clear publisher wallet
router.delete("/solana/wallet", requireAuth, (req, res) => {
  db.prepare(
    "UPDATE users SET solana_wallet = NULL, updated_at = datetime('now') WHERE id = ?"
  ).run(req.user.id);
  res.json({ cleared: true });
});

// POST /api/payments/solana/request — create pending purchase + return pay params
router.post("/solana/request", requireAuth, (req, res) => {
  const cfg = requireSolana(res);
  if (!cfg) return;

  const { server_slug } = req.body || {};
  if (!server_slug) return res.status(400).json({ error: "server_slug required" });

  const server = db.prepare(`
    SELECT s.*, u.solana_wallet
    FROM servers s JOIN users u ON u.id = s.author_id
    WHERE s.slug = ? AND s.status = 'active'
  `).get(server_slug);

  if (!server) return res.status(404).json({ error: "Server not found" });
  if (server.price_type !== "paid" || !server.price_amount) {
    return res.status(400).json({ error: "This tool is free" });
  }
  if (!server.solana_wallet || !isValidPubkey(server.solana_wallet)) {
    return res.status(402).json({ error: "Publisher has not set a Solana payout wallet" });
  }

  const grossCents = server.price_amount;
  const feeCents = Math.round(grossCents * PLATFORM_FEE_PCT);
  const totalLamports = centsToLamports(grossCents, cfg.usdPerSol);
  const { publisher_lamports, platform_lamports } = splitLamports(totalLamports);
  const reference = newReferencePubkey();
  const purchaseId = uuid();

  db.prepare(`
    INSERT INTO solana_purchases (
      id, buyer_id, server_id, reference, recipient, platform_recipient,
      gross_cents, fee_cents, publisher_lamports, platform_lamports, cluster, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(
    purchaseId,
    req.user.id,
    server.id,
    reference,
    server.solana_wallet,
    cfg.treasury,
    grossCents,
    feeCents,
    publisher_lamports,
    platform_lamports,
    cfg.cluster,
  );

  res.json({
    purchase_id: purchaseId,
    reference,
    recipient: server.solana_wallet,
    platform_recipient: cfg.treasury,
    publisher_amount: publisher_lamports,
    platform_amount: platform_lamports,
    publisher_lamports,
    platform_lamports,
    gross_cents: grossCents,
    fee_cents: feeCents,
    spl_token: null,
    currency: cfg.currency,
    currency_label: cfg.currency_label,
    fx_note: cfg.fx_note,
    usd_per_sol: cfg.usdPerSol,
    cluster: cfg.cluster,
    label: cfg.cluster === "mainnet-beta" ? "Live (mainnet)" : `Live (${cfg.cluster})`,
    server_slug,
    server_name: server.name,
  });
});

// POST /api/payments/solana/confirm — verify on-chain tx, unlock tool (same as Stripe)
router.post("/solana/confirm", requireAuth, async (req, res) => {
  const cfg = requireSolana(res);
  if (!cfg) return;

  const { purchase_id, signature } = req.body || {};
  if (!purchase_id || !signature) {
    return res.status(400).json({ error: "purchase_id and signature required" });
  }

  const purchase = db.prepare(
    "SELECT * FROM solana_purchases WHERE id = ? AND buyer_id = ?"
  ).get(purchase_id, req.user.id);

  if (!purchase) return res.status(404).json({ error: "Purchase not found" });

  if (purchase.status === "completed") {
    return res.json({
      status: "completed",
      purchase_id,
      signature: purchase.signature,
      duplicate: true,
    });
  }

  if (purchase.status !== "pending") {
    return res.status(400).json({ error: `Purchase is ${purchase.status}` });
  }

  // Reject reused signatures across purchases
  const sigTaken = db.prepare(
    "SELECT id FROM solana_purchases WHERE signature = ? AND id != ?"
  ).get(signature, purchase_id);
  if (sigTaken) {
    return res.status(409).json({ error: "Signature already used for another purchase" });
  }

  const verified = await verifyPurchaseTransaction({
    signature,
    reference: purchase.reference,
    recipient: purchase.recipient,
    platformRecipient: purchase.platform_recipient,
    publisherLamports: purchase.publisher_lamports,
    platformLamports: purchase.platform_lamports,
  });

  if (!verified.ok) {
    return res.status(402).json({ error: verified.error || "On-chain verification failed" });
  }

  // Grant access the same way Stripe webhook does: install + sales row
  const unlock = db.transaction(() => {
    db.prepare(
      "UPDATE solana_purchases SET status = 'completed', signature = ?, completed_at = datetime('now') WHERE id = ? AND status = 'pending'"
    ).run(signature, purchase_id);

    try {
      db.prepare("INSERT INTO installs (id, server_id, user_id) VALUES (?, ?, ?)")
        .run(uuid(), purchase.server_id, req.user.id);
    } catch {
      // Unique (server, user) — already installed is fine
    }

    db.prepare(
      "INSERT INTO sales (id, server_id, buyer_id, gross_cents, fee_cents, payment_method) VALUES (?, ?, ?, ?, ?, 'solana')"
    ).run(uuid(), purchase.server_id, req.user.id, purchase.gross_cents, purchase.fee_cents);
  });

  try {
    unlock();
  } catch (err) {
    console.error("[solana] unlock error:", err.message);
    return res.status(500).json({ error: "Failed to record purchase" });
  }

  console.log(`[solana] Purchase ${purchase_id} confirmed sig=${signature.slice(0, 16)}…`);
  res.json({ status: "completed", purchase_id, signature });
});

// GET /api/payments/solana/status/:purchase_id — poll
router.get("/solana/status/:purchase_id", requireAuth, (req, res) => {
  const purchase = db.prepare(
    "SELECT id, status, signature, cluster, created_at, completed_at, gross_cents, fee_cents FROM solana_purchases WHERE id = ? AND buyer_id = ?"
  ).get(req.params.purchase_id, req.user.id);

  if (!purchase) return res.status(404).json({ error: "Purchase not found" });
  res.json({
    purchase_id: purchase.id,
    status: purchase.status,
    signature: purchase.signature,
    cluster: purchase.cluster,
    created_at: purchase.created_at,
    completed_at: purchase.completed_at,
    gross_cents: purchase.gross_cents,
    fee_cents: purchase.fee_cents,
  });
});

export default router;

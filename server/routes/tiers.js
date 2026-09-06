import { Router } from "express";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const PRICING_TIERS = [
  {
    id: "starter",
    name: "Starter",
    price: "Free",
    price_amount: 0,
    desc: "Ship free or paid tools and get paid — no card required.",
    accent: "var(--accent-blue)",
    gradient: "var(--bg-card)",
    popular: false,
    features: [
      "Up to 5 MCP servers",
      "Computed Trust Score on every listing",
      "Stripe Connect payouts (keep 85%)",
      "One-click install for Claude / Cursor / VS Code",
      "Community support via GitHub",
    ],
  },
  {
    id: "pro",
    name: "Pro Publisher",
    price: "$29/mo",
    price_amount: 2900,
    desc: "For publishers who want priority discovery and revenue clarity.",
    accent: "var(--accent-electric)",
    gradient: "linear-gradient(135deg, rgba(77, 255, 180, 0.05), rgba(77, 159, 255, 0.05))",
    popular: true,
    features: [
      "Unlimited MCP servers",
      "Priority listing in marketplace search",
      "Revenue analytics dashboard",
      "Webhook notifications for installs & sales",
      "Everything in Starter",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$499/mo",
    price_amount: 49900,
    desc: "For teams that need contracts and a private catalog — talk to us.",
    accent: "var(--accent-purple)",
    gradient: "var(--bg-card)",
    popular: false,
    features: [
      "Custom contracts & invoicing",
      "Dedicated support channel",
      "Private catalog (on request)",
      "SSO / SAML — coming soon",
      "Team roles — coming soon",
      "Everything in Pro",
    ],
  },
];

// Honest product facts for the home Revenue section — not vanity projections.
const REVENUE_PROJECTIONS = [
  { label: "Publisher share", value: "85%", note: "Stripe Connect · live today", highlight: true },
  { label: "Platform fee", value: "15%", note: "Only on paid tool sales", highlight: false },
  { label: "Payouts", value: "Monthly", note: "1st of each month · $0 minimum", highlight: false },
  { label: "Solana Pay", value: "Soon", note: "Stubbed API · not sold as live", highlight: false },
];

const TECH_STACK = [
  { icon: "\u25B3", title: "Frontend", tech: "React + Vite", desc: "Fast SPA build, served by the Express API on Railway. One service, automatic deploys from GitHub.", cost: "$0", color: "#4DFFB4" },
  { icon: "\u25C8", title: "Database + Auth", tech: "Supabase", desc: "Postgres database with built-in auth, real-time subscriptions, and storage.", cost: "$0", color: "#4D9FFF" },
  { icon: "\u2261", title: "Payments", tech: "Stripe Connect", desc: "Split payments between marketplace and publishers. Automatic payouts.", cost: "$0*", color: "#9B6DFF" },
  { icon: "\u25A3", title: "MCP Registry", tech: "GitHub + npm", desc: "Version control and package distribution. Leverage existing infrastructure.", cost: "$0", color: "#FF6DB4" },
  { icon: "\u2315", title: "Search & Discovery", tech: "Meilisearch Cloud", desc: "Typo-tolerant, instant search across all MCP servers and documentation.", cost: "$0", color: "#FFAA4D" },
  { icon: "\u25CE", title: "Analytics", tech: "Plausible + PostHog", desc: "Privacy-first web analytics plus product analytics and feature flags.", cost: "$0", color: "#4DFFB4" },
];

// GET /api/tiers
router.get("/", (_req, res) => {
  res.json({
    tiers: PRICING_TIERS,
    revenue_projections: REVENUE_PROJECTIONS,
    tech_stack: TECH_STACK,
  });
});

// POST /api/tiers/subscribe — subscribe to a tier (auth required)
router.post("/subscribe", requireAuth, (req, res) => {
  const { tier } = req.body;

  const valid = PRICING_TIERS.find((t) => t.id === tier);
  if (!valid) {
    return res.status(400).json({ error: "Invalid tier" });
  }

  // Paid tiers must go through Stripe Checkout — redirect the client.
  if (valid.price_amount > 0) {
    return res.status(200).json({
      requires_payment: true,
      checkout_endpoint: "/api/payments/stripe/checkout",
      tier,
    });
  }

  // Cancel any existing active subscription
  db.prepare("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'").run(req.user.id);

  const id = uuid();
  // Free tier never expires — expires_at stays NULL
  const expiresAt = null;

  db.prepare(
    "INSERT INTO subscriptions (id, user_id, tier, status, expires_at) VALUES (?, ?, ?, 'active', ?)"
  ).run(id, req.user.id, tier, expiresAt);

  // Update user's tier
  db.prepare("UPDATE users SET tier = ?, updated_at = datetime('now') WHERE id = ?").run(tier, req.user.id);

  res.status(201).json({
    subscription: { id, tier, status: "active", expires_at: expiresAt },
    message: `Subscribed to ${valid.name} plan`,
  });
});

export default router;

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
    desc: "For individual developers getting started.",
    accent: "var(--accent-blue)",
    gradient: "var(--bg-card)",
    popular: false,
    features: [
      "5 MCP servers",
      "1,000 API calls/month",
      "Community support",
      "Basic analytics",
    ],
  },
  {
    id: "pro",
    name: "Pro Publisher",
    price: "$29/mo",
    price_amount: 2900,
    desc: "For serious publishers building a business.",
    accent: "var(--accent-electric)",
    gradient: "linear-gradient(135deg, rgba(77, 255, 180, 0.05), rgba(77, 159, 255, 0.05))",
    popular: true,
    features: [
      "Unlimited MCP servers",
      "Priority listing & discovery",
      "Revenue analytics dashboard",
      "Custom branding",
      "Webhook integrations",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$499/mo",
    price_amount: 49900,
    desc: "For teams and organizations at scale.",
    accent: "var(--accent-purple)",
    gradient: "var(--bg-card)",
    popular: false,
    features: [
      "Team management & roles",
      "Private marketplace",
      "SLA guarantees (99.9%)",
      "Dedicated support engineer",
      "Custom contracts & invoicing",
      "SSO & SAML integration",
    ],
  },
];

const REVENUE_PROJECTIONS = [
  { label: "Avg Price / Use", value: "$0.005", note: "Per API call metered", highlight: false },
  { label: "Active Agents", value: "500K+", note: "40% MoM growth", highlight: false },
  { label: "Platform Take", value: "15%", note: "Publishers keep 85%", highlight: false },
  { label: "Year 1 Target", value: "$1.2M", note: "Annual Recurring Revenue", highlight: true },
];

const TECH_STACK = [
  { icon: "\u25B3", title: "Frontend", tech: "Next.js + Vercel", desc: "React framework with edge deployment. Zero config, instant global CDN.", cost: "$0", color: "#4DFFB4" },
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

  // Paid tiers require Stripe payment processing — block until Stripe is wired up.
  if (valid.price_amount > 0 && !process.env.STRIPE_SECRET_KEY) {
    return res.status(402).json({
      error: "Payment required",
      message: `${valid.name} (${valid.price}) requires a payment method. Stripe integration coming soon.`,
    });
  }

  // Cancel any existing active subscription
  db.prepare("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'").run(req.user.id);

  const id = uuid();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

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

export const REVENUE_MODEL = {
  transactionFee: "15%",
  premiumListing: "$29-99/mo",
  enterprise: "$499-2,999/mo",
  projectedYear1: "$1.2M ARR",
};

export const REVENUE_PROJECTIONS = [
  { label: "Avg Price/Use", value: "$0.005", note: "micro-transactions" },
  { label: "Active Agents", value: "500K+", note: "and growing 40% MoM" },
  { label: "Platform Take", value: "15%", note: "industry standard" },
  {
    label: "Year 1 Target",
    value: "$1.2M ARR",
    note: "conservative estimate",
    highlight: true,
  },
];

export const PRICING_TIERS = [
  {
    name: "Starter",
    price: "Free",
    desc: "Perfect for hobby projects",
    features: [
      "5 MCP servers",
      "1K calls/mo free",
      "Community support",
      "Basic analytics",
    ],
    accent: "var(--accent-blue)",
    gradient:
      "linear-gradient(135deg, rgba(56,189,248,0.1), rgba(56,189,248,0.02))",
  },
  {
    name: "Pro Publisher",
    price: "$29/mo",
    desc: "For serious tool builders",
    features: [
      "Unlimited servers",
      "Priority listing",
      "Revenue analytics",
      "Custom branding",
      "Webhook integrations",
    ],
    accent: "var(--accent-electric)",
    gradient:
      "linear-gradient(135deg, rgba(34, 211, 238,0.12), rgba(56,189,248,0.05))",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$499/mo",
    desc: "For teams & organizations",
    features: [
      "Team management",
      "Private marketplace",
      "SLA guarantees",
      "Dedicated support",
      "Custom contracts",
      "SSO & SAML",
    ],
    accent: "var(--accent-purple)",
    gradient:
      "linear-gradient(135deg, rgba(20, 184, 166,0.1), rgba(236,72,153,0.05))",
  },
];

export const TECH_STACK = [
  {
    icon: "\u2B21",
    title: "Frontend",
    tech: "React + Vite",
    desc: "Fast SPA build, served by the API on Railway with automatic deploys from GitHub",
    cost: "$0",
    color: "var(--accent-electric)",
  },
  {
    icon: "\u2394",
    title: "Database + Auth",
    tech: "SQLite + JWT",
    desc: "better-sqlite3 on Railway volume; JWT auth (optional Supabase OAuth)",
    cost: "$0",
    color: "var(--accent-blue)",
  },
  {
    icon: "\u25A3",
    title: "Payments",
    tech: "Stripe Connect + Solana Pay",
    desc: "Stripe Connect fiat (85% to publishers) plus Solana Pay on Phantom (devnet).",
    cost: "$0 until revenue",
    color: "var(--accent-purple)",
  },
  {
    icon: "\u25C8",
    title: "Hosting",
    tech: "Railway",
    desc: "Single Node service for API + SPA with volume-backed SQLite.",
    cost: "$5+",
    color: "var(--accent-pink)",
  },
  {
    icon: "\u2726",
    title: "Search & Discovery",
    tech: "SQLite FTS / API filters",
    desc: "In-process marketplace search - no external search service.",
    cost: "$0",
    color: "var(--accent-orange)",
  },
  {
    icon: "\u2318",
    title: "Observability",
    tech: "Pino + Sentry (optional)",
    desc: "Structured logs via pino; optional Sentry when configured.",
    cost: "$0",
    color: "var(--accent-electric)",
  },
];

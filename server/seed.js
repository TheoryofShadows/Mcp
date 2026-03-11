import db from "./db.js";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";

if (process.env.NODE_ENV === "production") {
  throw new Error("[seed] Refusing to seed in production — this would delete all data.");
}

console.log("Seeding database...");

// ─── Clear existing data ───
db.exec(`
  DELETE FROM installs;
  DELETE FROM reviews;
  DELETE FROM subscriptions;
  DELETE FROM servers;
  DELETE FROM categories;
  DELETE FROM users;
`);

// ─── Users ───

const hashPassword = (pw) => bcrypt.hashSync(pw, 10);

const users = [
  { id: uuid(), email: "sarah@supabase.io", username: "sarahchen", display_name: "Sarah Chen", password_hash: hashPassword("password123") },
  { id: uuid(), email: "marcus@stripe.com", username: "marcuswei", display_name: "Marcus Wei", password_hash: hashPassword("password123") },
  { id: uuid(), email: "alex@figma.com", username: "alexrivera", display_name: "Alex Rivera", password_hash: hashPassword("password123") },
  { id: uuid(), email: "jordan@github.com", username: "jordanlee", display_name: "Jordan Lee", password_hash: hashPassword("password123") },
  { id: uuid(), email: "priya@huggingface.co", username: "priyapatel", display_name: "Priya Patel", password_hash: hashPassword("password123") },
  { id: uuid(), email: "kai@aws.com", username: "kainakamura", display_name: "Kai Nakamura", password_hash: hashPassword("password123") },
  { id: uuid(), email: "emma@notion.so", username: "emmadavis", display_name: "Emma Davis", password_hash: hashPassword("password123") },
  { id: uuid(), email: "leo@vercel.com", username: "leozhang", display_name: "Leo Zhang", password_hash: hashPassword("password123") },
  { id: uuid(), email: "nina@datadog.com", username: "ninakowalski", display_name: "Nina Kowalski", password_hash: hashPassword("password123") },
  { id: uuid(), email: "omar@cloudflare.com", username: "omarhassan", display_name: "Omar Hassan", password_hash: hashPassword("password123") },
  { id: uuid(), email: "zoe@openai.com", username: "zoewilliams", display_name: "Zoe Williams", password_hash: hashPassword("password123") },
  { id: uuid(), email: "dev@mcpx.dev", username: "demo", display_name: "Demo User", password_hash: hashPassword("demo1234") },
];

const insertUser = db.prepare(
  `INSERT INTO users (id, email, username, display_name, password_hash) VALUES (?, ?, ?, ?, ?)`
);

for (const u of users) {
  insertUser.run(u.id, u.email, u.username, u.display_name, u.password_hash);
}

// ─── Categories ───

const categories = [
  { id: "all", label: "All Tools", icon: "\u25CE", sort_order: 0 },
  { id: "data", label: "Data & APIs", icon: "\u2B21", sort_order: 1 },
  { id: "dev", label: "Developer", icon: "\u2318", sort_order: 2 },
  { id: "ai", label: "AI & ML", icon: "\u25C8", sort_order: 3 },
  { id: "business", label: "Business", icon: "\u25A3", sort_order: 4 },
  { id: "creative", label: "Creative", icon: "\u2726", sort_order: 5 },
  { id: "infra", label: "Infrastructure", icon: "\u2394", sort_order: 6 },
];

const insertCategory = db.prepare(
  `INSERT INTO categories (id, label, icon, sort_order) VALUES (?, ?, ?, ?)`
);

for (const c of categories) {
  insertCategory.run(c.id, c.label, c.icon, c.sort_order);
}

// ─── Servers ───

const userByName = (name) => users.find((u) => u.username === name);

const servers = [
  {
    id: uuid(), name: "Postgres MCP", slug: "postgres-mcp",
    author_id: userByName("sarahchen").id, category_id: "data",
    description: "Full PostgreSQL database access for AI agents. Query, mutate, and manage schemas with natural language.",
    long_description: "Postgres MCP provides a secure, sandboxed interface for AI agents to interact with PostgreSQL databases. Supports read/write queries, schema introspection, migrations, and real-time change streams. Built-in query validation prevents destructive operations unless explicitly allowed.",
    installs: 48200, rating: 4.9, rating_count: 342,
    price_type: "free", price_amount: 0, price_label: "free",
    verified: 1, trending: 1,
    gradient: "linear-gradient(135deg, #4DFFB4, #4D9FFF)",
    weekly_growth: "+12.3%", monthly_revenue: 0,
    repo_url: "https://github.com/sarahchen/postgres-mcp",
    tags: JSON.stringify(["postgresql", "database", "sql", "schema"]),
  },
  {
    id: uuid(), name: "Stripe Agent", slug: "stripe-agent",
    author_id: userByName("marcuswei").id, category_id: "business",
    description: "Complete Stripe payment management. Create charges, manage subscriptions, handle disputes through AI.",
    long_description: "Stripe Agent gives AI systems full access to the Stripe API through a safe, audited MCP interface. Create and manage customers, process payments, handle subscription lifecycle, generate invoices, and resolve disputes—all with built-in PCI compliance guardrails.",
    installs: 31500, rating: 4.8, rating_count: 218,
    price_type: "paid", price_amount: 1200, price_label: "$12/mo",
    verified: 1, trending: 1,
    gradient: "linear-gradient(135deg, #9B6DFF, #FF6DB4)",
    weekly_growth: "+8.7%", monthly_revenue: 1820000,
    repo_url: "https://github.com/marcuswei/stripe-agent",
    tags: JSON.stringify(["payments", "stripe", "billing", "subscriptions"]),
  },
  {
    id: uuid(), name: "Figma Bridge", slug: "figma-bridge",
    author_id: userByName("alexrivera").id, category_id: "creative",
    description: "Bridge between Figma designs and code. Extract components, styles, and assets programmatically.",
    long_description: "Figma Bridge connects your design system to your codebase through MCP. Extract component specs, design tokens, asset URLs, and layout information. Supports React, Vue, and Svelte code generation from Figma frames.",
    installs: 27800, rating: 4.7, rating_count: 156,
    price_type: "paid", price_amount: 800, price_label: "$8/mo",
    verified: 1, trending: 0,
    gradient: "linear-gradient(135deg, #FF6DB4, #FFAA4D)",
    weekly_growth: "+15.2%", monthly_revenue: 940000,
    repo_url: "https://github.com/alexrivera/figma-bridge",
    tags: JSON.stringify(["figma", "design", "ui", "components"]),
  },
  {
    id: uuid(), name: "GitHub Actions+", slug: "github-actions-plus",
    author_id: userByName("jordanlee").id, category_id: "dev",
    description: "Enhanced GitHub integration. Manage repos, trigger workflows, review PRs, and analyze code quality.",
    long_description: "GitHub Actions+ supercharges your AI agent with deep GitHub integration. Trigger and monitor workflows, create and review pull requests, manage issues and projects, analyze code quality metrics, and automate release processes—all through a single MCP server.",
    installs: 52100, rating: 4.9, rating_count: 487,
    price_type: "free", price_amount: 0, price_label: "free",
    verified: 1, trending: 1,
    gradient: "linear-gradient(135deg, #4D9FFF, #4DFFB4)",
    weekly_growth: "+22.1%", monthly_revenue: 0,
    repo_url: "https://github.com/jordanlee/github-actions-plus",
    tags: JSON.stringify(["github", "ci-cd", "automation", "devops"]),
  },
  {
    id: uuid(), name: "Hugging Face Hub", slug: "hugging-face-hub",
    author_id: userByName("priyapatel").id, category_id: "ai",
    description: "Access 200K+ ML models directly. Run inference, fine-tune, and manage model deployments from chat.",
    long_description: "Hugging Face Hub MCP connects AI agents to the world's largest ML model repository. Browse and search 200K+ models, run inference on any supported model, initiate fine-tuning jobs, manage Spaces deployments, and track experiment metrics.",
    installs: 19400, rating: 4.6, rating_count: 89,
    price_type: "paid", price_amount: 1500, price_label: "$15/mo",
    verified: 0, trending: 0,
    gradient: "linear-gradient(135deg, #FFAA4D, #FF6DB4)",
    weekly_growth: "+5.8%", monthly_revenue: 0,
    repo_url: "https://github.com/priyapatel/hugging-face-hub",
    tags: JSON.stringify(["ml", "models", "inference", "huggingface"]),
  },
  {
    id: uuid(), name: "AWS Commander", slug: "aws-commander",
    author_id: userByName("kainakamura").id, category_id: "infra",
    description: "Manage AWS infrastructure with natural language. EC2, S3, Lambda, RDS — all through conversational AI.",
    long_description: "AWS Commander provides a comprehensive MCP interface to Amazon Web Services. Manage EC2 instances, S3 buckets, Lambda functions, RDS databases, CloudFormation stacks, and 50+ other services. Built-in cost estimation and safety checks prevent accidental resource creation.",
    installs: 38900, rating: 4.8, rating_count: 265,
    price_type: "paid", price_amount: 2000, price_label: "$20/mo",
    verified: 1, trending: 1,
    gradient: "linear-gradient(135deg, #FFAA4D, #4D9FFF)",
    weekly_growth: "+18.4%", monthly_revenue: 3160000,
    repo_url: "https://github.com/kainakamura/aws-commander",
    tags: JSON.stringify(["aws", "cloud", "infrastructure", "devops"]),
  },
  {
    id: uuid(), name: "Notion Sync", slug: "notion-sync",
    author_id: userByName("emmadavis").id, category_id: "business",
    description: "Bidirectional Notion workspace integration. Read, write, and organize your knowledge base through AI.",
    long_description: "Notion Sync enables AI agents to fully interact with Notion workspaces. Read and write pages, manage databases, create and update blocks, handle file attachments, and maintain workspace structure. Supports real-time sync and conflict resolution.",
    installs: 22100, rating: 4.5, rating_count: 134,
    price_type: "paid", price_amount: 500, price_label: "$5/mo",
    verified: 1, trending: 0,
    gradient: "linear-gradient(135deg, #9B6DFF, #4D9FFF)",
    weekly_growth: "+7.2%", monthly_revenue: 0,
    repo_url: "https://github.com/emmadavis/notion-sync",
    tags: JSON.stringify(["notion", "productivity", "docs", "wiki"]),
  },
  {
    id: uuid(), name: "Vercel Deploy", slug: "vercel-deploy",
    author_id: userByName("leozhang").id, category_id: "dev",
    description: "One-command deployments via AI agents. Preview, promote, rollback, and monitor your Vercel projects.",
    long_description: "Vercel Deploy streamlines the deployment workflow for AI agents. Create preview deployments, promote to production, instant rollbacks, monitor build logs, manage environment variables, and configure domains—all through natural language commands.",
    installs: 16800, rating: 4.7, rating_count: 98,
    price_type: "free", price_amount: 0, price_label: "free",
    verified: 0, trending: 0,
    gradient: "linear-gradient(135deg, #4DFFB4, #9B6DFF)",
    weekly_growth: "+9.1%", monthly_revenue: 0,
    repo_url: "https://github.com/leozhang/vercel-deploy",
    tags: JSON.stringify(["vercel", "deploy", "hosting", "preview"]),
  },
  {
    id: uuid(), name: "DataDog Monitor", slug: "datadog-monitor",
    author_id: userByName("ninakowalski").id, category_id: "infra",
    description: "Real-time monitoring and alerting through AI. Query metrics, investigate incidents, manage dashboards.",
    long_description: "DataDog Monitor provides AI agents with full observability capabilities. Query time-series metrics, create and manage monitors, investigate incidents with log correlation, build dashboards, and configure alerting rules. Supports APM, infrastructure, and log management.",
    installs: 14200, rating: 4.6, rating_count: 76,
    price_type: "paid", price_amount: 1000, price_label: "$10/mo",
    verified: 1, trending: 0,
    gradient: "linear-gradient(135deg, #9B6DFF, #FFAA4D)",
    weekly_growth: "+6.5%", monthly_revenue: 520000,
    repo_url: "https://github.com/ninakowalski/datadog-monitor",
    tags: JSON.stringify(["monitoring", "observability", "metrics", "alerting"]),
  },
  {
    id: uuid(), name: "Cloudflare Workers", slug: "cloudflare-workers",
    author_id: userByName("omarhassan").id, category_id: "infra",
    description: "Deploy and manage edge functions globally. Create Workers, configure routes, and monitor performance.",
    long_description: "Cloudflare Workers MCP enables AI agents to deploy serverless code to Cloudflare's global edge network. Create and update Workers, configure custom domains and routes, manage KV storage, interact with D1 databases, and monitor real-time analytics.",
    installs: 11300, rating: 4.4, rating_count: 52,
    price_type: "free", price_amount: 0, price_label: "free",
    verified: 0, trending: 0,
    gradient: "linear-gradient(135deg, #FFAA4D, #4DFFB4)",
    weekly_growth: "+11.7%", monthly_revenue: 0,
    repo_url: "https://github.com/omarhassan/cloudflare-workers",
    tags: JSON.stringify(["cloudflare", "edge", "serverless", "workers"]),
  },
  {
    id: uuid(), name: "GPT Toolkit", slug: "gpt-toolkit",
    author_id: userByName("zoewilliams").id, category_id: "ai",
    description: "Orchestrate multiple LLM providers. Route queries, compare outputs, manage prompt templates and chains.",
    long_description: "GPT Toolkit is a meta-MCP server that enables AI agents to orchestrate multiple LLM providers. Route queries between OpenAI, Anthropic, Google, and open-source models. Compare outputs side-by-side, manage prompt templates with versioning, and build complex chains with conditional logic.",
    installs: 8700, rating: 4.3, rating_count: 41,
    price_type: "paid", price_amount: 2500, price_label: "$25/mo",
    verified: 0, trending: 0,
    gradient: "linear-gradient(135deg, #4D9FFF, #FF6DB4)",
    weekly_growth: "+4.2%", monthly_revenue: 0,
    repo_url: "https://github.com/zoewilliams/gpt-toolkit",
    tags: JSON.stringify(["llm", "openai", "anthropic", "prompts"]),
  },
  {
    id: uuid(), name: "Redis Cache Pro", slug: "redis-cache-pro",
    author_id: userByName("sarahchen").id, category_id: "data",
    description: "High-performance Redis operations for agents. Caching, pub/sub, streams, and data structure manipulation.",
    long_description: "Redis Cache Pro gives AI agents direct access to Redis with smart caching strategies. Supports all Redis data types, pub/sub messaging, streams for event sourcing, Lua scripting, and cluster management. Built-in TTL management and memory optimization recommendations.",
    installs: 15600, rating: 4.7, rating_count: 112,
    price_type: "paid", price_amount: 700, price_label: "$7/mo",
    verified: 1, trending: 0,
    gradient: "linear-gradient(135deg, #FF6DB4, #4DFFB4)",
    weekly_growth: "+8.9%", monthly_revenue: 380000,
    repo_url: "https://github.com/sarahchen/redis-cache-pro",
    tags: JSON.stringify(["redis", "cache", "pubsub", "streams"]),
  },
  {
    id: uuid(), name: "Playwright MCP", slug: "playwright-mcp",
    author_id: userByName("marcuswei").id, category_id: "dev",
    description: "Official Microsoft Playwright MCP. Automate browsers, scrape web pages, run E2E tests, and interact with web apps through AI agents.",
    long_description: "Playwright MCP gives AI agents full browser automation using Microsoft's Playwright library. Navigate pages, fill forms, take screenshots, generate PDFs, and handle authentication. Supports Chromium, Firefox, and WebKit.",
    installs: 67400, rating: 4.9, rating_count: 334,
    price_type: "free", price_amount: 0, price_label: "free",
    verified: 1, trending: 1,
    gradient: "linear-gradient(135deg, #2563eb, #7c3aed)",
    weekly_growth: "+29%", monthly_revenue: 0,
    repo_url: "https://github.com/microsoft/playwright-mcp",
    tags: JSON.stringify(["playwright", "browser", "automation", "testing"]),
  },
  {
    id: uuid(), name: "Puppeteer MCP", slug: "puppeteer-mcp",
    author_id: userByName("jordanlee").id, category_id: "dev",
    description: "Official MCP server for Puppeteer. Control headless Chrome, automate web tasks, take screenshots, and extract data from any website.",
    long_description: "Puppeteer MCP provides AI agents with headless Chrome control for web automation and data extraction. Perfect for scraping JavaScript-heavy sites, running UI tests, generating PDF reports, and automating repetitive browser tasks.",
    installs: 41300, rating: 4.7, rating_count: 198,
    price_type: "free", price_amount: 0, price_label: "free",
    verified: 1, trending: 1,
    gradient: "linear-gradient(135deg, #00b4d8, #0077b6)",
    weekly_growth: "+22%", monthly_revenue: 0,
    repo_url: "https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer",
    tags: JSON.stringify(["puppeteer", "browser", "chrome", "automation"]),
  },
  {
    id: uuid(), name: "PostgreSQL MCP", slug: "postgres-mcp-official",
    author_id: userByName("sarahchen").id, category_id: "data",
    description: "Official PostgreSQL MCP server. Give AI agents safe read access to your Postgres database — query tables, inspect schemas, and analyze data.",
    long_description: "Official MCP server for PostgreSQL. Provides read-only database access with schema introspection, query execution, and index analysis. Built for safe use with production databases.",
    installs: 48200, rating: 4.9, rating_count: 342,
    price_type: "free", price_amount: 0, price_label: "free",
    verified: 1, trending: 1,
    gradient: "linear-gradient(135deg, #336791, #10b981)",
    weekly_growth: "+19%", monthly_revenue: 0,
    repo_url: "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres",
    tags: JSON.stringify(["postgresql", "postgres", "database", "sql"]),
  },
  {
    id: uuid(), name: "SSH Commander", slug: "ssh-commander-mcp",
    author_id: userByName("kainakamura").id, category_id: "infra",
    description: "Execute commands on remote servers via SSH. AI agents can run shell commands, manage files, tail logs, and automate DevOps tasks.",
    long_description: "SSH Commander gives AI agents the ability to connect to remote servers and execute shell commands. Supports SSH key and password authentication, multi-server profiles, file transfers, and real-time log tailing. Use with caution.",
    installs: 22100, rating: 4.3, rating_count: 87,
    price_type: "free", price_amount: 0, price_label: "free",
    verified: 0, trending: 0,
    gradient: "linear-gradient(135deg, #1a1a2e, #16213e)",
    weekly_growth: "+8%", monthly_revenue: 0,
    repo_url: "https://github.com/ckreiling/mcp-server-docker",
    tags: JSON.stringify(["ssh", "devops", "shell", "remote"]),
  },
  {
    id: uuid(), name: "Chess Analysis MCP", slug: "chess-analysis-mcp",
    author_id: userByName("zoewilliams").id, category_id: "creative",
    description: "Analyze chess positions and get Stockfish move suggestions. Perfect for chess tools, tutors, and opening theory exploration.",
    long_description: "Chess Analysis MCP integrates the Stockfish engine into AI agents. Analyze positions by FEN, get best move suggestions at configurable depth, explore opening theory, and generate annotated PGN game files.",
    installs: 8400, rating: 4.5, rating_count: 42,
    price_type: "free", price_amount: 0, price_label: "free",
    verified: 0, trending: 0,
    gradient: "linear-gradient(135deg, #b45309, #78350f)",
    weekly_growth: "+15%", monthly_revenue: 0,
    repo_url: "https://github.com/punkpeye/mcp-chess",
    tags: JSON.stringify(["chess", "stockfish", "games", "strategy"]),
  },
  {
    id: uuid(), name: "Cal.com Scheduler MCP", slug: "cal-scheduler-mcp",
    author_id: userByName("emmadavis").id, category_id: "business",
    description: "AI-powered meeting scheduling via Cal.com. Book appointments, check availability, manage calendar events through natural language.",
    long_description: "Cal.com Scheduler MCP enables AI agents to manage calendar and scheduling workflows. Check availability, book meetings, send invites, and integrate with Google and Outlook calendars through the Cal.com API.",
    installs: 29800, rating: 4.7, rating_count: 156,
    price_type: "free", price_amount: 0, price_label: "free",
    verified: 1, trending: 1,
    gradient: "linear-gradient(135deg, #0ea5e9, #6366f1)",
    weekly_growth: "+33%", monthly_revenue: 0,
    repo_url: "https://github.com/calcom/cal.com",
    tags: JSON.stringify(["calendar", "scheduling", "meetings", "productivity"]),
  },
];

const insertServer = db.prepare(`
  INSERT INTO servers (
    id, name, slug, author_id, category_id, description, long_description,
    installs, rating, rating_count, price_type, price_amount, price_label,
    verified, trending, gradient, weekly_growth, monthly_revenue,
    repo_url, tags
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?
  )
`);

for (const s of servers) {
  insertServer.run(
    s.id, s.name, s.slug, s.author_id, s.category_id, s.description, s.long_description,
    s.installs, s.rating, s.rating_count, s.price_type, s.price_amount, s.price_label,
    s.verified, s.trending, s.gradient, s.weekly_growth, s.monthly_revenue,
    s.repo_url, s.tags
  );
}

// ─── Reviews (sample) ───

const insertReview = db.prepare(
  `INSERT INTO reviews (id, server_id, user_id, rating, comment) VALUES (?, ?, ?, ?, ?)`
);

const serverSlugs = servers.reduce((acc, s) => { acc[s.slug] = s.id; return acc; }, {});

const sampleReviews = [
  { server: "postgres-mcp", user: "marcuswei", rating: 5, comment: "Best database MCP out there. The natural language query translation is incredibly accurate." },
  { server: "postgres-mcp", user: "emmadavis", rating: 5, comment: "Saved our team hundreds of hours. Schema introspection is a game-changer." },
  { server: "postgres-mcp", user: "leozhang", rating: 4, comment: "Great tool, just wish it had better support for stored procedures." },
  { server: "stripe-agent", user: "sarahchen", rating: 5, comment: "PCI compliance guardrails give us peace of mind. Excellent work." },
  { server: "stripe-agent", user: "jordanlee", rating: 5, comment: "Handles subscription lifecycle flawlessly. Our billing automation is now 100% AI-driven." },
  { server: "github-actions-plus", user: "marcuswei", rating: 5, comment: "Transformed our CI/CD workflow. The PR review automation alone is worth it." },
  { server: "github-actions-plus", user: "ninakowalski", rating: 5, comment: "Incredibly well-built. We use it for automated release notes and changelog generation." },
  { server: "aws-commander", user: "jordanlee", rating: 5, comment: "The cost estimation feature has saved us thousands. Essential for any AWS shop." },
  { server: "aws-commander", user: "sarahchen", rating: 4, comment: "Comprehensive coverage of AWS services. Safety checks are well-designed." },
  { server: "figma-bridge", user: "emmadavis", rating: 5, comment: "Design-to-code pipeline is seamless. React component generation is spot-on." },
  { server: "figma-bridge", user: "leozhang", rating: 4, comment: "Fantastic for extracting design tokens. SVG export could be improved." },
];

for (const r of sampleReviews) {
  const userId = userByName(r.user)?.id;
  const serverId = serverSlugs[r.server];
  if (userId && serverId) {
    insertReview.run(uuid(), serverId, userId, r.rating, r.comment);
  }
}

// ─── Verify counts ───

const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
const catCount = db.prepare("SELECT COUNT(*) as c FROM categories").get().c;
const serverCount = db.prepare("SELECT COUNT(*) as c FROM servers").get().c;
const reviewCount = db.prepare("SELECT COUNT(*) as c FROM reviews").get().c;

console.log(`Seeded: ${userCount} users, ${catCount} categories, ${serverCount} servers, ${reviewCount} reviews`);
console.log("Done.");

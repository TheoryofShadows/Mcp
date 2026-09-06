import db from "./db.js";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";

// Guard against destroying real data. An *empty* database is always safe to
// seed — the DELETEs below are no-ops — which is how first-boot auto-seeding
// works in production (see server/index.js). A *populated* production database
// means someone ran this manually; refuse, because the DELETEs would wipe it.
if (process.env.NODE_ENV === "production") {
  const existing = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (existing > 0) {
    throw new Error(
      "[seed] Refusing to seed: production database already contains data. " +
      "Seeding is destructive and only runs automatically on an empty database."
    );
  }
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

// ─── Users (publishers) ───
// A mix of recognizable org publishers (verified) and individual community
// builders. Passwords are demo-only.

const hashPassword = (pw) => bcrypt.hashSync(pw, 10);

const users = [
  // Org / official publishers
  { username: "anthropic",   display_name: "Anthropic",        email: "mcp@anthropic.com" },
  { username: "modelcontextprotocol", display_name: "MCP Reference", email: "team@modelcontextprotocol.io" },
  { username: "microsoft",   display_name: "Microsoft",        email: "oss@microsoft.com" },
  { username: "github",      display_name: "GitHub",           email: "mcp@github.com" },
  { username: "cloudflare",  display_name: "Cloudflare",       email: "mcp@cloudflare.com" },
  { username: "sentry",      display_name: "Sentry",           email: "mcp@sentry.io" },
  { username: "notion",      display_name: "Notion",           email: "mcp@makenotion.com" },
  { username: "stripe",      display_name: "Stripe",           email: "mcp@stripe.com" },
  { username: "supabase",    display_name: "Supabase",         email: "mcp@supabase.io" },
  { username: "redis",       display_name: "Redis",            email: "mcp@redis.io" },
  { username: "mongodb",     display_name: "MongoDB",          email: "mcp@mongodb.com" },
  { username: "firecrawl",   display_name: "Firecrawl",        email: "mcp@firecrawl.dev" },
  { username: "exalabs",     display_name: "Exa Labs",         email: "mcp@exa.ai" },
  { username: "upstash",     display_name: "Upstash",          email: "mcp@upstash.com" },
  { username: "figma",       display_name: "Figma",            email: "mcp@figma.com" },
  { username: "elevenlabs",  display_name: "ElevenLabs",       email: "mcp@elevenlabs.io" },
  { username: "awslabs",     display_name: "AWS Labs",         email: "mcp@aws.com" },
  { username: "grafana",     display_name: "Grafana Labs",     email: "mcp@grafana.com" },
  { username: "qdrant",      display_name: "Qdrant",           email: "mcp@qdrant.tech" },
  { username: "tavily",      display_name: "Tavily",           email: "mcp@tavily.com" },
  // Community builders
  { username: "ahujasid",    display_name: "Siddharth Ahuja",  email: "sid@example.com" },
  { username: "glips",       display_name: "Graham Lipsman",   email: "graham@example.com" },
  { username: "sooperset",   display_name: "Soomin Kim",       email: "soomin@example.com" },
  { username: "flux159",     display_name: "Vivek Reddy",      email: "vivek@example.com" },
  { username: "punkpeye",    display_name: "Frank Fiegel",     email: "frank@example.com" },
  { username: "ckreiling",   display_name: "Cole Kreiling",    email: "cole@example.com" },
  { username: "demo",        display_name: "Demo User",        email: "dev@mcpx.dev",  password: "demo1234" },
];

const insertUser = db.prepare(
  `INSERT INTO users (id, email, username, display_name, password_hash) VALUES (?, ?, ?, ?, ?)`
);

for (const u of users) {
  u.id = uuid();
  insertUser.run(u.id, u.email, u.username, u.display_name, hashPassword(u.password || "password123"));
}

const userByName = (name) => users.find((u) => u.username === name);

// ─── Categories ───

const categories = [
  { id: "all", label: "All Tools", icon: "◎", sort_order: 0 },
  { id: "data", label: "Data & APIs", icon: "⬡", sort_order: 1 },
  { id: "dev", label: "Developer", icon: "⌘", sort_order: 2 },
  { id: "ai", label: "AI & ML", icon: "◈", sort_order: 3 },
  { id: "business", label: "Business", icon: "▣", sort_order: 4 },
  { id: "creative", label: "Creative", icon: "✦", sort_order: 5 },
  { id: "infra", label: "Infrastructure", icon: "⎔", sort_order: 6 },
];

const insertCategory = db.prepare(
  `INSERT INTO categories (id, label, icon, sort_order) VALUES (?, ?, ?, ?)`
);
for (const c of categories) insertCategory.run(c.id, c.label, c.icon, c.sort_order);

// ─── Servers — a real-world MCP catalog ───
// Fields: name, slug, author, category, description, long_description,
// installs, rating, rating_count, price_type, price_amount(¢), verified,
// trending, weekly_growth, repo_url, tags[], license. Gradient is assigned
// from a palette below.

const S = (o) => o; // identity helper for readability
const servers = [
  // ── Developer ──────────────────────────────────────────────────────────────
  S({ name: "GitHub MCP Server", slug: "github-mcp-server", author: "github", category: "dev",
    description: "Official GitHub MCP. Manage repos, issues, pull requests, and Actions — let your agent ship code.",
    long_description: "GitHub's official MCP server gives agents first-class access to repositories: read and write files, open and review pull requests, manage issues and projects, search code, and trigger and inspect GitHub Actions workflows. Scoped to your token's permissions.",
    installs: 142000, rating: 4.9, rating_count: 980, price_type: "free", verified: 1, trending: 1,
    weekly_growth: "+24%", repo_url: "https://github.com/github/github-mcp-server", license: "MIT",
    install_command: "npx -y @modelcontextprotocol/server-github",
    tags: ["github", "git", "ci-cd", "devops", "code"] }),
  S({ name: "Filesystem MCP", slug: "filesystem-mcp", author: "modelcontextprotocol", category: "dev",
    description: "Reference server for secure local file access. Read, write, search, and edit files within allowed directories.",
    long_description: "The official filesystem reference server lets agents read, write, move, and search files inside explicitly allowed directories. Sandboxed to a configured root so it can't wander your disk.",
    installs: 98000, rating: 4.8, rating_count: 610, price_type: "free", verified: 1, trending: 1,
    weekly_growth: "+17%", repo_url: "https://github.com/modelcontextprotocol/servers", license: "MIT",
    install_command: "npx -y @modelcontextprotocol/server-filesystem /path/to/allow",
    tags: ["filesystem", "files", "reference", "local"] }),
  S({ name: "Playwright MCP", slug: "playwright-mcp", author: "microsoft", category: "dev",
    description: "Official Microsoft Playwright MCP. Drive real browsers — navigate, fill forms, screenshot, and run E2E flows.",
    long_description: "Playwright MCP gives agents full browser automation via Microsoft's Playwright. Navigate pages, click and type, capture screenshots and PDFs, and handle auth across Chromium, Firefox, and WebKit using accessibility-tree snapshots.",
    installs: 89000, rating: 4.9, rating_count: 540, price_type: "free", verified: 1, trending: 1,
    weekly_growth: "+29%", repo_url: "https://github.com/microsoft/playwright-mcp", license: "Apache-2.0",
    install_command: "npx -y @playwright/mcp",
    tags: ["playwright", "browser", "automation", "testing"] }),
  S({ name: "Context7", slug: "context7", author: "upstash", category: "dev",
    description: "Up-to-date, version-specific docs and code examples for any library, injected straight into your prompt.",
    long_description: "Context7 pulls current documentation and real code snippets for the exact library version you're using and feeds them to the model — killing hallucinated, outdated APIs. Hugely popular with Cursor and Claude users.",
    installs: 76000, rating: 4.8, rating_count: 430, price_type: "free", verified: 1, trending: 1,
    weekly_growth: "+41%", repo_url: "https://github.com/upstash/context7", license: "MIT",
    install_command: "npx -y @upstash/context7-mcp",
    tags: ["docs", "context", "libraries", "reference"] }),
  S({ name: "Git MCP", slug: "git-mcp", author: "modelcontextprotocol", category: "dev",
    description: "Reference server for local Git. Read history, diffs, branches, and commits — let agents reason about your repo.",
    long_description: "The official Git reference server exposes local repository operations: status, diffs, logs, branch and commit inspection, blame, and staged changes — so an agent can understand and narrate your codebase.",
    installs: 54000, rating: 4.7, rating_count: 290, price_type: "free", verified: 1, trending: 0,
    weekly_growth: "+12%", repo_url: "https://github.com/modelcontextprotocol/servers", license: "MIT",
    install_command: "npx -y @modelcontextprotocol/server-git",
    tags: ["git", "version-control", "reference", "code"] }),
  S({ name: "Puppeteer MCP", slug: "puppeteer-mcp", author: "ckreiling", category: "dev",
    description: "Headless Chrome control for scraping and automation. Screenshot, extract, and automate JS-heavy sites.",
    long_description: "Puppeteer MCP drives headless Chrome for web automation and data extraction — ideal for scraping dynamic sites, generating PDFs, and automating repetitive browser tasks.",
    installs: 41000, rating: 4.6, rating_count: 210, price_type: "free", verified: 0, trending: 0,
    weekly_growth: "+9%", repo_url: "https://github.com/modelcontextprotocol/servers", license: "MIT",
    install_command: "npx -y @modelcontextprotocol/server-puppeteer",
    tags: ["puppeteer", "browser", "chrome", "scraping"] }),
  S({ name: "Docker MCP", slug: "docker-mcp", author: "ckreiling", category: "dev",
    description: "Manage Docker from chat. Run containers, inspect logs, build images, and compose stacks with natural language.",
    long_description: "Docker MCP lets agents manage containers and images: run and stop containers, stream logs, build from Dockerfiles, and bring up docker-compose stacks. Handy for local dev and CI.",
    installs: 33000, rating: 4.5, rating_count: 140, price_type: "free", verified: 0, trending: 0,
    weekly_growth: "+14%", repo_url: "https://github.com/ckreiling/mcp-server-docker", license: "MIT",
    tags: ["docker", "containers", "devops", "shell"] }),

  // ── AI & ML ──────────────────────────────────────────────────────────────
  S({ name: "Sequential Thinking", slug: "sequential-thinking", author: "modelcontextprotocol", category: "ai",
    description: "Structured step-by-step reasoning for harder problems. Plan, branch, revise, and converge on an answer.",
    long_description: "The Sequential Thinking reference server gives models a scratchpad for explicit multi-step reasoning — breaking problems into steps, revising earlier thoughts, and exploring branches before committing to a solution.",
    installs: 61000, rating: 4.7, rating_count: 320, price_type: "free", verified: 1, trending: 1,
    weekly_growth: "+20%", repo_url: "https://github.com/modelcontextprotocol/servers", license: "MIT",
    install_command: "npx -y @modelcontextprotocol/server-sequential-thinking",
    tags: ["reasoning", "planning", "reference", "thinking"] }),
  S({ name: "Memory MCP", slug: "memory-mcp", author: "modelcontextprotocol", category: "ai",
    description: "Persistent knowledge-graph memory. Let your agent remember entities, relations, and facts across sessions.",
    long_description: "The Memory reference server stores a knowledge graph of entities and relations the agent can read and update — giving long-running assistants durable memory of people, projects, and preferences.",
    installs: 66000, rating: 4.7, rating_count: 350, price_type: "free", verified: 1, trending: 1,
    weekly_growth: "+22%", repo_url: "https://github.com/modelcontextprotocol/servers", license: "MIT",
    install_command: "npx -y @modelcontextprotocol/server-memory",
    tags: ["memory", "knowledge-graph", "reference", "context"] }),
  S({ name: "Hugging Face MCP", slug: "hugging-face-mcp", author: "exalabs", category: "ai",
    description: "Browse and run 500K+ models, datasets, and Spaces from the Hub. Inference and search from your agent.",
    long_description: "Connects agents to the Hugging Face Hub: search models and datasets, run inference endpoints, and query Spaces — the largest open ML ecosystem, available to your assistant.",
    installs: 24000, rating: 4.5, rating_count: 120, price_type: "free", verified: 0, trending: 0,
    weekly_growth: "+8%", repo_url: "https://github.com/huggingface/hf-mcp-server", license: "Apache-2.0",
    tags: ["ml", "models", "inference", "huggingface"] }),

  // ── Data & APIs ──────────────────────────────────────────────────────────
  S({ name: "PostgreSQL MCP", slug: "postgres-mcp", author: "modelcontextprotocol", category: "data",
    description: "Reference Postgres server. Safe read access — query tables, inspect schemas, and analyze data.",
    long_description: "The official PostgreSQL reference server provides read-only database access with schema introspection and query execution — built for safe use against real databases.",
    installs: 84000, rating: 4.9, rating_count: 470, price_type: "free", verified: 1, trending: 1,
    weekly_growth: "+19%", repo_url: "https://github.com/modelcontextprotocol/servers", license: "MIT",
    install_command: "npx -y @modelcontextprotocol/server-postgres postgresql://user:pass@localhost/db",
    tags: ["postgresql", "postgres", "database", "sql"] }),
  S({ name: "Supabase MCP", slug: "supabase-mcp", author: "supabase", category: "data",
    description: "Manage your Supabase project. Run SQL, manage tables and migrations, branches, and edge functions.",
    long_description: "The official Supabase MCP lets agents query and manage a Supabase project: execute SQL, design tables, run migrations, manage database branches, and deploy edge functions — your Postgres backend, agent-ready.",
    installs: 47000, rating: 4.8, rating_count: 260, price_type: "free", verified: 1, trending: 1,
    weekly_growth: "+33%", repo_url: "https://github.com/supabase-community/supabase-mcp", license: "Apache-2.0",
    install_command: "npx -y @supabase/mcp-server-supabase",
    tags: ["supabase", "postgres", "database", "backend"] }),
  S({ name: "Fetch MCP", slug: "fetch-mcp", author: "modelcontextprotocol", category: "data",
    description: "Fetch any URL and convert it to clean markdown for the model. The simplest way to give agents the web.",
    long_description: "The Fetch reference server retrieves web pages and converts HTML to clean, readable markdown the model can actually use — with content chunking for large pages.",
    installs: 71000, rating: 4.7, rating_count: 360, price_type: "free", verified: 1, trending: 1,
    weekly_growth: "+18%", repo_url: "https://github.com/modelcontextprotocol/servers", license: "MIT",
    install_command: "npx -y @modelcontextprotocol/server-fetch",
    tags: ["fetch", "web", "markdown", "reference"] }),
  S({ name: "Firecrawl MCP", slug: "firecrawl-mcp", author: "firecrawl", category: "data",
    description: "Scrape, crawl, and search the web into clean markdown at scale. Handles JS, pagination, and anti-bot.",
    long_description: "Firecrawl MCP turns whole websites into LLM-ready markdown — crawl entire domains, scrape single pages, run structured extraction, and search — handling JavaScript rendering and rate limits for you.",
    installs: 58000, rating: 4.8, rating_count: 300, price_type: "paid", price_amount: 1600, verified: 1, trending: 1,
    weekly_growth: "+37%", repo_url: "https://github.com/mendableai/firecrawl-mcp-server", license: "MIT",
    install_command: "npx -y firecrawl-mcp",
    tags: ["scraping", "crawl", "web", "markdown"] }),
  S({ name: "Exa Search MCP", slug: "exa-search-mcp", author: "exalabs", category: "data",
    description: "Neural web search built for AI. Semantic search, direct answers, and full-content retrieval.",
    long_description: "Exa MCP gives agents a search engine designed for LLMs: embeddings-based semantic search, direct answers with citations, and full-page content retrieval — far cleaner than scraping a SERP.",
    installs: 35000, rating: 4.7, rating_count: 180, price_type: "paid", price_amount: 1000, verified: 1, trending: 1,
    weekly_growth: "+26%", repo_url: "https://github.com/exa-labs/exa-mcp-server", license: "MIT",
    tags: ["search", "web", "neural", "research"] }),
  S({ name: "Tavily MCP", slug: "tavily-mcp", author: "tavily", category: "data",
    description: "Search and extract for agents. Real-time web results optimized for RAG and research workflows.",
    long_description: "Tavily MCP provides agent-tuned web search and content extraction with relevance scoring and source control — purpose-built for retrieval-augmented generation.",
    installs: 27000, rating: 4.6, rating_count: 140, price_type: "paid", price_amount: 900, verified: 1, trending: 0,
    weekly_growth: "+15%", repo_url: "https://github.com/tavily-ai/tavily-mcp", license: "MIT",
    tags: ["search", "rag", "research", "web"] }),
  S({ name: "Redis MCP", slug: "redis-mcp", author: "redis", category: "data",
    description: "Official Redis server. Work with strings, hashes, streams, pub/sub, and vector search from your agent.",
    long_description: "The official Redis MCP lets agents read and write all Redis data types, use pub/sub and streams, and run vector similarity search — fast caching and real-time data for AI apps.",
    installs: 29000, rating: 4.6, rating_count: 130, price_type: "free", verified: 1, trending: 0,
    weekly_growth: "+11%", repo_url: "https://github.com/redis/mcp-redis", license: "MIT",
    tags: ["redis", "cache", "pubsub", "vector"] }),
  S({ name: "MongoDB MCP", slug: "mongodb-mcp", author: "mongodb", category: "data",
    description: "Official MongoDB server. Query collections, run aggregations, and manage Atlas clusters with natural language.",
    long_description: "The official MongoDB MCP connects agents to MongoDB and Atlas: find and aggregate documents, inspect schemas and indexes, and manage clusters — with read-only mode for safety.",
    installs: 31000, rating: 4.6, rating_count: 150, price_type: "free", verified: 1, trending: 0,
    weekly_growth: "+13%", repo_url: "https://github.com/mongodb-js/mongodb-mcp-server", license: "Apache-2.0",
    tags: ["mongodb", "database", "nosql", "atlas"] }),
  S({ name: "Qdrant MCP", slug: "qdrant-mcp", author: "qdrant", category: "data",
    description: "Official vector database server. Store and semantically search embeddings — give your agent long-term recall.",
    long_description: "Qdrant MCP turns a Qdrant vector database into a memory and retrieval layer: store embeddings with payloads and run semantic similarity search for RAG and agent memory.",
    installs: 16000, rating: 4.5, rating_count: 70, price_type: "free", verified: 1, trending: 0,
    weekly_growth: "+10%", repo_url: "https://github.com/qdrant/mcp-server-qdrant", license: "Apache-2.0",
    tags: ["vector", "embeddings", "search", "rag"] }),

  // ── Business ───────────────────────────────────────────────────────────────
  S({ name: "Notion MCP", slug: "notion-mcp", author: "notion", category: "business",
    description: "Official Notion server. Read and write pages, query databases, and keep your workspace in sync with AI.",
    long_description: "Notion's official MCP lets agents fully work your workspace: create and edit pages and blocks, query and update databases, and search — turning Notion into an agent-writable knowledge base.",
    installs: 52000, rating: 4.7, rating_count: 280, price_type: "free", verified: 1, trending: 1,
    weekly_growth: "+28%", repo_url: "https://github.com/makenotion/notion-mcp-server", license: "MIT",
    install_command: "npx -y @notionhq/notion-mcp-server",
    tags: ["notion", "docs", "productivity", "wiki"] }),
  S({ name: "Stripe MCP", slug: "stripe-mcp", author: "stripe", category: "business",
    description: "Official Stripe Agent Toolkit. Create customers, payments, invoices, and subscriptions through your agent.",
    long_description: "Stripe's official agent toolkit exposes the Stripe API over MCP: manage customers, create payment links and invoices, handle subscriptions, and query balances — with test-mode support for safe development.",
    installs: 41000, rating: 4.8, rating_count: 230, price_type: "free", verified: 1, trending: 1,
    weekly_growth: "+21%", repo_url: "https://github.com/stripe/agent-toolkit", license: "MIT",
    install_command: "npx -y @stripe/mcp",
    tags: ["payments", "stripe", "billing", "subscriptions"] }),
  S({ name: "Slack MCP", slug: "slack-mcp", author: "modelcontextprotocol", category: "business",
    description: "Send and read Slack messages, manage channels, and summarize threads — your agent in the team chat.",
    long_description: "Slack MCP lets agents post and read messages, list and manage channels, react, and summarize conversations — automating standups, alerts, and team updates.",
    installs: 44000, rating: 4.6, rating_count: 240, price_type: "free", verified: 1, trending: 0,
    weekly_growth: "+12%", repo_url: "https://github.com/modelcontextprotocol/servers", license: "MIT",
    install_command: "npx -y @modelcontextprotocol/server-slack",
    tags: ["slack", "chat", "messaging", "team"] }),
  S({ name: "Linear MCP", slug: "linear-mcp", author: "sooperset", category: "business",
    description: "Manage Linear issues, projects, and cycles. Create tickets, triage, and report from natural language.",
    long_description: "Linear MCP connects agents to your Linear workspace: create and update issues, manage projects and cycles, assign and label, and generate status reports — engineering project management, automated.",
    installs: 36000, rating: 4.7, rating_count: 170, price_type: "free", verified: 1, trending: 1,
    weekly_growth: "+24%", repo_url: "https://github.com/jerhadf/linear-mcp-server", license: "MIT",
    install_command: "npx -y @linear/mcp-server",
    tags: ["linear", "issues", "project-management", "tickets"] }),
  S({ name: "Atlassian MCP", slug: "atlassian-mcp", author: "sooperset", category: "business",
    description: "Jira + Confluence for agents. Create and search issues, update tickets, and read/write Confluence pages.",
    long_description: "A popular community MCP for Atlassian: search and manage Jira issues, transition tickets, and read and write Confluence pages — works with both Cloud and Server/Data Center.",
    installs: 28000, rating: 4.5, rating_count: 130, price_type: "free", verified: 0, trending: 0,
    weekly_growth: "+9%", repo_url: "https://github.com/sooperset/mcp-atlassian", license: "MIT",
    tags: ["jira", "confluence", "atlassian", "tickets"] }),

  // ── Creative ───────────────────────────────────────────────────────────────
  S({ name: "Blender MCP", slug: "blender-mcp", author: "ahujasid", category: "creative",
    description: "Control Blender with natural language. Model, texture, and compose 3D scenes through your agent — viral hit.",
    long_description: "Blender MCP connects Claude to Blender so you can create and modify 3D scenes conversationally: add and transform objects, apply materials, import assets, and render — the project that put MCP on the map for 3D artists.",
    installs: 49000, rating: 4.8, rating_count: 260, price_type: "free", verified: 1, trending: 1,
    weekly_growth: "+35%", repo_url: "https://github.com/ahujasid/blender-mcp", license: "MIT",
    tags: ["blender", "3d", "modeling", "creative"] }),
  S({ name: "Figma Context MCP", slug: "figma-context-mcp", author: "glips", category: "creative",
    description: "Give your coding agent Figma context. Pull frames, layout, and design tokens to generate accurate UI code.",
    long_description: "Framelink's Figma MCP feeds design data — layout, styles, components, and tokens — straight into coding agents like Cursor, so generated UI actually matches the design instead of guessing.",
    installs: 44000, rating: 4.7, rating_count: 220, price_type: "free", verified: 1, trending: 1,
    weekly_growth: "+31%", repo_url: "https://github.com/GLips/Figma-Context-MCP", license: "MIT",
    tags: ["figma", "design", "ui", "frontend"] }),
  S({ name: "ElevenLabs MCP", slug: "elevenlabs-mcp", author: "elevenlabs", category: "creative",
    description: "Official ElevenLabs server. Generate speech, clone voices, and transcribe audio from your agent.",
    long_description: "The official ElevenLabs MCP gives agents text-to-speech with lifelike voices, voice cloning and design, sound effects, and speech-to-text — full audio generation in your workflow.",
    installs: 22000, rating: 4.6, rating_count: 110, price_type: "paid", price_amount: 1100, verified: 1, trending: 0,
    weekly_growth: "+17%", repo_url: "https://github.com/elevenlabs/elevenlabs-mcp", license: "MIT",
    tags: ["audio", "tts", "voice", "speech"] }),

  // ── Infrastructure ─────────────────────────────────────────────────────────
  S({ name: "Cloudflare MCP", slug: "cloudflare-mcp", author: "cloudflare", category: "infra",
    description: "Official Cloudflare servers. Manage Workers, KV, D1, R2, and read analytics across your account.",
    long_description: "Cloudflare's official MCP suite lets agents build and operate on the edge: deploy and configure Workers, query D1 databases, manage KV and R2 storage, and pull observability data.",
    installs: 45000, rating: 4.7, rating_count: 240, price_type: "free", verified: 1, trending: 1,
    weekly_growth: "+23%", repo_url: "https://github.com/cloudflare/mcp-server-cloudflare", license: "Apache-2.0",
    tags: ["cloudflare", "edge", "serverless", "workers"] }),
  S({ name: "AWS MCP", slug: "aws-mcp", author: "awslabs", category: "infra",
    description: "Official AWS Labs MCP servers. Query docs, manage resources, estimate costs, and reason about your cloud.",
    long_description: "AWS Labs' MCP collection brings AWS to agents: authoritative documentation lookup, CDK and Terraform helpers, cost analysis, and service operations across a growing list of AWS products.",
    installs: 38000, rating: 4.6, rating_count: 200, price_type: "free", verified: 1, trending: 1,
    weekly_growth: "+20%", repo_url: "https://github.com/awslabs/mcp", license: "Apache-2.0",
    tags: ["aws", "cloud", "infrastructure", "devops"] }),
  S({ name: "Sentry MCP", slug: "sentry-mcp", author: "sentry", category: "infra",
    description: "Official Sentry server. Pull issues and stack traces, triage errors, and get AI root-cause suggestions.",
    long_description: "Sentry's official MCP surfaces production errors to your agent: fetch issues and events, read stack traces and breadcrumbs, and use Seer for AI-assisted root-cause analysis — debug straight from chat.",
    installs: 38000, rating: 4.7, rating_count: 190, price_type: "free", verified: 1, trending: 0,
    weekly_growth: "+16%", repo_url: "https://github.com/getsentry/sentry-mcp", license: "MIT",
    tags: ["sentry", "errors", "monitoring", "observability"] }),
  S({ name: "Grafana MCP", slug: "grafana-mcp", author: "grafana", category: "infra",
    description: "Official Grafana server. Query dashboards, Prometheus/Loki data, and incidents from your agent.",
    long_description: "Grafana's official MCP lets agents search dashboards, run Prometheus and Loki queries, inspect alerts, and work with incidents and on-call — observability you can converse with.",
    installs: 21000, rating: 4.5, rating_count: 90, price_type: "free", verified: 1, trending: 0,
    weekly_growth: "+12%", repo_url: "https://github.com/grafana/mcp-grafana", license: "Apache-2.0",
    tags: ["grafana", "metrics", "observability", "monitoring"] }),
  S({ name: "Kubernetes MCP", slug: "kubernetes-mcp", author: "flux159", category: "infra",
    description: "Operate Kubernetes from chat. Inspect pods, apply manifests, scale deployments, and read logs safely.",
    long_description: "A widely used community Kubernetes MCP: list and describe resources, apply and diff manifests, scale and roll out deployments, exec and tail logs — kubectl power with a conversational interface.",
    installs: 26000, rating: 4.5, rating_count: 120, price_type: "free", verified: 0, trending: 0,
    weekly_growth: "+14%", repo_url: "https://github.com/Flux159/mcp-server-kubernetes", license: "MIT",
    tags: ["kubernetes", "k8s", "devops", "infrastructure"] }),
  S({ name: "Time MCP", slug: "time-mcp", author: "modelcontextprotocol", category: "infra",
    description: "Reference time and timezone server. Current time, conversions, and scheduling math for agents.",
    long_description: "The Time reference server gives agents reliable time handling: current time in any IANA timezone, conversions between zones, and date math — small but essential for scheduling and reminders.",
    installs: 30000, rating: 4.6, rating_count: 140, price_type: "free", verified: 1, trending: 0,
    weekly_growth: "+8%", repo_url: "https://github.com/modelcontextprotocol/servers", license: "MIT",
    tags: ["time", "timezone", "scheduling", "reference"] }),
  S({ name: "Chess Analysis MCP", slug: "chess-analysis-mcp", author: "punkpeye", category: "creative",
    description: "Analyze positions with Stockfish. Best moves, evaluations, and opening theory for chess tools and tutors.",
    long_description: "Chess Analysis MCP integrates the Stockfish engine: analyze positions by FEN, get best moves at configurable depth, evaluate lines, and generate annotated PGN — great for tutors and analysis apps.",
    installs: 8400, rating: 4.4, rating_count: 42, price_type: "free", verified: 0, trending: 0,
    weekly_growth: "+15%", repo_url: "https://github.com/punkpeye/mcp-chess", license: "MIT",
    tags: ["chess", "stockfish", "games", "strategy"] }),
];

// ─── Insert servers ───

const GRADIENTS = [
  "linear-gradient(135deg, #4DFFB4, #4D9FFF)",
  "linear-gradient(135deg, #9B6DFF, #FF6DB4)",
  "linear-gradient(135deg, #FF6DB4, #FFAA4D)",
  "linear-gradient(135deg, #4D9FFF, #4DFFB4)",
  "linear-gradient(135deg, #FFAA4D, #4D9FFF)",
  "linear-gradient(135deg, #2563eb, #7c3aed)",
  "linear-gradient(135deg, #00b4d8, #0077b6)",
  "linear-gradient(135deg, #f59e0b, #ef4444)",
  "linear-gradient(135deg, #10b981, #3b82f6)",
];

const insertServer = db.prepare(`
  INSERT INTO servers (
    id, name, slug, author_id, category_id, description, long_description,
    installs, rating, rating_count, price_type, price_amount, price_label,
    verified, trending, gradient, weekly_growth, monthly_revenue,
    repo_url, tags, license, install_command, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const slugToId = {};
for (const [i, s] of servers.entries()) {
  const id = uuid();
  slugToId[s.slug] = id;
  const priceAmount = s.price_type === "paid" ? (s.price_amount || 900) : 0;
  const priceLabel = s.price_type === "paid" ? `$${(priceAmount / 100).toFixed(0)}/mo` : "free";
  // Derive a believable age from adoption so the Trust Score's maturity factor
  // has real signal. Paid, verified tools accrue a little demo revenue.
  const ageDays = Math.min(900, Math.round((s.installs || 0) / 90) + 25);
  const createdAt = new Date(Date.now() - ageDays * 86400_000).toISOString().replace("T", " ").slice(0, 19);
  const monthlyRevenue = s.price_type === "paid" ? Math.round((s.installs || 0) * 0.04) * priceAmount : 0;
  const author = userByName(s.author);

  insertServer.run(
    id, s.name, s.slug, author.id, s.category, s.description, s.long_description,
    s.installs, s.rating, s.rating_count, s.price_type, priceAmount, priceLabel,
    s.verified ? 1 : 0, s.trending ? 1 : 0, GRADIENTS[i % GRADIENTS.length], s.weekly_growth, monthlyRevenue,
    s.repo_url, JSON.stringify(s.tags), s.license || null, s.install_command || null, createdAt
  );
}

// ─── Reviews (sample) ───

const insertReview = db.prepare(
  `INSERT INTO reviews (id, server_id, user_id, rating, comment) VALUES (?, ?, ?, ?, ?)`
);

const sampleReviews = [
  { server: "github-mcp-server", user: "microsoft", rating: 5, comment: "Indispensable. Our agents open and review PRs end to end now." },
  { server: "github-mcp-server", user: "supabase", rating: 5, comment: "The Actions integration is fantastic for release automation." },
  { server: "playwright-mcp", user: "github", rating: 5, comment: "Accessibility-tree snapshots make automation way more reliable than pixel matching." },
  { server: "context7", user: "notion", rating: 5, comment: "Stopped the model hallucinating outdated APIs overnight. Essential." },
  { server: "blender-mcp", user: "figma", rating: 5, comment: "Genuinely magical — describing a scene and watching it build is wild." },
  { server: "firecrawl-mcp", user: "exalabs", rating: 5, comment: "Best web-to-markdown pipeline. Handles the messy JS sites cleanly." },
  { server: "supabase-mcp", user: "redis", rating: 5, comment: "Migrations and branches from chat. Our backend work got noticeably faster." },
  { server: "notion-mcp", user: "stripe", rating: 4, comment: "Great for keeping docs in sync. Database writes are solid." },
  { server: "memory-mcp", user: "anthropic", rating: 5, comment: "Durable memory across sessions changes what assistants can do." },
  { server: "cloudflare-mcp", user: "awslabs", rating: 4, comment: "Deploying Workers conversationally is slick. D1 support is handy." },
  { server: "stripe-mcp", user: "notion", rating: 5, comment: "Test-mode support made wiring up billing painless." },
];

for (const r of sampleReviews) {
  const userId = userByName(r.user)?.id;
  const serverId = slugToId[r.server];
  if (userId && serverId) insertReview.run(uuid(), serverId, userId, r.rating, r.comment);
}

// ─── Verify counts ───

const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
const catCount = db.prepare("SELECT COUNT(*) as c FROM categories").get().c;
const serverCount = db.prepare("SELECT COUNT(*) as c FROM servers").get().c;
const reviewCount = db.prepare("SELECT COUNT(*) as c FROM reviews").get().c;

console.log(`Seeded: ${userCount} users, ${catCount} categories, ${serverCount} servers, ${reviewCount} reviews`);
console.log("Done.");

// ─── Seed Categories ──────────────────────────────────────────────────────────
export const SEED_CATEGORIES = [
  { id: "all",      label: "All Tools",      icon: "◎", description: "Browse all MCP tools" },
  { id: "dev",      label: "Developer",      icon: "⌘", description: "Code, CI/CD, and developer tools" },
  { id: "data",     label: "Data & APIs",    icon: "⬡", description: "Databases, APIs, and data pipelines" },
  { id: "ai",       label: "AI & ML",        icon: "◈", description: "Machine learning and AI integrations" },
  { id: "business", label: "Business",       icon: "▣", description: "Payments, CRM, and productivity" },
  { id: "creative", label: "Creative",       icon: "✦", description: "Design, media, and content tools" },
  { id: "infra",    label: "Infrastructure", icon: "⌤", description: "Cloud, DevOps, and infrastructure" },
];

// ─── 12 Real MCP Tools ───────────────────────────────────────────────────────
export const SEED_TOOLS = [
  {
    id: "1",
    slug: "github-mcp",
    name: "GitHub MCP",
    author_name: "modelcontextprotocol",
    category_id: "dev",
    description:
      "Official GitHub MCP server. AI agents can manage repos, PRs, issues, branches, and GitHub Actions workflows directly from Claude.",
    readme: `# GitHub MCP Server

Official MCP server for GitHub, built by the Model Context Protocol team.

## Features

- **Repository management** – Create, fork, clone, list repos
- **Pull requests** – Open, review, merge, and comment on PRs
- **Issues** – Create, update, label, and close issues
- **GitHub Actions** – Trigger workflows, view run logs
- **Code search** – Full-text search across public and private repos
- **Branch management** – Create, delete, compare branches

## Setup

1. Create a [GitHub Personal Access Token](https://github.com/settings/tokens)
2. Add to your Claude Desktop config:

\`\`\`json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<your-token>"
      }
    }
  }
}
\`\`\`

## Requirements

- Node.js 18+
- GitHub Personal Access Token with repo scope`,
    github_url: "https://github.com/modelcontextprotocol/servers/tree/main/src/github",
    install_command: "npx -y @modelcontextprotocol/server-github",
    price_type: "free",
    price_label: "Free",
    verified: true,
    trending: true,
    tags: ["github", "git", "ci-cd", "devops"],
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    installs: 89200,
    rating: 4.9,
    review_count: 412,
    weekly_growth: "+18%",
    revenue_monthly: null,
  },
  {
    id: "2",
    slug: "filesystem-mcp",
    name: "Filesystem MCP",
    author_name: "modelcontextprotocol",
    category_id: "dev",
    description:
      "Official filesystem MCP server. Give AI agents secure, sandboxed read/write access to local files and directories.",
    readme: `# Filesystem MCP Server

Provides secure filesystem access to AI agents with configurable allowed paths.

## Features

- Read and write files
- List directory contents
- Create and delete directories
- Move and copy files
- Configurable allowed paths for sandboxing
- Respects .gitignore by default

## Setup

\`\`\`json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/you/projects",
        "/Users/you/documents"
      ]
    }
  }
}
\`\`\`

Pass allowed directories as positional arguments.`,
    github_url: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
    install_command: "npx -y @modelcontextprotocol/server-filesystem /path/to/allow",
    price_type: "free",
    price_label: "Free",
    verified: true,
    trending: true,
    tags: ["filesystem", "files", "io"],
    gradient: "linear-gradient(135deg, #10b981, #6366f1)",
    installs: 127500,
    rating: 4.8,
    review_count: 589,
    weekly_growth: "+12%",
    revenue_monthly: null,
  },
  {
    id: "3",
    slug: "stripe-mcp",
    name: "Stripe MCP",
    author_name: "stripe",
    category_id: "business",
    description:
      "Official Stripe MCP server. Let AI agents manage payments, customers, subscriptions, invoices, and refunds via the Stripe API.",
    readme: `# Stripe MCP Server

Official MCP server from Stripe. Full access to the Stripe API for AI agents.

## Features

- Create and manage customers
- Handle payments and refunds
- Manage subscriptions and plans
- Generate and retrieve invoices
- Set up payment methods
- Access financial reports

## Setup

\`\`\`json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp"],
      "env": {
        "STRIPE_SECRET_KEY": "YOUR_STRIPE_RESTRICTED_KEY"
      }
    }
  }
}
\`\`\`

⚠️ Use a restricted API key with only the permissions your agent needs.`,
    github_url: "https://github.com/stripe/agent-toolkit",
    install_command: "npx -y @stripe/mcp",
    price_type: "free",
    price_label: "Free",
    verified: true,
    trending: true,
    tags: ["stripe", "payments", "billing", "fintech"],
    gradient: "linear-gradient(135deg, #6366f1, #a78bfa)",
    installs: 43100,
    rating: 4.8,
    review_count: 231,
    weekly_growth: "+41%",
    revenue_monthly: null,
  },
  {
    id: "4",
    slug: "slack-mcp",
    name: "Slack MCP",
    author_name: "modelcontextprotocol",
    category_id: "business",
    description:
      "Official Slack MCP server. AI agents can send messages, read channels, manage threads, and interact with your Slack workspace.",
    readme: `# Slack MCP Server

Gives AI agents full access to Slack workspaces via the Slack API.

## Features

- Send and read messages in channels and DMs
- Create and manage channels
- Reply in threads
- React to messages with emoji
- List workspace members
- Upload files

## Setup

1. Create a Slack app at [api.slack.com](https://api.slack.com/apps)
2. Add OAuth scopes: \`channels:read\`, \`chat:write\`, \`users:read\`
3. Install the app to your workspace

\`\`\`json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-...",
        "SLACK_TEAM_ID": "T0123456789"
      }
    }
  }
}
\`\`\``,
    github_url: "https://github.com/modelcontextprotocol/servers/tree/main/src/slack",
    install_command: "npx -y @modelcontextprotocol/server-slack",
    price_type: "free",
    price_label: "Free",
    verified: true,
    trending: false,
    tags: ["slack", "messaging", "communication"],
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    installs: 38700,
    rating: 4.7,
    review_count: 178,
    weekly_growth: "+22%",
    revenue_monthly: null,
  },
  {
    id: "5",
    slug: "postgres-mcp",
    name: "Postgres MCP",
    author_name: "modelcontextprotocol",
    category_id: "data",
    description:
      "Official PostgreSQL MCP server. Full database access — query, insert, update, schema introspection, and migrations through natural language.",
    readme: `# PostgreSQL MCP Server

Read-write access to PostgreSQL databases for AI agents.

## Features

- Execute raw SQL queries
- List tables, columns, and indexes
- Run schema migrations
- Insert, update, and delete records
- Inspect query execution plans

## Setup

\`\`\`json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://user:password@localhost/mydb"
      ]
    }
  }
}
\`\`\`

Pass your connection string as the last argument.`,
    github_url: "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres",
    install_command: "npx -y @modelcontextprotocol/server-postgres postgresql://user:pass@localhost/db",
    price_type: "free",
    price_label: "Free",
    verified: true,
    trending: false,
    tags: ["postgres", "sql", "database"],
    gradient: "linear-gradient(135deg, #3b82f6, #6366f1)",
    installs: 58400,
    rating: 4.9,
    review_count: 344,
    weekly_growth: "+15%",
    revenue_monthly: null,
  },
  {
    id: "6",
    slug: "brave-search-mcp",
    name: "Brave Search MCP",
    author_name: "modelcontextprotocol",
    category_id: "ai",
    description:
      "Official Brave Search MCP server. Give AI agents real-time web and news search with privacy-focused results via the Brave Search API.",
    readme: `# Brave Search MCP Server

Real-time web search powered by Brave Search for AI agents.

## Features

- Web search with ranked results
- News search with date filtering
- Image search
- Local business search
- Summarization mode
- Privacy-focused — no tracking

## Setup

1. Get a free API key at [brave.com/search/api](https://brave.com/search/api)

\`\`\`json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "BSA..."
      }
    }
  }
}
\`\`\``,
    github_url: "https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search",
    install_command: "npx -y @modelcontextprotocol/server-brave-search",
    price_type: "free",
    price_label: "Free",
    verified: true,
    trending: true,
    tags: ["search", "web", "news", "brave"],
    gradient: "linear-gradient(135deg, #f97316, #6366f1)",
    installs: 61200,
    rating: 4.7,
    review_count: 287,
    weekly_growth: "+31%",
    revenue_monthly: null,
  },
  {
    id: "7",
    slug: "puppeteer-mcp",
    name: "Puppeteer MCP",
    author_name: "modelcontextprotocol",
    category_id: "dev",
    description:
      "Official Puppeteer MCP server. Browser automation for AI agents — screenshot, click, fill forms, scrape, and test web pages.",
    readme: `# Puppeteer MCP Server

Headless browser automation via Puppeteer for AI agents.

## Features

- Take screenshots of web pages
- Click elements and fill forms
- Navigate and extract content
- Run automated tests
- Generate PDFs
- Execute JavaScript in page context

## Setup

\`\`\`json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
\`\`\`

Requires Chrome or Chromium installed on the system.`,
    github_url: "https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer",
    install_command: "npx -y @modelcontextprotocol/server-puppeteer",
    price_type: "free",
    price_label: "Free",
    verified: true,
    trending: false,
    tags: ["browser", "scraping", "automation", "puppeteer"],
    gradient: "linear-gradient(135deg, #10b981, #3b82f6)",
    installs: 44900,
    rating: 4.6,
    review_count: 198,
    weekly_growth: "+19%",
    revenue_monthly: null,
  },
  {
    id: "8",
    slug: "aws-mcp",
    name: "AWS Commander",
    author_name: "cloudctl",
    category_id: "infra",
    description:
      "Comprehensive AWS MCP server. Manage EC2, S3, Lambda, RDS, IAM, CloudFormation, and 50+ AWS services through AI agents.",
    readme: `# AWS Commander MCP Server

Full-featured AWS management for AI agents.

## Features

- **EC2** – Launch, stop, resize, and manage instances
- **S3** – Bucket management, upload/download, lifecycle policies
- **Lambda** – Deploy, invoke, and manage functions
- **RDS** – Database instances and snapshots
- **IAM** – Roles, policies, and users
- **CloudFormation** – Stack deployment and management
- **CloudWatch** – Metrics, logs, and alarms

## Setup

\`\`\`json
{
  "mcpServers": {
    "aws": {
      "command": "npx",
      "args": ["-y", "aws-mcp-server"],
      "env": {
        "AWS_ACCESS_KEY_ID": "AKIA...",
        "AWS_SECRET_ACCESS_KEY": "...",
        "AWS_DEFAULT_REGION": "us-east-1"
      }
    }
  }
}
\`\`\``,
    github_url: "https://github.com/cloudctl/aws-mcp-server",
    install_command: "npx -y aws-mcp-server",
    price_type: "paid",
    price_amount: 20,
    price_label: "$20/mo",
    verified: true,
    trending: true,
    tags: ["aws", "cloud", "infrastructure", "devops"],
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    installs: 29800,
    rating: 4.8,
    review_count: 156,
    weekly_growth: "+27%",
    revenue_monthly: 31600,
  },
  {
    id: "9",
    slug: "figma-mcp",
    name: "Figma Bridge",
    author_name: "designops",
    category_id: "creative",
    description:
      "Figma MCP server for AI agents. Read designs, extract components, inspect styles, and auto-generate code from Figma files.",
    readme: `# Figma Bridge MCP Server

Connects AI agents to Figma for design-to-code workflows.

## Features

- Read frames, components, and variants
- Extract design tokens (colors, typography, spacing)
- Generate React/HTML/CSS from designs
- List and search Figma files
- Access team libraries

## Setup

1. Create a [Figma Personal Access Token](https://www.figma.com/developers/api#access-tokens)

\`\`\`json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-mcp-server"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_..."
      }
    }
  }
}
\`\`\``,
    github_url: "https://github.com/designops/figma-mcp-server",
    install_command: "npx -y figma-mcp-server",
    price_type: "paid",
    price_amount: 8,
    price_label: "$8/mo",
    verified: false,
    trending: false,
    tags: ["figma", "design", "ui", "code-gen"],
    gradient: "linear-gradient(135deg, #a78bfa, #f472b6)",
    installs: 19400,
    rating: 4.6,
    review_count: 89,
    weekly_growth: "+15%",
    revenue_monthly: 9400,
  },
  {
    id: "10",
    slug: "linear-mcp",
    name: "Linear MCP",
    author_name: "linearapp",
    category_id: "business",
    description:
      "Official Linear MCP server. AI agents can create issues, update projects, manage sprints, and query your Linear workspace.",
    readme: `# Linear MCP Server

Full Linear API access for AI project management agents.

## Features

- Create and update issues
- Manage projects and cycles
- Assign issues to team members
- Add comments and labels
- Query issue backlog with filters
- Sync with GitHub PRs

## Setup

1. Go to Linear Settings → API → Personal API Keys

\`\`\`json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@linear/mcp-server"],
      "env": {
        "LINEAR_API_KEY": "lin_api_..."
      }
    }
  }
}
\`\`\``,
    github_url: "https://github.com/linear/linear-mcp",
    install_command: "npx -y @linear/mcp-server",
    price_type: "free",
    price_label: "Free",
    verified: true,
    trending: false,
    tags: ["linear", "project-management", "issues"],
    gradient: "linear-gradient(135deg, #6366f1, #06b6d4)",
    installs: 22300,
    rating: 4.7,
    review_count: 112,
    weekly_growth: "+23%",
    revenue_monthly: null,
  },
  {
    id: "11",
    slug: "notion-mcp",
    name: "Notion MCP",
    author_name: "notionhq",
    category_id: "business",
    description:
      "Official Notion MCP server. Bidirectional Notion integration — AI agents can read, create, update pages and databases in your workspace.",
    readme: `# Notion MCP Server

Official Notion integration for AI agents.

## Features

- Read and write Notion pages
- Query and update databases
- Create new pages and entries
- Manage blocks and rich content
- Search across workspace
- Access shared pages

## Setup

1. Create an [integration](https://www.notion.so/my-integrations) in Notion
2. Share your pages/databases with the integration

\`\`\`json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@notionhq/mcp-server"],
      "env": {
        "NOTION_API_KEY": "secret_..."
      }
    }
  }
}
\`\`\``,
    github_url: "https://github.com/makenotion/notion-mcp-server",
    install_command: "npx -y @notionhq/mcp-server",
    price_type: "paid",
    price_amount: 5,
    price_label: "$5/mo",
    verified: true,
    trending: false,
    tags: ["notion", "docs", "database", "productivity"],
    gradient: "linear-gradient(135deg, #e5e7eb, #6366f1)",
    installs: 31600,
    rating: 4.5,
    review_count: 203,
    weekly_growth: "+11%",
    revenue_monthly: 5800,
  },
  {
    id: "12",
    slug: "huggingface-mcp",
    name: "Hugging Face MCP",
    author_name: "huggingface",
    category_id: "ai",
    description:
      "Hugging Face Hub MCP server. Run inference on 500K+ models, manage datasets, fine-tune models, and explore the Hub via AI agents.",
    readme: `# Hugging Face Hub MCP Server

Access the full Hugging Face ecosystem from AI agents.

## Features

- Run inference on any model (text, image, audio)
- Search and filter the model hub
- Download and manage datasets
- Access model cards and metadata
- Use the Inference API or local models
- Fine-tuning job management (pro)

## Setup

1. Get your [User Access Token](https://huggingface.co/settings/tokens)

\`\`\`json
{
  "mcpServers": {
    "huggingface": {
      "command": "npx",
      "args": ["-y", "@huggingface/mcp-server"],
      "env": {
        "HF_TOKEN": "hf_..."
      }
    }
  }
}
\`\`\``,
    github_url: "https://github.com/huggingface/huggingface-mcp",
    install_command: "npx -y @huggingface/mcp-server",
    price_type: "paid",
    price_amount: 15,
    price_label: "$15/mo",
    verified: false,
    trending: true,
    tags: ["ml", "models", "inference", "ai"],
    gradient: "linear-gradient(135deg, #f59e0b, #10b981)",
    installs: 18900,
    rating: 4.6,
    review_count: 94,
    weekly_growth: "+38%",
    revenue_monthly: 12100,
  },
];

// ─── Seed Reviews ─────────────────────────────────────────────────────────────
export const SEED_REVIEWS = [
  { id: "r1", tool_id: "1", user: { username: "devhunter", avatar_url: null }, rating: 5, body: "Absolutely essential for any GitHub workflow. Claude can now open PRs, review code, and manage issues without me touching GitHub UI.", created_at: "2025-01-15T10:23:00Z" },
  { id: "r2", tool_id: "1", user: { username: "aibuilder", avatar_url: null }, rating: 5, body: "Saved hours every week. The GitHub Actions integration is chef's kiss.", created_at: "2025-01-20T14:10:00Z" },
  { id: "r3", tool_id: "1", user: { username: "frontend_dev", avatar_url: null }, rating: 4, body: "Works great for most workflows. Wish it had better support for GitHub Discussions.", created_at: "2025-02-01T09:00:00Z" },
  { id: "r4", tool_id: "2", user: { username: "sysadmin99", avatar_url: null }, rating: 5, body: "Replaced all my custom file scripts. Claude can now refactor entire codebases.", created_at: "2025-01-18T16:40:00Z" },
  { id: "r5", tool_id: "2", user: { username: "codewitch", avatar_url: null }, rating: 5, body: "The path sandboxing is smart. I feel safe giving Claude access to my project directories.", created_at: "2025-01-25T11:30:00Z" },
  { id: "r6", tool_id: "3", user: { username: "saas_founder", avatar_url: null }, rating: 5, body: "Had our entire billing workflow automated in a day. Claude handles refunds, subscriptions, and invoicing flawlessly.", created_at: "2025-02-05T13:20:00Z" },
  { id: "r7", tool_id: "5", user: { username: "dbadmin", avatar_url: null }, rating: 5, body: "The best MCP server in the list. Complex SQL queries, schema management, everything just works.", created_at: "2025-01-22T08:15:00Z" },
  { id: "r8", tool_id: "8", user: { username: "cloud_architect", avatar_url: null }, rating: 5, body: "Managing 50+ AWS accounts is now a conversation with Claude. Worth every penny.", created_at: "2025-01-28T15:45:00Z" },
  { id: "r9", tool_id: "8", user: { username: "devops_lead", avatar_url: null }, rating: 4, body: "Excellent coverage of AWS services. The IAM policy generation alone saves hours.", created_at: "2025-02-10T10:00:00Z" },
  { id: "r10", tool_id: "12", user: { username: "mleng", avatar_url: null }, rating: 5, body: "Access to every model on HuggingFace through Claude is incredible. Rapid prototyping has never been faster.", created_at: "2025-02-08T12:30:00Z" },
];

// ─── Platform Stats ───────────────────────────────────────────────────────────
export const SEED_STATS = {
  total_tools: 12,
  total_installs: 485000,
  total_revenue: 58900,
  total_developers: 847,
};

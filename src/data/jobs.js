/**
 * Job-to-install matcher — the conversion, not the directory.
 *
 * Humans type a job ("open PRs", "query postgres"). We return trusted tool
 * slugs that exist in the catalog, or an unmatched bounty the supply side
 * can fill. Keep this list in lockstep with server/seed.js slugs.
 */

export const JOBS = [
  {
    id: "ship-code",
    title: "Open PRs and manage GitHub issues",
    prompt: "Let Claude open pull requests and triage issues",
    keywords: ["github", "pr", "pull", "request", "issue", "repo", "commit", "code", "git", "actions"],
    toolSlugs: ["github-mcp-server", "github-mcp", "filesystem-mcp"],
    filled: true,
  },
  {
    id: "browse",
    title: "Drive a real browser",
    prompt: "Fill forms, take screenshots, run the site",
    keywords: ["browser", "playwright", "puppeteer", "click", "screenshot", "chrome", "test", "e2e", "form"],
    toolSlugs: ["playwright-mcp", "puppeteer-mcp", "fetch-mcp"],
    filled: true,
  },
  {
    id: "query-db",
    title: "Query Postgres or Supabase",
    prompt: "Ask questions of my database in English",
    keywords: ["postgres", "postgresql", "supabase", "sql", "database", "query", "schema", "table"],
    toolSlugs: ["postgres-mcp", "supabase-mcp"],
    filled: true,
  },
  {
    id: "search-web",
    title: "Search the live web with citations",
    prompt: "Research with sources, not training-data guesses",
    keywords: ["search", "web", "research", "exa", "tavily", "brave", "citations", "news"],
    toolSlugs: ["exa-search-mcp", "tavily-mcp", "brave-search-mcp", "fetch-mcp"],
    filled: true,
  },
  {
    id: "scrape",
    title: "Scrape a site into markdown",
    prompt: "Crawl docs or a competitor into clean text",
    keywords: ["scrape", "crawl", "firecrawl", "website", "markdown", "extract"],
    toolSlugs: ["firecrawl-mcp", "fetch-mcp", "playwright-mcp"],
    filled: true,
  },
  {
    id: "docs",
    title: "Keep library docs current",
    prompt: "Stop hallucinating APIs for React / Next / whatever",
    keywords: ["docs", "context7", "library", "api", "sdk", "hallucinate", "outdated", "cursor"],
    toolSlugs: ["context7"],
    filled: true,
  },
  {
    id: "payments",
    title: "Look up Stripe customers and refunds",
    prompt: "Let the agent inspect billing without the Dashboard",
    keywords: ["stripe", "payment", "refund", "invoice", "billing", "subscription", "customer"],
    toolSlugs: ["stripe-mcp"],
    filled: true,
  },
  {
    id: "errors",
    title: "Triage production errors",
    prompt: "Read Sentry issues and propose the fix",
    keywords: ["sentry", "error", "exception", "stack", "incident", "observability", "grafana"],
    toolSlugs: ["sentry-mcp", "grafana-mcp"],
    filled: true,
  },
  {
    id: "design",
    title: "Read Figma specs while coding",
    prompt: "Pull tokens and frame structure into the editor",
    keywords: ["figma", "design", "token", "frame", "component", "ui"],
    toolSlugs: ["figma-mcp", "figma-context-mcp"],
    filled: true,
  },
  {
    id: "linear",
    title: "Sync Linear issues from chat",
    prompt: "Create, assign, and close Linear tickets",
    keywords: ["linear", "ticket", "sprint", "backlog"],
    toolSlugs: ["linear-mcp"],
    filled: true,
  },
  {
    id: "slack",
    title: "Post to Slack with approval",
    prompt: "Search channels, draft replies, never send unattended",
    keywords: ["slack", "chat", "channel", "message", "notify"],
    toolSlugs: ["slack-mcp"],
    filled: true,
  },
  {
    id: "gmail",
    title: "Read and draft Gmail",
    prompt: "Inbox triage with an approval gate before send",
    keywords: ["gmail", "email", "inbox", "mail", "google", "workspace"],
    toolSlugs: [],
    filled: false,
  },
  {
    id: "hubspot",
    title: "Update HubSpot from a call recap",
    prompt: "CRM notes, deals, and next steps without the UI",
    keywords: ["hubspot", "crm", "deal", "lead", "sales"],
    toolSlugs: [],
    filled: false,
  },
];

function scoreJob(job, parts) {
  const hay = [job.id, job.title, job.prompt, ...job.keywords].join(" ").toLowerCase();
  let score = 0;
  for (const p of parts) {
    if (job.keywords.includes(p)) score += 5;
    else if (hay.includes(p)) score += 2;
  }
  return score;
}

export function matchQuery(query) {
  const q = query.trim();
  if (!q) {
    return { query: q, job: null, toolSlugs: [], unmatched: JOBS.filter((j) => !j.filled), empty: true };
  }
  const parts = q
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 1);
  const ranked = JOBS.map((job) => ({ job, score: scoreJob(job, parts) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = ranked[0]?.job ?? null;
  const unmatched = ranked.filter((x) => !x.job.filled).map((x) => x.job);
  const toolSlugs = top ? [...top.toolSlugs] : [];

  if (!top && unmatched.length === 0) {
    return {
      query: q,
      job: null,
      toolSlugs: [],
      unmatched: [
        {
          id: "custom",
          title: q,
          prompt: "No trusted listing matches this job yet",
          keywords: parts,
          toolSlugs: [],
          filled: false,
        },
      ],
      empty: false,
    };
  }

  return { query: q, job: top, toolSlugs, unmatched, empty: false };
}

export function jobsIntegrity(knownSlugs) {
  const issues = [];
  const ids = new Set();
  const known = new Set(knownSlugs);
  for (const job of JOBS) {
    if (ids.has(job.id)) issues.push(`Duplicate job ${job.id}`);
    ids.add(job.id);
    for (const slug of job.toolSlugs) {
      if (known.size && !known.has(slug)) {
        issues.push(`Job ${job.id} points at missing tool ${slug}`);
      }
    }
    if (job.filled && job.toolSlugs.length === 0) {
      issues.push(`Job ${job.id} is marked filled but has no tools`);
    }
    if (!job.filled && job.toolSlugs.length > 0) {
      issues.push(`Job ${job.id} is a bounty but lists tools`);
    }
  }
  return { ok: issues.length === 0, issues, jobCount: JOBS.length };
}

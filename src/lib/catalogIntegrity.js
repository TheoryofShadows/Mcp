/**
 * Static catalog / job integrity — the same checks Debug renders.
 * Pure. No I/O. Tests and the Debug page share this.
 */

const FAKE_SECRET_SHAPES = /\b(figd_|ghp_|sk_live_|sk_test_|xoxb-|lin_api_|hf_)\w*/;

export function catalogIntegrity({ clientSeedText, serverSeedText, jobs }) {
  const issues = [];
  const serverSlugs = [...serverSeedText.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
  const clientSlugs = [...clientSeedText.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
  const serverSet = new Set(serverSlugs);

  if (new Set(serverSlugs).size !== serverSlugs.length) {
    issues.push("Duplicate slug in server/seed.js");
  }
  if (new Set(clientSlugs).size !== clientSlugs.length) {
    issues.push("Duplicate slug in src/data/seed.js");
  }

  if (/designops\/figma-mcp-server/.test(clientSeedText)) {
    issues.push("Client seed still points Figma at a fake designops repo");
  }
  if (FAKE_SECRET_SHAPES.test(clientSeedText)) {
    issues.push("Client seed embeds a secret-shaped placeholder (use <KEY> instead)");
  }
  if (FAKE_SECRET_SHAPES.test(serverSeedText) && /figd_/.test(serverSeedText)) {
    issues.push("Server seed embeds a Figma-token-shaped placeholder");
  }

  for (const job of jobs) {
    for (const slug of job.toolSlugs) {
      if (!serverSet.has(slug) && !clientSlugs.includes(slug)) {
        issues.push(`Job ${job.id} points at missing tool ${slug}`);
      }
    }
    if (job.filled && job.toolSlugs.length === 0) {
      issues.push(`Job ${job.id} is marked filled but has no tools`);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    serverCount: serverSlugs.length,
    clientCount: clientSlugs.length,
  };
}

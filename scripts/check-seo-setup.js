#!/usr/bin/env node
// Verifies the two manual Google Search Console steps actually took effect.
// Run:  node scripts/check-seo-setup.js
//
// Checks, per domain: the google-site-verification TXT record, and for MCPX
// that the apex 301s to the canonical www host (i.e. CANONICAL_HOST is set in
// Railway). Exits non-zero while anything is still outstanding.

import { promises as dns } from "node:dns";

const SITES = [
  { domain: "mcpx.digital", canonical: "www.mcpx.digital", registrar: "Railway", expectRedirect: true },
  { domain: "thebookandme.com", canonical: "thebookandme.com", registrar: "Porkbun", expectRedirect: false },
];

const ok = (m) => console.log(`  PASS  ${m}`);
const todo = (m) => console.log(`  TODO  ${m}`);

async function hasGoogleVerification(domain) {
  try {
    const records = await dns.resolveTxt(domain);
    return records.flat().some((r) => r.includes("google-site-verification="));
  } catch {
    return false;
  }
}

// Follows no redirects: we want the raw status of the apex itself.
async function rawStatus(url) {
  try {
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20000) });
    return { status: res.status, location: res.headers.get("location") };
  } catch (err) {
    return { status: 0, error: err.message };
  }
}

let outstanding = 0;

for (const site of SITES) {
  console.log(`\n${site.domain}  (DNS at ${site.registrar})`);

  if (await hasGoogleVerification(site.domain)) {
    ok("google-site-verification TXT record found");
  } else {
    todo(`no google-site-verification TXT record yet — add it at ${site.registrar}`);
    outstanding++;
  }

  if (site.expectRedirect) {
    const { status, location, error } = await rawStatus(`https://${site.domain}/`);
    if (error) {
      todo(`apex unreachable: ${error}`);
      outstanding++;
    } else if (status === 301 || status === 308) {
      ok(`apex ${status} -> ${location}`);
    } else {
      todo(`apex returns ${status}, not a redirect — set CANONICAL_HOST=${site.canonical} in Railway`);
      outstanding++;
    }
  }

  const sm = await rawStatus(`https://${site.canonical}/sitemap.xml`);
  if (sm.status === 200) ok("sitemap.xml reachable");
  else {
    todo(`sitemap.xml returned ${sm.status || sm.error}`);
    outstanding++;
  }
}

console.log(
  outstanding === 0
    ? "\nAll set. Both properties are verifiable and the canonical host is enforced.\n"
    : `\n${outstanding} item(s) still to do. See docs/GOOGLE-SEARCH-CONSOLE.md\n`
);
process.exit(outstanding === 0 ? 0 : 1);

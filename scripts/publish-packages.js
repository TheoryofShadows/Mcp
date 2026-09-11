#!/usr/bin/env node
/**
 * Publish the MCPX npm packages.
 *
 * Publishing is irreversible — npm allows unpublish only within 72 hours, and a
 * version number can never be reused. So this checks everything it can BEFORE
 * pushing anything, and refuses rather than half-publishing.
 *
 * @mcpx-digital/railway is deliberately excluded: its Railway GraphQL calls have not
 * been validated against a live token (see RELEASE.md). Publish it by hand.
 *
 * Usage:
 *   npm run publish:packages            # dry run — shows what WOULD publish
 *   npm run publish:packages -- --yes   # actually publish
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGES = ["cli", "mcpx-mcp"];
const LIVE = process.argv.includes("--yes");

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

// 1. Must be logged in, or every publish fails one at a time.
let who;
try {
  who = run("npm", ["whoami"], ROOT);
} catch {
  fail("Not logged in to npm. Run `npm login` first, then re-run this.");
}
console.log(`npm user: ${who}`);

// 2. Collect what we're about to do, and refuse if a version already exists.
const plan = [];
for (const dir of PACKAGES) {
  const pkgPath = join(ROOT, dir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const { name, version } = pkg;

  if (pkg.publishConfig?.access !== "public") {
    fail(`${dir}: publishConfig.access must be "public" — scoped packages are restricted by default and the publish will fail.`);
  }

  let published = null;
  try {
    published = run("npm", ["view", `${name}@${version}`, "version"], ROOT);
  } catch {
    // 404 — this version does not exist yet, which is what we want.
  }
  if (published) {
    fail(`${name}@${version} is already published. Bump the version in ${dir}/package.json — npm never lets a version be reused.`);
  }

  plan.push({ dir, name, version });
}

console.log("\nWill publish:");
for (const { name, version, dir } of plan) console.log(`  ${name}@${version}  (${dir}/)`);

if (!LIVE) {
  console.log("\nDry run. Nothing was published.");
  console.log("Re-run with --yes to publish for real:\n  npm run publish:packages -- --yes\n");
  process.exit(0);
}

// 3. Publish. prepack regenerates vendored shared code for each package.
for (const { dir, name, version } of plan) {
  process.stdout.write(`publishing ${name}@${version} … `);
  try {
    run("npm", ["publish"], join(ROOT, dir));
    console.log("ok");
  } catch (err) {
    console.log("FAILED");
    fail(`${name} failed to publish:\n${err.stdout || ""}${err.stderr || err.message}`);
  }
}

console.log("\nDone. Verify with:");
for (const { name } of plan) console.log(`  npm view ${name} version`);
console.log("\n@mcpx-digital/railway was NOT published — validate its Railway API calls first (RELEASE.md).");

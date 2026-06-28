/**
 * Sync shared/installConfig.js → cli/installConfig.js.
 *
 * shared/installConfig.js is the single source of truth (imported by the web UI).
 * The CLI is published as a standalone npm package and can't import a file above
 * its own root, so it ships a generated copy. This script regenerates that copy;
 * tests/sharedSync.test.js fails if they ever drift. Run via `npm run sync:cli`
 * (also wired to the CLI package's prepack).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const HEADER =
  "// GENERATED FILE — do not edit. Source of truth: shared/installConfig.js\n" +
  "// Regenerate with: npm run sync:cli\n\n";

export function sync() {
  const src = join(root, "shared", "installConfig.js");
  const dest = join(root, "cli", "installConfig.js");
  writeFileSync(dest, HEADER + readFileSync(src, "utf8"));
  return dest;
}

// Only run the copy when invoked directly (not when imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`synced → ${sync()}`);
}

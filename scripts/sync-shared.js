/**
 * Vendor shared source into the standalone, publishable packages.
 *
 * Some logic has a single source of truth in the repo but must ship *inside* each
 * npm package (a package can't import a file above its own root). This script
 * regenerates those vendored copies; tests/sharedSync.test.js fails if any drift.
 * Run via `npm run sync:vendored` (also wired to each package's prepack).
 *
 *   shared/installConfig.js  → cli/installConfig.js          (web UI = source of truth)
 *   shared/installConfig.js  → mcpx-mcp/installConfig.js
 *   cli/lib.js               → mcpx-mcp/cliShared.js         (shared trust gate + merge)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const HEADER =
  "// GENERATED FILE — do not edit. Regenerate with: npm run sync:vendored\n\n";

export const COPIES = [
  { src: "shared/installConfig.js", dest: "cli/installConfig.js" },
  { src: "shared/installConfig.js", dest: "mcpx-mcp/installConfig.js" },
  { src: "cli/lib.js", dest: "mcpx-mcp/cliShared.js" },
];

export function expected(src) {
  return HEADER + readFileSync(join(root, src), "utf8");
}

export function sync() {
  for (const { src, dest } of COPIES) writeFileSync(join(root, dest), expected(src));
  return COPIES.map((c) => c.dest);
}

// Only run the copy when invoked directly (not when imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log("synced →\n  " + sync().join("\n  "));
}

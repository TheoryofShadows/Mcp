import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { HEADER } from "../scripts/sync-shared.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI shared-config copy", () => {
  it("is in sync with shared/installConfig.js (run `npm run sync:cli` if this fails)", () => {
    const source = readFileSync(join(root, "shared", "installConfig.js"), "utf8");
    const copy = readFileSync(join(root, "cli", "installConfig.js"), "utf8");
    expect(copy).toBe(HEADER + source);
  });
});

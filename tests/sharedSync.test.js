import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { COPIES, expected } from "../scripts/sync-shared.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("vendored package copies", () => {
  it.each(COPIES)("$dest is in sync with $src (run `npm run sync:vendored` if this fails)", ({ src, dest }) => {
    const copy = readFileSync(join(root, dest), "utf8");
    expect(copy).toBe(expected(src));
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The homepage security note claims MCPX scans for specific attack classes.
 * Those claims are only honest while the scanner actually looks for them, so
 * each one is asserted against server/lib/repoScan.js.
 */
const note = readFileSync(
  new URL("../src/components/SecurityNote.jsx", import.meta.url),
  "utf8"
);
const scanner = readFileSync(
  new URL("../server/lib/repoScan.js", import.meta.url),
  "utf8"
);
const trust = readFileSync(
  new URL("../server/lib/trustScore.js", import.meta.url),
  "utf8"
);

describe("SecurityNote — claims must match the scanner", () => {
  it("claims tool-poisoning detection, and the scanner has those patterns", () => {
    expect(note).toMatch(/tool poisoning/i);
    expect(scanner).toContain("POISON_PATTERNS");
    expect(scanner).toContain("previous");
    expect(scanner).toContain("instructions");
    expect(scanner).toMatch(/exfiltrat/);
  });

  it("claims credential detection, and the scanner has secret patterns", () => {
    expect(note).toMatch(/leaked credentials/i);
    expect(scanner).toContain("SECRET_PATTERNS");
  });

  it("claims redaction, and the scanner really redacts secrets", () => {
    expect(note).toMatch(/redact/i);
    expect(scanner).toMatch(/redact:\s*true/);
  });

  it("claims execution-surface visibility, and the scanner looks for it", () => {
    expect(note).toMatch(/execution surface/i);
    expect(scanner).toContain("SURFACE_PATTERNS");
    for (const sig of ["child_process", "eval"]) {
      expect(scanner).toContain(sig);
    }
  });

  it("claims findings lower the Trust Score, and scanPenalty does that", () => {
    // Copy wraps across lines, so assert on the substantive words.
    expect(note).toMatch(/lowers\s+the/i);
    expect(note).toMatch(/Trust Score/);
    expect(trust).toContain("scanPenalty");
    // The penalty must actually be negative.
    expect(trust).toMatch(/points:\s*-\d+,\s*reason:\s*"Source scan flagged/);
  });

  it("does not overclaim — scanning is presented as automated, not a guarantee", () => {
    expect(note).toMatch(/not a guarantee/i);
    expect(note).not.toMatch(/\bguaranteed safe\b|\b100% safe\b|\bfully audited\b/i);
  });
});

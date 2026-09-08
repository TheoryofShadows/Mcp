import { describe, it, expect } from "vitest";
import { jwtSecretError } from "../server/middleware/auth.js";

// The .env.example placeholder is in the public repo. Requiring the secret to
// merely exist in production is not enough — a deploy that pasted the
// placeholder verbatim would let anyone forge an admin token. Reject it at boot.
describe("jwtSecretError (production JWT secret strength)", () => {
  it("rejects a missing secret", () => {
    expect(jwtSecretError("")).toBeTruthy();
    expect(jwtSecretError(undefined)).toBeTruthy();
  });

  it("rejects the public .env.example placeholder", () => {
    expect(jwtSecretError("change-me-to-a-secure-random-string-at-least-32-chars")).toMatch(/placeholder/i);
  });

  it("rejects common weak secrets", () => {
    for (const w of ["secret", "changeme", "jwt-secret", "password", "mcpx"]) {
      expect(jwtSecretError(w)).toBeTruthy();
    }
  });

  it("rejects a too-short secret", () => {
    expect(jwtSecretError("a".repeat(31))).toMatch(/32 characters/i);
  });

  it("accepts a strong random secret", () => {
    expect(jwtSecretError("f3a9c1e07b2d48569a0e1f4c6b8d2a370e5f9c1a4b6d8e0f2a4c6e8b0d1f3a5c7")).toBeNull();
  });
});

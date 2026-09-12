import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { MIN_PRICE_CENTS } from "../server/routes/servers.js";

/**
 * The site was taking LIVE card payments with no Terms, no Privacy Policy and
 * no refund policy. Stripe requires all three of a Connect platform, and a
 * buyer disputing a charge had nothing to read.
 *
 * These tests exist because a policy that drifts from the code is worse than
 * no policy: it is a written promise the product does not keep.
 */
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const terms = read("docs/TERMS.md");
const privacy = read("docs/PRIVACY.md");
const refunds = read("docs/REFUNDS.md");
const footer = read("src/components/sections/Footer.jsx");

describe("legal documents exist and match the code", () => {
  it("states the same platform fee the code charges", () => {
    const payments = read("server/routes/payments.js");
    expect(payments).toMatch(/PLATFORM_FEE_PCT = 0\.15/);
    expect(terms).toMatch(/15% platform fee/);
    expect(terms).toMatch(/85%/);
  });

  it("states the same minimum price the code enforces", () => {
    expect(MIN_PRICE_CENTS).toBe(300);
    expect(terms).toMatch(/\$3\.00 minimum/);
  });

  it("promises refunds revoke access, which is what the code does", () => {
    const payments = read("server/routes/payments.js");
    // Access is gated on a sale with refunded_at IS NULL.
    expect(payments).toMatch(/refunded_at IS NULL/);
    expect(refunds).toMatch(/access to the tool is revoked/i);
  });

  it("does not overclaim what the Trust Score means", () => {
    // The product's core honesty commitment.
    expect(terms).toMatch(/not a security audit/i);
    expect(terms).toMatch(/not a warranty/i);
  });

  it("describes analytics accurately — no IP is stored", () => {
    const db = read("server/db.js");
    const pageViews = db.slice(db.indexOf("CREATE TABLE IF NOT EXISTS page_views"));
    const table = pageViews.slice(0, pageViews.indexOf(");"));
    expect(table).not.toMatch(/ip|user_agent|cookie/i);
    expect(privacy).toMatch(/No IP address, no\s*\n?cookie/i);
  });

  it("claims password reset tokens are hashed, which they are", () => {
    const auth = read("server/routes/auth.js");
    expect(auth).toMatch(/createHash\("sha256"\)/);
    expect(privacy).toMatch(/SHA-256\s*\n?hashes/);
    expect(privacy).toMatch(/single-use/);
  });

  it("claims cards never touch our servers, and no card field exists", () => {
    const db = read("server/db.js");
    expect(db).not.toMatch(/card_number|cvv|card_num/i);
    expect(privacy).toMatch(/never see them/i);
  });

  it("is reachable from the footer on every page", () => {
    for (const label of ["Terms of Service", "Privacy Policy", "Refund Policy"]) {
      expect(footer).toContain(label);
    }
  });

  it("shows terms at the point of payment, before the buyer pays", () => {
    const tool = read("src/pages/ToolDetail.jsx");
    expect(tool).toMatch(/docs\/TERMS\.md/);
    expect(tool).toMatch(/14-day refunds/);
  });
});

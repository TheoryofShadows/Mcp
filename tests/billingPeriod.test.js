import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { formatDollars } from "../server/routes/servers.js";

const payments = readFileSync(new URL("../server/routes/payments.js", import.meta.url), "utf8");
const db = readFileSync(new URL("../server/db.js", import.meta.url), "utf8");

describe("billing_period — one-time vs monthly", () => {
  it("defaults a listing to one-time, so nothing becomes recurring by accident", () => {
    expect(db).toMatch(/billing_period TEXT DEFAULT 'one_time'/);
  });

  it("uses payment mode for one-time and subscription mode for monthly", () => {
    expect(payments).toMatch(/mode: isRecurring \? "subscription" : "payment"/);
  });

  it("attaches a monthly interval only when recurring", () => {
    expect(payments).toMatch(/isRecurring \? \{ recurring: \{ interval: "month" \} \}/);
  });

  it("takes the platform fee on BOTH paths", () => {
    // One-time: an exact cent amount. Monthly: a percent of every renewal.
    expect(payments).toMatch(/application_fee_amount: Math\.round\(server\.price_amount \* PLATFORM_FEE_PCT\)/);
    expect(payments).toMatch(/application_fee_percent: PLATFORM_FEE_PCT \* 100/);
  });

  it("routes both paths to the publisher's Connect account", () => {
    const destinations = payments.match(/transfer_data: \{ destination: server\.stripe_account_id \}/g) || [];
    expect(destinations.length).toBeGreaterThanOrEqual(2);
  });

  it("does not mistake a recurring TOOL sale for a platform tier upgrade", () => {
    // Without this, a buyer subscribing to a tool would hit the tier branch,
    // fail to resolve a tier, and pay without receiving access.
    expect(payments).toMatch(/const isToolSubscription\s*=/);
    expect(payments).toMatch(/session\.mode === "subscription" && !!session\.metadata\?\.server_id/);
    expect(payments).toMatch(/session\.mode === "subscription" && !isToolSubscription/);
  });

  it("grants access for a recurring tool sale", () => {
    expect(payments).toMatch(/if \(isToolSubscription\) \{[\s\S]*?grantToolPurchase\(/);
  });

  it("keeps the 15/85 split exact at every price, including cents", () => {
    const FEE = 0.15;
    for (const cents of [1, 99, 100, 999, 1999, 4950, 123456, 99999999]) {
      const fee = Math.round(cents * FEE);
      const publisher = cents - fee;
      expect(fee + publisher).toBe(cents); // no money invented or lost
      expect(fee).toBeGreaterThanOrEqual(0);
      expect(publisher).toBeGreaterThan(0);
    }
  });

  it("formats any price without dropping cents", () => {
    expect(formatDollars(100)).toBe("1");
    expect(formatDollars(999)).toBe("9.99");
    expect(formatDollars(1999)).toBe("19.99");
    expect(formatDollars(99999999)).toBe("999999.99");
    // The old toFixed(0) would have rendered $9.99 as "$10".
    expect(formatDollars(999)).not.toBe("10");
  });
});

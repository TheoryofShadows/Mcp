import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { computePurchasable } from "../server/lib/purchasable.js";

/**
 * <PublishPipeline> makes promises to publishers about what happens after they
 * hit submit. Those promises are only worth making while they match the actual
 * backend. These tests fail if the copy and the code drift apart.
 */
const source = readFileSync(
  new URL("../src/components/PublishPipeline.jsx", import.meta.url),
  "utf8"
);
const serversRoute = readFileSync(
  new URL("../server/routes/servers.js", import.meta.url),
  "utf8"
);

describe("PublishPipeline — publisher-facing promises", () => {
  it("claims no review queue, and listings really are created active", () => {
    // The copy tells publishers their listing goes live immediately.
    expect(source).toMatch(/no review queue/i);
    // That is only honest while POST /api/servers inserts status 'active'.
    expect(serversRoute).toMatch(/VALUES\s*\([^)]*'active'\s*\)/);
  });

  it("does not promise instant scoring, because the scan is out of band", () => {
    // scheduleScan is fire-and-forget, so the copy must hedge the timing.
    expect(source).toMatch(/shortly after/i);
    expect(source).not.toMatch(/instantly scored|scored instantly|immediately scored/i);
    expect(serversRoute).toContain("scheduleScan");
  });

  it("tells publishers scoring needs a repo, which scheduleScan requires", () => {
    expect(source).toMatch(/needs a public repository/i);
    const scanService = readFileSync(
      new URL("../server/lib/scanService.js", import.meta.url),
      "utf8"
    );
    // scheduleScan bails without a usable repoUrl — hence the caveat.
    expect(scanService).toMatch(/if \(!repoUrl/);
  });

  it("states the 85% payout split", () => {
    expect(source).toContain("85%");
  });

  it("presents Stripe as a prerequisite for selling, matching purchasable gating", () => {
    expect(source).toMatch(/connect stripe/i);

    // A paid listing without completed Connect onboarding must not be buyable.
    const notReady = computePurchasable({ price_type: "paid" });
    expect(notReady.purchasable).toBe(false);
    expect(notReady.purchase_blocked_reason).toBe("Publisher payouts not enabled");

    const ready = computePurchasable({
      price_type: "paid",
      stripe_account_id: "acct_123",
      stripe_onboarding_done: 1,
    });
    expect(ready.purchasable).toBe(true);

    // Free listings are always purchasable, so the copy must not imply
    // Stripe is required merely to be listed.
    expect(computePurchasable({ price_type: "free" }).purchasable).toBe(true);
  });

  it("describes exactly three steps", () => {
    const ids = [...source.matchAll(/^\s{4}id: "([a-z]+)",$/gm)].map((m) => m[1]);
    expect(ids).toEqual(["submit", "score", "listed"]);
  });
});

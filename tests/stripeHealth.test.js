import { describe, it, expect } from "vitest";
import request from "supertest";
import { readFileSync } from "node:fs";
import { createApp } from "../server/app.js";

/**
 * A health check that cannot fail is not a health check.
 *
 * /stripe/config reported "enabled: live, webhook_secret_set: true" for an
 * entire working session while every real Stripe call was failing with
 * "An error occurred with our connection to Stripe. Request was retried 2
 * times." The buyer saw "Failed to create tool checkout session"; the health
 * endpoint said everything was fine; and that contradiction was believed for
 * hours, because the endpoint only ever read environment variables.
 */
const app = createApp();
const src = readFileSync(new URL("../server/routes/payments.js", import.meta.url), "utf8");

describe("stripe liveness", () => {
  it("answers, and says whether Stripe is reachable", async () => {
    const res = await request(app).get("/api/payments/stripe/health");
    // 200 when reachable, 503 when not — either is a real answer. What matters
    // is that the field exists and reflects an actual call.
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("reachable");
    expect(typeof res.body.reachable).toBe("boolean");
  });

  it("returns 503, not 200, when Stripe cannot be reached", async () => {
    // The whole point: an unreachable payment processor must not read as OK to
    // a monitor or a load balancer.
    const res = await request(app).get("/api/payments/stripe/health");
    if (res.body.reachable === false) {
      expect(res.status).toBe(503);
      expect(res.body.reason).toBeTruthy();
    }
  });

  it("makes a real API call rather than reading an env var", () => {
    expect(src).toMatch(/router\.get\("\/stripe\/health"[\s\S]{0,900}stripe\.accounts\.retrieve\(\)/);
  });

  it("reports latency, so a slow-but-working connection is visible", () => {
    expect(src).toMatch(/latency_ms/);
  });

  it("surfaces Stripe's own error type and message", () => {
    // "connection to Stripe" is a network failure; an auth error means the key
    // is wrong. Those need different fixes and only the message distinguishes them.
    expect(src).toMatch(/error_type: err\?\.type/);
    expect(src).toMatch(/reason: err\?\.message/);
  });

  it("reports whether the platform account can actually take charges", () => {
    // A platform with charges disabled cannot sell anything, however healthy
    // the API key looks.
    expect(src).toMatch(/can_accept_payments/);
    expect(src).toMatch(/disabled_reason/);
  });

  it("never leaks the key, in any branch", async () => {
    const res = await request(app).get("/api/payments/stripe/health");
    const blob = JSON.stringify(res.body);
    expect(blob).not.toMatch(/sk_live|sk_test|rk_live|rk_test/);
  });
});

describe("stripe config endpoint admits its own limits", () => {
  it("declares that it reflects configuration only", async () => {
    const res = await request(app).get("/api/payments/stripe/config");
    expect(res.body.reflects_config_only).toBe(true);
  });

  it("points at the endpoint that actually tests the connection", async () => {
    const res = await request(app).get("/api/payments/stripe/config");
    expect(res.body.liveness_endpoint).toBe("/api/payments/stripe/health");
  });
});

describe("stripe client timeouts", () => {
  it("fails fast instead of hanging on the SDK's 80s default", () => {
    // A buyer stared at a spinner for minutes before the error appeared.
    expect(src).toMatch(/timeout: 15_000/);
    expect(src).toMatch(/maxNetworkRetries: 2/);
  });
});

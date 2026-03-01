import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { cleanup } from "./setup.js";
import { createApp } from "../server/app.js";

const app = createApp();

let token;

beforeAll(async () => {
  const reg = await request(app).post("/api/auth/register").send({
    email: "tiertest@example.com",
    username: "tiertest",
    password: "tierpassword",
  });
  token = reg.body.token;
});

afterAll(cleanup);

describe("GET /api/tiers", () => {
  it("returns pricing tiers, revenue projections, and tech stack", async () => {
    const res = await request(app).get("/api/tiers");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tiers)).toBe(true);
    expect(res.body.tiers.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.revenue_projections)).toBe(true);
    expect(Array.isArray(res.body.tech_stack)).toBe(true);
  });

  it("includes free starter tier", async () => {
    const res = await request(app).get("/api/tiers");
    const starter = res.body.tiers.find((t) => t.id === "starter");
    expect(starter).toBeDefined();
    expect(starter.price_amount).toBe(0);
  });
});

describe("POST /api/tiers/subscribe", () => {
  it("subscribes to pro tier when authenticated", async () => {
    const res = await request(app)
      .post("/api/tiers/subscribe")
      .set("Authorization", `Bearer ${token}`)
      .send({ tier: "pro" });
    expect(res.status).toBe(201);
    expect(res.body.subscription.tier).toBe("pro");
    expect(res.body.subscription.status).toBe("active");
  });

  it("can upgrade to enterprise tier", async () => {
    const res = await request(app)
      .post("/api/tiers/subscribe")
      .set("Authorization", `Bearer ${token}`)
      .send({ tier: "enterprise" });
    expect(res.status).toBe(201);
    expect(res.body.subscription.tier).toBe("enterprise");
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app)
      .post("/api/tiers/subscribe")
      .send({ tier: "pro" });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid tier", async () => {
    const res = await request(app)
      .post("/api/tiers/subscribe")
      .set("Authorization", `Bearer ${token}`)
      .send({ tier: "ultra-mega-plan" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid tier/i);
  });
});

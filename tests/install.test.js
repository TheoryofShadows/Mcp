import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { cleanup, backdateUser } from "./setup.js";
import { createApp } from "../server/app.js";

const app = createApp();

// The install rate limiter keys on IP+server (1/min), so every call below uses a
// distinct X-Forwarded-For (trust proxy = 1) to exercise the counting logic
// rather than the rate limiter.
function install(slug, { token, ip } = {}) {
  const req = request(app).post(`/api/servers/${slug}/install`).set("X-Forwarded-For", ip);
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req;
}

async function installsFor(slug) {
  const res = await request(app).get(`/api/servers/${slug}`);
  return res.body.installs;
}

let authorToken, user1, user2, slug;

beforeAll(async () => {
  const author = await request(app).post("/api/auth/register").send({
    email: "adopt-author@example.com", username: "adoptauthor", password: "testpassword",
  });
  authorToken = author.body.token;
  backdateUser("adopt-author@example.com");

  const u1 = await request(app).post("/api/auth/register").send({
    email: "adopt-u1@example.com", username: "adoptu1", password: "testpassword",
  });
  user1 = u1.body.token;

  const u2 = await request(app).post("/api/auth/register").send({
    email: "adopt-u2@example.com", username: "adoptu2", password: "testpassword",
  });
  user2 = u2.body.token;

  const s = await request(app).post("/api/servers").set("Authorization", `Bearer ${authorToken}`).send({
    name: "Adoption Test Server", category_id: "dev-tools", description: "Server for adoption-integrity tests.",
  });
  slug = s.body.slug;
});

afterAll(cleanup);

describe("adoption integrity — POST /api/servers/:slug/install", () => {
  it("starts at zero installs", async () => {
    expect(await installsFor(slug)).toBe(0);
  });

  it("does NOT count an anonymous install toward the trust signal", async () => {
    const res = await install(slug, { ip: "10.1.0.1" });
    expect(res.status).toBe(200);
    expect(await installsFor(slug)).toBe(0);
  });

  it("counts a distinct authenticated installer", async () => {
    const res = await install(slug, { token: user1, ip: "10.1.0.2" });
    expect(res.status).toBe(200);
    expect(await installsFor(slug)).toBe(1);
  });

  it("does NOT double-count the same authenticated user", async () => {
    const res = await install(slug, { token: user1, ip: "10.1.0.3" });
    expect(res.status).toBe(200);
    expect(await installsFor(slug)).toBe(1);
  });

  it("counts a second distinct authenticated installer", async () => {
    const res = await install(slug, { token: user2, ip: "10.1.0.4" });
    expect(res.status).toBe(200);
    expect(await installsFor(slug)).toBe(2);
  });

  it("still does not count further anonymous installs", async () => {
    await install(slug, { ip: "10.1.0.5" });
    expect(await installsFor(slug)).toBe(2);
  });
});

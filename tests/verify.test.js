import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { cleanup } from "./setup.js";

// Control what the (mocked) repo proof-reader returns, without spawning git.
const state = vi.hoisted(() => ({ token: null }));
vi.mock("../server/lib/provenance.js", () => ({
  VERIFY_FILENAME: ".mcpx-verify",
  readProofToken: vi.fn(async () => state.token),
}));

import { createApp } from "../server/app.js";

const app = createApp();
afterAll(cleanup);

let token;
async function makeServer(name) {
  const res = await request(app).post("/api/servers").set("Authorization", `Bearer ${token}`).send({
    name, category_id: "dev-tools", description: "Server for provenance verification tests.",
    repo_url: "https://github.com/acme/repo",
  });
  return res.body.slug;
}

beforeAll(async () => {
  const reg = await request(app).post("/api/auth/register").send({
    email: "verify@example.com", username: "verifyuser", password: "testpassword",
  });
  token = reg.body.token;
});

describe("GET /api/servers/:slug/verify", () => {
  it("issues a challenge token to the author", async () => {
    const slug = await makeServer("Verify Issue");
    const res = await request(app).get(`/api/servers/${slug}/verify`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.filename).toBe(".mcpx-verify");
    expect(res.body.token).toMatch(/^[a-f0-9]{32}$/);
    expect(res.body.repo_verified).toBe(false);
  });

  it("rejects a non-author", async () => {
    const slug = await makeServer("Verify NonAuthor");
    const other = await request(app).post("/api/auth/register").send({
      email: "other@example.com", username: "otheruser", password: "testpassword",
    });
    const res = await request(app).get(`/api/servers/${slug}/verify`).set("Authorization", `Bearer ${other.body.token}`);
    expect(res.status).toBe(403);
  });

  it("requires authentication", async () => {
    const slug = await makeServer("Verify NoAuth");
    const res = await request(app).get(`/api/servers/${slug}/verify`);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/servers/:slug/verify", () => {
  it("verifies ownership when the token matches and flips repo_verified", async () => {
    const slug = await makeServer("Verify Success");
    const issued = (await request(app).get(`/api/servers/${slug}/verify`).set("Authorization", `Bearer ${token}`)).body.token;
    state.token = issued;

    const res = await request(app).post(`/api/servers/${slug}/verify`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.repo_verified).toBe(true);

    const detail = await request(app).get(`/api/servers/${slug}`);
    expect(detail.body.repo_verified).toBe(true);
  });

  it("fails with 422 when the token is absent or mismatched", async () => {
    const slug = await makeServer("Verify Fail");
    await request(app).get(`/api/servers/${slug}/verify`).set("Authorization", `Bearer ${token}`);
    state.token = "not-the-right-token";

    const res = await request(app).post(`/api/servers/${slug}/verify`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(422);
    expect(res.body.repo_verified).toBe(false);
  });

  it("cooldown-limits repeated attempts on the same server", async () => {
    const slug = await makeServer("Verify Cooldown");
    await request(app).get(`/api/servers/${slug}/verify`).set("Authorization", `Bearer ${token}`);
    state.token = "x";
    await request(app).post(`/api/servers/${slug}/verify`).set("Authorization", `Bearer ${token}`);
    const second = await request(app).post(`/api/servers/${slug}/verify`).set("Authorization", `Bearer ${token}`);
    expect(second.status).toBe(429);
  });

  it("400s before a token has been requested", async () => {
    const slug = await makeServer("Verify NoToken");
    const res = await request(app).post(`/api/servers/${slug}/verify`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

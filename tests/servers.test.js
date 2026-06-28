import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { cleanup, backdateUser } from "./setup.js";
import { createApp } from "../server/app.js";

const app = createApp();

let token;
let slug;

beforeAll(async () => {
  const reg = await request(app).post("/api/auth/register").send({
    email: "servertest@example.com",
    username: "servertest",
    password: "testpassword",
  });
  token = reg.body.token;
  backdateUser("servertest@example.com");
});

afterAll(cleanup);

describe("GET /api/servers", () => {
  it("returns a list of servers", async () => {
    const res = await request(app).get("/api/servers");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("servers");
    expect(res.body).toHaveProperty("pagination");
    expect(Array.isArray(res.body.servers)).toBe(true);
  });

  it("respects search query parameter", async () => {
    const res = await request(app).get("/api/servers?search=nonexistent12345xyz");
    expect(res.status).toBe(200);
    expect(res.body.servers).toHaveLength(0);
  });

  it("respects pagination parameters", async () => {
    const res = await request(app).get("/api/servers?page=1&limit=5");
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(5);
  });

  it("caps limit at 100", async () => {
    const res = await request(app).get("/api/servers?limit=9999");
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(100);
  });

  it("filters by author without erroring (regression: COUNT join)", async () => {
    const res = await request(app).get("/api/servers?author=servertest");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.servers)).toBe(true);
  });

  it("returns 200 for an author with no servers", async () => {
    const res = await request(app).get("/api/servers?author=ghost-no-such-user");
    expect(res.status).toBe(200);
    expect(res.body.servers).toHaveLength(0);
  });
});

describe("POST /api/servers", () => {
  it("creates a server when authenticated", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "My Test Server",
        category_id: "dev-tools",
        description: "A server for testing purposes",
        price_type: "free",
      });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("My Test Server");
    expect(res.body.slug).toBe("my-test-server");
    slug = res.body.slug;
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/servers").send({
      name: "Unauthorized Server",
      category_id: "dev-tools",
      description: "Should not be created",
    });
    expect(res.status).toBe(401);
  });

  it("rejects missing required fields", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "No Desc" });
    expect(res.status).toBe(400);
  });

  it("rejects short description", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Valid Name", category_id: "dev-tools", description: "Short" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/description/i);
  });

  it("rejects invalid category", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Bad Category Server",
        category_id: "nonexistent-cat",
        description: "This has a bad category id for testing",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/category/i);
  });

  it("rejects duplicate server name", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "My Test Server",
        category_id: "dev-tools",
        description: "Duplicate name should be rejected",
      });
    expect(res.status).toBe(409);
  });
});

describe("GET /api/servers/:slug", () => {
  it("returns server detail by slug", async () => {
    const res = await request(app).get(`/api/servers/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe(slug);
    expect(res.body).toHaveProperty("reviews");
    expect(Array.isArray(res.body.reviews)).toBe(true);
  });

  it("returns 404 for unknown slug", async () => {
    const res = await request(app).get("/api/servers/does-not-exist-abc123");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/servers/:slug/reviews", () => {
  let reviewerToken;

  beforeAll(async () => {
    const reg = await request(app).post("/api/auth/register").send({
      email: "reviewer@example.com",
      username: "reviewer",
      password: "reviewerpass",
    });
    reviewerToken = reg.body.token;
    backdateUser("reviewer@example.com");
  });

  it("allows authenticated user to review a server they don't own", async () => {
    const res = await request(app)
      .post(`/api/servers/${slug}/reviews`)
      .set("Authorization", `Bearer ${reviewerToken}`)
      .send({ rating: 4, comment: "Great server for testing!" });
    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(4);
  });

  it("rejects duplicate review from same user", async () => {
    const res = await request(app)
      .post(`/api/servers/${slug}/reviews`)
      .set("Authorization", `Bearer ${reviewerToken}`)
      .send({ rating: 5, comment: "Second review attempt" });
    expect(res.status).toBe(409);
  });

  it("rejects author reviewing own server", async () => {
    const res = await request(app)
      .post(`/api/servers/${slug}/reviews`)
      .set("Authorization", `Bearer ${token}`)
      .send({ rating: 5, comment: "Self review" });
    expect(res.status).toBe(400);
  });

  it("rejects invalid rating", async () => {
    const res = await request(app)
      .post(`/api/servers/${slug}/reviews`)
      .set("Authorization", `Bearer ${reviewerToken}`)
      .send({ rating: 6 });
    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated review", async () => {
    const res = await request(app)
      .post(`/api/servers/${slug}/reviews`)
      .send({ rating: 3, comment: "No auth" });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/servers/:slug/install", () => {
  it("records an install", async () => {
    const res = await request(app).post(`/api/servers/${slug}/install`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("rate-limits repeated installs from the same IP", async () => {
    // First install already done above, second should be rate-limited
    const res = await request(app).post(`/api/servers/${slug}/install`);
    expect(res.status).toBe(429);
  });

  it("returns 404 for unknown slug", async () => {
    const res = await request(app).post("/api/servers/does-not-exist/install");
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/servers/:slug", () => {
  let delToken, delSlug;
  beforeAll(async () => {
    const reg = await request(app).post("/api/auth/register").send({
      email: "deleter@example.com", username: "deleter", password: "deleterpass",
    });
    delToken = reg.body.token;
    const s = await request(app).post("/api/servers").set("Authorization", `Bearer ${delToken}`)
      .send({ name: "Deletable Server", category_id: "dev-tools", description: "A server to delete in tests." });
    delSlug = s.body.slug;
  });
  it("rejects deletion by a non-author", async () => {
    const res = await request(app).delete(`/api/servers/${delSlug}`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
  it("rejects unauthenticated deletion", async () => {
    const res = await request(app).delete(`/api/servers/${delSlug}`);
    expect(res.status).toBe(401);
  });
  it("lets the author delete their own server", async () => {
    const res = await request(app).delete(`/api/servers/${delSlug}`).set("Authorization", `Bearer ${delToken}`);
    expect(res.status).toBe(200);
    const gone = await request(app).get(`/api/servers/${delSlug}`);
    expect(gone.status).toBe(404);
  });
});

describe("POST /api/servers/:slug/report", () => {
  it("accepts a valid report", async () => {
    const res = await request(app)
      .post(`/api/servers/${slug}/report`)
      .send({ reason: "security", detail: "Looks like it requests broad filesystem access." });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("rejects an invalid reason", async () => {
    const res = await request(app)
      .post(`/api/servers/${slug}/report`)
      .send({ reason: "not-a-real-reason" });
    expect(res.status).toBe(400);
  });

  it("returns 404 reporting an unknown server", async () => {
    const res = await request(app)
      .post("/api/servers/does-not-exist-xyz/report")
      .send({ reason: "spam" });
    expect(res.status).toBe(404);
  });
});

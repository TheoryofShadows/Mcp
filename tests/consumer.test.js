/**
 * Full Consumer Test — end-to-end journey through the MCPX API.
 *
 * Simulates the complete lifecycle a typical API consumer would exercise:
 *   1. Discover the platform (health, stats, categories)
 *   2. Register and authenticate
 *   3. Publish a tool (server)
 *   4. Browse and search the marketplace
 *   5. Leave a review and record an install
 *   6. Manage a subscription tier
 *   7. Inspect the authenticated user profile
 *
 * Each describe block is a chapter in the consumer story.
 * State (tokens, slugs) flows naturally from earlier chapters into later ones,
 * mirroring how a real client would behave across multiple requests.
 */

import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { cleanup, backdateUser } from "./setup.js";
import { createApp } from "../server/app.js";

const app = createApp();

// ─── Shared state across describe blocks ──────────────────────────────────────
let publisherToken;   // Author of the tool
let consumerToken;    // Second user who browses and reviews
let toolSlug;         // Slug of the published tool

afterAll(cleanup);

// ─── Chapter 1: Platform Discovery ───────────────────────────────────────────

describe("Chapter 1 – Platform Discovery", () => {
  it("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.timestamp).toBe("string");
  });

  it("GET /api/stats returns platform statistics", async () => {
    const res = await request(app).get("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      server_count: expect.any(Number),
      total_installs: expect.any(Number),
      publisher_count: expect.any(Number),
      avg_rating: expect.any(Number),
      review_count: expect.any(Number),
    });
    expect(Array.isArray(res.body.hero_stats)).toBe(true);
    expect(res.body.hero_stats.length).toBeGreaterThan(0);
  });

  it("GET /api/categories returns category list with counts", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Test DB is seeded with dev-tools and data categories
    const ids = res.body.map((c) => c.id);
    expect(ids).toContain("dev-tools");
    res.body.forEach((cat) => {
      expect(cat).toHaveProperty("id");
      expect(cat).toHaveProperty("label");
      expect(cat).toHaveProperty("count");
    });
  });

  it("GET /api/tiers returns pricing tiers, projections and tech stack", async () => {
    const res = await request(app).get("/api/tiers");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tiers)).toBe(true);
    expect(Array.isArray(res.body.revenue_projections)).toBe(true);
    expect(Array.isArray(res.body.tech_stack)).toBe(true);

    const starter = res.body.tiers.find((t) => t.id === "starter");
    expect(starter).toBeDefined();
    expect(starter.price_amount).toBe(0);

    const pro = res.body.tiers.find((t) => t.id === "pro");
    expect(pro).toBeDefined();
    expect(pro.price_amount).toBeGreaterThan(0);
  });
});

// ─── Chapter 2: Registration & Authentication ─────────────────────────────────

describe("Chapter 2 – Registration & Authentication", () => {
  it("registers the publisher account", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "publisher@consumer.test",
      username: "consumer_publisher",
      password: "publish3r!",
      display_name: "Consumer Publisher",
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toMatchObject({
      email: "publisher@consumer.test",
      username: "consumer_publisher",
      tier: "starter",
    });
    expect(res.body.user).not.toHaveProperty("password_hash");
    publisherToken = res.body.token;
    backdateUser("publisher@consumer.test");
  });

  it("registers the consumer account", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "buyer@consumer.test",
      username: "consumer_buyer",
      password: "buy3r!pass",
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    consumerToken = res.body.token;
    backdateUser("buyer@consumer.test");
  });

  it("rejects duplicate registration", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "publisher@consumer.test",
      username: "consumer_publisher",
      password: "anotherpass",
    });
    expect(res.status).toBe(409);
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "publisher@consumer.test",
      password: "publish3r!",
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe("publisher@consumer.test");
    // Refresh token for subsequent steps
    publisherToken = res.body.token;
  });

  it("rejects login with wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "publisher@consumer.test",
      password: "wrongpassword",
    });
    expect(res.status).toBe(401);
  });

  it("rejects access to protected route without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns authenticated user profile via /api/auth/me", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${publisherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("publisher@consumer.test");
    expect(res.body).toHaveProperty("server_count");
    expect(res.body).toHaveProperty("total_installs");
  });
});

// ─── Chapter 3: Publishing a Tool ────────────────────────────────────────────

describe("Chapter 3 – Publishing a Tool", () => {
  it("rejects publishing without authentication", async () => {
    const res = await request(app).post("/api/servers").send({
      name: "Ghost Tool",
      category_id: "dev-tools",
      description: "Should not be created without auth",
    });
    expect(res.status).toBe(401);
  });

  it("rejects publishing with missing required fields", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${publisherToken}`)
      .send({ name: "Incomplete Tool" });
    expect(res.status).toBe(400);
  });

  it("rejects publishing with a description that is too short", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${publisherToken}`)
      .send({
        name: "Short Desc Tool",
        category_id: "dev-tools",
        description: "Too short",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/description/i);
  });

  it("rejects publishing with an invalid category", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${publisherToken}`)
      .send({
        name: "Bad Cat Tool",
        category_id: "nonexistent-xyz",
        description: "A tool with an invalid category that should be rejected",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/category/i);
  });

  it("publishes a free tool successfully", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${publisherToken}`)
      .send({
        name: "Consumer Test Tool",
        category_id: "dev-tools",
        description: "A comprehensive tool published during the consumer test journey",
        long_description: "This tool was created as part of the consumer integration test suite.",
        price_type: "free",
        tags: ["testing", "consumer", "integration"],
        repo_url: "https://github.com/example/consumer-test-tool",
      });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: "Consumer Test Tool",
      slug: "consumer-test-tool",
      price_type: "free",
      verified: false,
    });
    expect(Array.isArray(res.body.tags)).toBe(true);
    expect(res.body.tags).toContain("testing");
    toolSlug = res.body.slug;
  });

  it("rejects publishing a tool with a duplicate name", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${publisherToken}`)
      .send({
        name: "Consumer Test Tool",
        category_id: "dev-tools",
        description: "Duplicate of the tool published above",
      });
    expect(res.status).toBe(409);
  });

  it("publisher profile now shows one published tool", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${publisherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.server_count).toBe(1);
  });
});

// ─── Chapter 4: Marketplace Browsing ─────────────────────────────────────────

describe("Chapter 4 – Marketplace Browsing", () => {
  it("lists tools with default pagination", async () => {
    const res = await request(app).get("/api/servers");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.servers)).toBe(true);
    expect(res.body).toHaveProperty("pagination");
    expect(res.body.pagination).toMatchObject({
      page: 1,
      limit: 20,
    });
  });

  it("caps limit at 100", async () => {
    const res = await request(app).get("/api/servers?limit=9999");
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(100);
  });

  it("finds the published tool by search", async () => {
    const res = await request(app).get("/api/servers?search=Consumer+Test+Tool");
    expect(res.status).toBe(200);
    expect(res.body.servers.length).toBeGreaterThan(0);
    const found = res.body.servers.find((s) => s.slug === toolSlug);
    expect(found).toBeDefined();
  });

  it("returns empty list for non-matching search term", async () => {
    const res = await request(app).get("/api/servers?search=zzznoresult99xyz");
    expect(res.status).toBe(200);
    expect(res.body.servers).toHaveLength(0);
  });

  it("filters tools by category", async () => {
    const res = await request(app).get("/api/servers?category=dev-tools");
    expect(res.status).toBe(200);
    const categories = res.body.servers.map((s) => s.category);
    categories.forEach((c) => expect(c).toBe("dev-tools"));
  });

  it("filters tools by price_type=free", async () => {
    const res = await request(app).get("/api/servers?price_type=free");
    expect(res.status).toBe(200);
    res.body.servers.forEach((s) => {
      expect(s.price_type).toBe("free");
    });
  });

  it("returns tool detail by slug", async () => {
    const res = await request(app).get(`/api/servers/${toolSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe(toolSlug);
    expect(res.body.name).toBe("Consumer Test Tool");
    expect(Array.isArray(res.body.reviews)).toBe(true);
  });

  it("returns 404 for unknown slug", async () => {
    const res = await request(app).get("/api/servers/this-slug-does-not-exist-ever");
    expect(res.status).toBe(404);
  });

  it("paginates results correctly", async () => {
    const p1 = await request(app).get("/api/servers?page=1&limit=1");
    expect(p1.status).toBe(200);
    expect(p1.body.pagination.limit).toBe(1);
    expect(p1.body.pagination.page).toBe(1);
  });

  it("sorts by newest", async () => {
    const res = await request(app).get("/api/servers?sort=newest");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.servers)).toBe(true);
  });
});

// ─── Chapter 5: Reviews ───────────────────────────────────────────────────────

describe("Chapter 5 – Reviews", () => {
  it("rejects review without authentication", async () => {
    const res = await request(app)
      .post(`/api/servers/${toolSlug}/reviews`)
      .send({ rating: 4, comment: "Anonymous review attempt" });
    expect(res.status).toBe(401);
  });

  it("rejects author reviewing own tool", async () => {
    const res = await request(app)
      .post(`/api/servers/${toolSlug}/reviews`)
      .set("Authorization", `Bearer ${publisherToken}`)
      .send({ rating: 5, comment: "Self-review should be blocked" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/own/i);
  });

  it("rejects invalid rating (out of range)", async () => {
    const res = await request(app)
      .post(`/api/servers/${toolSlug}/reviews`)
      .set("Authorization", `Bearer ${consumerToken}`)
      .send({ rating: 6 });
    expect(res.status).toBe(400);
  });

  it("rejects rating of 0", async () => {
    const res = await request(app)
      .post(`/api/servers/${toolSlug}/reviews`)
      .set("Authorization", `Bearer ${consumerToken}`)
      .send({ rating: 0 });
    expect(res.status).toBe(400);
  });

  it("allows consumer to review the tool", async () => {
    const res = await request(app)
      .post(`/api/servers/${toolSlug}/reviews`)
      .set("Authorization", `Bearer ${consumerToken}`)
      .send({ rating: 5, comment: "Excellent tool, worked perfectly in my pipeline!" });
    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(5);
    expect(res.body.comment).toBe("Excellent tool, worked perfectly in my pipeline!");
    expect(res.body).toHaveProperty("username");
  });

  it("rejects duplicate review from same consumer", async () => {
    const res = await request(app)
      .post(`/api/servers/${toolSlug}/reviews`)
      .set("Authorization", `Bearer ${consumerToken}`)
      .send({ rating: 3, comment: "Trying to submit a second review" });
    expect(res.status).toBe(409);
  });

  it("tool detail now includes the submitted review", async () => {
    const res = await request(app).get(`/api/servers/${toolSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.reviews.length).toBeGreaterThan(0);
    const review = res.body.reviews[0];
    expect(review.rating).toBe(5);
    // Rating should be recalculated
    expect(res.body.rating).toBeGreaterThan(0);
  });

  it("returns 404 for reviewing a non-existent tool", async () => {
    const res = await request(app)
      .post("/api/servers/ghost-tool-xyz/reviews")
      .set("Authorization", `Bearer ${consumerToken}`)
      .send({ rating: 3, comment: "Should 404" });
    expect(res.status).toBe(404);
  });
});

// ─── Chapter 6: Installs ──────────────────────────────────────────────────────

describe("Chapter 6 – Installs", () => {
  it("records an authenticated install (increments counter)", async () => {
    const res = await request(app)
      .post(`/api/servers/${toolSlug}/install`)
      .set("Authorization", `Bearer ${consumerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("rate-limits a second install from the same IP", async () => {
    const res = await request(app)
      .post(`/api/servers/${toolSlug}/install`)
      .set("Authorization", `Bearer ${consumerToken}`);
    expect(res.status).toBe(429);
  });

  it("returns 404 for installing a non-existent tool", async () => {
    const res = await request(app).post("/api/servers/ghost-tool-xyz/install");
    expect(res.status).toBe(404);
  });

  it("install count is reflected in tool detail", async () => {
    const res = await request(app).get(`/api/servers/${toolSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.installs).toBeGreaterThan(0);
  });

  it("publisher total_installs reflects recorded installs", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${publisherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total_installs).toBeGreaterThan(0);
  });
});

// ─── Chapter 7: Subscription Tiers ───────────────────────────────────────────

describe("Chapter 7 – Subscription Tiers", () => {
  it("rejects subscription without authentication", async () => {
    const res = await request(app)
      .post("/api/tiers/subscribe")
      .send({ tier: "pro" });
    expect(res.status).toBe(401);
  });

  it("rejects an invalid tier name", async () => {
    const res = await request(app)
      .post("/api/tiers/subscribe")
      .set("Authorization", `Bearer ${consumerToken}`)
      .send({ tier: "diamond-elite" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid tier/i);
  });

  it("consumer subscribing to pro is routed to Stripe Checkout", async () => {
    const res = await request(app)
      .post("/api/tiers/subscribe")
      .set("Authorization", `Bearer ${consumerToken}`)
      .send({ tier: "pro" });
    expect(res.status).toBe(200);
    expect(res.body.requires_payment).toBe(true);
    expect(res.body.tier).toBe("pro");
  });

  it("consumer upgrading to enterprise is routed to Stripe Checkout", async () => {
    const res = await request(app)
      .post("/api/tiers/subscribe")
      .set("Authorization", `Bearer ${consumerToken}`)
      .send({ tier: "enterprise" });
    expect(res.status).toBe(200);
    expect(res.body.requires_payment).toBe(true);
    expect(res.body.tier).toBe("enterprise");
  });

  it("publisher subscribing to pro is routed to Stripe Checkout", async () => {
    const res = await request(app)
      .post("/api/tiers/subscribe")
      .set("Authorization", `Bearer ${publisherToken}`)
      .send({ tier: "pro" });
    expect(res.status).toBe(200);
    expect(res.body.requires_payment).toBe(true);
    expect(res.body.tier).toBe("pro");
  });
});

// ─── Chapter 8: Platform Stats Reflect Activity ───────────────────────────────

describe("Chapter 8 – Stats Reflect Full Activity", () => {
  it("platform stats now show at least one publisher and one server", async () => {
    const res = await request(app).get("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body.server_count).toBeGreaterThanOrEqual(1);
    expect(res.body.publisher_count).toBeGreaterThanOrEqual(1);
  });

  it("review count reflects the review submitted in Chapter 5", async () => {
    const res = await request(app).get("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body.review_count).toBeGreaterThanOrEqual(1);
  });

  it("total_installs is positive after Chapter 6 activity", async () => {
    const res = await request(app).get("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body.total_installs).toBeGreaterThan(0);
  });

  it("average rating is populated after reviews", async () => {
    const res = await request(app).get("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body.avg_rating).toBeGreaterThan(0);
  });
});

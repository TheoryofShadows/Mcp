import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import db from "../db.js";
import { signToken } from "../middleware/auth.js";

// Helper: get a token for a seeded user
function tokenFor(username) {
  const user = db.prepare("SELECT id, email, username FROM users WHERE username = ?").get(username);
  if (!user) throw new Error(`Seed user "${username}" not found`);
  return signToken({ id: user.id, email: user.email, username: user.username });
}

function getUser(username) {
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username);
}

// ─── Health ───

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });
});

// ─── Auth ───

describe("Auth endpoints", () => {
  const unique = `test_${Date.now()}`;

  describe("POST /api/auth/register", () => {
    it("registers a new user", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: `${unique}@test.com`, username: unique, password: "secret123" });
      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe(unique);
      expect(res.body.user.tier).toBe("starter");
    });

    it("rejects duplicate email/username", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: `${unique}@test.com`, username: unique, password: "secret123" });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already taken/);
    });

    it("rejects missing fields", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "a@b.com" });
      expect(res.status).toBe(400);
    });

    it("rejects short password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "short@test.com", username: "shortpw", password: "ab" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/6 characters/);
    });

    it("rejects invalid email format", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "not-an-email", username: "validuser", password: "secret123" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email/i);
    });

    it("rejects invalid username characters", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "special@test.com", username: "bad user!", password: "secret123" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/letters, numbers/);
    });
  });

  describe("POST /api/auth/login", () => {
    it("logs in with correct credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "dev@mcpx.dev", password: "demo1234" });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe("demo");
    });

    it("rejects wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "dev@mcpx.dev", password: "wrongpass" });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Invalid credentials/);
    });

    it("rejects nonexistent email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "ghost@nowhere.com", password: "whatever" });
      expect(res.status).toBe(401);
    });

    it("rejects missing fields", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "dev@mcpx.dev" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns user profile with valid token", async () => {
      const token = tokenFor("demo");
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.username).toBe("demo");
      expect(res.body.server_count).toBeDefined();
      expect(res.body.total_installs).toBeDefined();
    });

    it("rejects request without token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("rejects invalid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalidtoken123");
      expect(res.status).toBe(401);
    });
  });
});

// ─── Categories ───

describe("GET /api/categories", () => {
  it("returns all categories with server counts", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const all = res.body.find((c) => c.id === "all");
    expect(all).toBeDefined();
    expect(all.count).toBeGreaterThan(0);
    // Each category should have id, label, icon, count
    for (const cat of res.body) {
      expect(cat).toHaveProperty("id");
      expect(cat).toHaveProperty("label");
      expect(cat).toHaveProperty("icon");
      expect(typeof cat.count).toBe("number");
    }
  });
});

// ─── Stats ───

describe("GET /api/stats", () => {
  it("returns platform statistics", async () => {
    const res = await request(app).get("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body.server_count).toBeGreaterThan(0);
    expect(res.body.total_installs).toBeGreaterThan(0);
    expect(res.body.publisher_count).toBeGreaterThan(0);
    expect(res.body.hero_stats).toHaveLength(3);
    expect(typeof res.body.avg_rating).toBe("number");
  });
});

// ─── Servers ───

describe("Servers endpoints", () => {
  describe("GET /api/servers", () => {
    it("returns paginated server list", async () => {
      const res = await request(app).get("/api/servers?page=1&limit=3");
      expect(res.status).toBe(200);
      expect(res.body.servers).toHaveLength(3);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(3);
      expect(res.body.pagination.total).toBeGreaterThan(0);
    });

    it("filters by category", async () => {
      const res = await request(app).get("/api/servers?category=data");
      expect(res.status).toBe(200);
      for (const s of res.body.servers) {
        expect(s.category).toBe("data");
      }
    });

    it("searches by name/description", async () => {
      const res = await request(app).get("/api/servers?search=postgres");
      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBeGreaterThan(0);
      expect(res.body.servers[0].name.toLowerCase()).toContain("postgres");
    });

    it("filters by verified", async () => {
      const res = await request(app).get("/api/servers?verified=true");
      expect(res.status).toBe(200);
      for (const s of res.body.servers) {
        expect(s.verified).toBe(true);
      }
    });

    it("filters by trending", async () => {
      const res = await request(app).get("/api/servers?trending=true");
      expect(res.status).toBe(200);
      for (const s of res.body.servers) {
        expect(s.trending).toBe(true);
      }
    });

    it("filters by price_type=free", async () => {
      const res = await request(app).get("/api/servers?price_type=free");
      expect(res.status).toBe(200);
      for (const s of res.body.servers) {
        expect(s.price_type).toBe("free");
      }
    });

    it("sorts by rating descending", async () => {
      const res = await request(app).get("/api/servers?sort=rating");
      expect(res.status).toBe(200);
      const ratings = res.body.servers.map((s) => s.rating);
      for (let i = 1; i < ratings.length; i++) {
        expect(ratings[i]).toBeLessThanOrEqual(ratings[i - 1]);
      }
    });

    it("sorts by newest", async () => {
      const res = await request(app).get("/api/servers?sort=newest");
      expect(res.status).toBe(200);
      expect(res.body.servers.length).toBeGreaterThan(0);
    });

    it("returns empty for no-match search", async () => {
      const res = await request(app).get("/api/servers?search=xyznonexistent99999");
      expect(res.status).toBe(200);
      expect(res.body.servers).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
    });

    it("clamps page and limit to valid ranges", async () => {
      const res = await request(app).get("/api/servers?page=-1&limit=999");
      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(100);
    });
  });

  describe("GET /api/servers/:slug", () => {
    it("returns server detail with reviews", async () => {
      const res = await request(app).get("/api/servers/postgres-mcp");
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Postgres MCP");
      expect(res.body.slug).toBe("postgres-mcp");
      expect(Array.isArray(res.body.reviews)).toBe(true);
      expect(Array.isArray(res.body.tags)).toBe(true);
      expect(typeof res.body.verified).toBe("boolean");
    });

    it("returns 404 for nonexistent slug", async () => {
      const res = await request(app).get("/api/servers/nonexistent-slug-9999");
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  describe("POST /api/servers", () => {
    it("creates a server with valid data", async () => {
      const token = tokenFor("demo");
      const res = await request(app)
        .post("/api/servers")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: `Test Server ${Date.now()}`,
          category_id: "ai",
          description: "A test server for automated testing purposes",
          tags: ["test", "vitest"],
        });
      expect(res.status).toBe(201);
      expect(res.body.slug).toBeDefined();
      expect(res.body.tags).toContain("test");
      // Clean up
      db.prepare("DELETE FROM servers WHERE id = ?").run(res.body.id);
    });

    it("rejects without authentication", async () => {
      const res = await request(app)
        .post("/api/servers")
        .send({ name: "NoAuth", category_id: "ai", description: "Should fail without auth token" });
      expect(res.status).toBe(401);
    });

    it("rejects missing required fields", async () => {
      const token = tokenFor("demo");
      const res = await request(app)
        .post("/api/servers")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Missing fields" });
      expect(res.status).toBe(400);
    });

    it("rejects description too short", async () => {
      const token = tokenFor("demo");
      const res = await request(app)
        .post("/api/servers")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Short Desc", category_id: "ai", description: "Too short" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Description/);
    });

    it("rejects invalid category", async () => {
      const token = tokenFor("demo");
      const res = await request(app)
        .post("/api/servers")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Bad Cat", category_id: "nonexistent", description: "Valid description that is long enough" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/category/i);
    });

    it("rejects 'all' as category", async () => {
      const token = tokenFor("demo");
      const res = await request(app)
        .post("/api/servers")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "All Cat", category_id: "all", description: "Valid description that is long enough" });
      expect(res.status).toBe(400);
    });

    it("parses price_amount as integer when sent as string", async () => {
      const token = tokenFor("demo");
      const res = await request(app)
        .post("/api/servers")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: `Price Test ${Date.now()}`,
          category_id: "ai",
          description: "Testing price amount type coercion from string",
          price_type: "paid",
          price_amount: "1500",
        });
      expect(res.status).toBe(201);
      expect(res.body.price_amount).toBe(1500);
      expect(res.body.price).toBe("$15/mo");
      db.prepare("DELETE FROM servers WHERE id = ?").run(res.body.id);
    });
  });

  describe("POST /api/servers/:slug/reviews", () => {
    it("creates a review", async () => {
      // Use a user who hasn't reviewed stripe-agent yet
      const token = tokenFor("demo");
      const res = await request(app)
        .post("/api/servers/stripe-agent/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({ rating: 4, comment: "Vitest review" });
      expect(res.status).toBe(201);
      expect(res.body.rating).toBe(4);
      expect(res.body.username).toBe("demo");
      // Clean up
      db.prepare("DELETE FROM reviews WHERE id = ?").run(res.body.id);
    });

    it("prevents self-review", async () => {
      const token = tokenFor("sarahchen");
      const res = await request(app)
        .post("/api/servers/postgres-mcp/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({ rating: 5, comment: "Self review" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/own server/);
    });

    it("rejects invalid rating", async () => {
      const token = tokenFor("demo");
      const res = await request(app)
        .post("/api/servers/figma-bridge/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({ rating: 6 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Rating/);
    });

    it("rejects non-integer rating", async () => {
      const token = tokenFor("demo");
      const res = await request(app)
        .post("/api/servers/figma-bridge/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({ rating: 3.5 });
      expect(res.status).toBe(400);
    });

    it("rejects review on nonexistent server", async () => {
      const token = tokenFor("demo");
      const res = await request(app)
        .post("/api/servers/nonexistent-slug/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({ rating: 5 });
      expect(res.status).toBe(404);
    });

    it("rejects without authentication", async () => {
      const res = await request(app)
        .post("/api/servers/postgres-mcp/reviews")
        .send({ rating: 5 });
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/servers/:slug/install", () => {
    it("records an install", async () => {
      const res = await request(app)
        .post("/api/servers/figma-bridge/install");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 404 for nonexistent server", async () => {
      const res = await request(app)
        .post("/api/servers/nonexistent-slug/install");
      expect(res.status).toBe(404);
    });
  });
});

// ─── Tiers ───

describe("Tiers endpoints", () => {
  describe("GET /api/tiers", () => {
    it("returns pricing tiers, projections, and tech stack", async () => {
      const res = await request(app).get("/api/tiers");
      expect(res.status).toBe(200);
      expect(res.body.tiers).toHaveLength(3);
      expect(res.body.revenue_projections.length).toBeGreaterThan(0);
      expect(res.body.tech_stack.length).toBeGreaterThan(0);
      // Verify tier structure
      const pro = res.body.tiers.find((t) => t.id === "pro");
      expect(pro).toBeDefined();
      expect(pro.popular).toBe(true);
      expect(pro.price_amount).toBe(2900);
    });
  });

  describe("POST /api/tiers/subscribe", () => {
    it("subscribes to a valid tier", async () => {
      const token = tokenFor("demo");
      const res = await request(app)
        .post("/api/tiers/subscribe")
        .set("Authorization", `Bearer ${token}`)
        .send({ tier: "pro" });
      expect(res.status).toBe(201);
      expect(res.body.subscription.tier).toBe("pro");
      expect(res.body.subscription.status).toBe("active");
      expect(res.body.message).toContain("Pro Publisher");
      // Verify user tier was updated
      const user = getUser("demo");
      expect(user.tier).toBe("pro");
      // Reset
      db.prepare("UPDATE users SET tier = 'starter' WHERE username = 'demo'").run();
      db.prepare("DELETE FROM subscriptions WHERE user_id = ?").run(user.id);
    });

    it("rejects invalid tier", async () => {
      const token = tokenFor("demo");
      const res = await request(app)
        .post("/api/tiers/subscribe")
        .set("Authorization", `Bearer ${token}`)
        .send({ tier: "ultra_mega" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid tier/);
    });

    it("rejects without authentication", async () => {
      const res = await request(app)
        .post("/api/tiers/subscribe")
        .send({ tier: "pro" });
      expect(res.status).toBe(401);
    });
  });
});

// ─── Error handling ───

describe("Error handling", () => {
  it("returns 400 for malformed JSON body", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{ invalid json }}}");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid JSON/);
  });
});

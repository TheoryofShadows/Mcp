import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { cleanup, db } from "./setup.js";
import { createApp } from "../server/app.js";

const app = createApp();

afterAll(cleanup);

describe("token revocation — POST /api/auth/logout", () => {
  let token;

  beforeAll(async () => {
    const reg = await request(app).post("/api/auth/register").send({
      email: "revoke@example.com", username: "revokeuser", password: "testpassword",
    });
    token = reg.body.token;
  });

  it("accepts the token before logout", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("logs the user out", async () => {
    const res = await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("rejects the same token after logout", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("requires auth to log out", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(401);
  });
});

describe("persistent audit log", () => {
  it("records a failed login attempt", async () => {
    await request(app).post("/api/auth/register").send({
      email: "audit@example.com", username: "audituser", password: "testpassword",
    });
    await request(app).post("/api/auth/login").send({
      email: "audit@example.com", password: "wrong-password-here",
    });
    const row = db.prepare(
      "SELECT * FROM audit_events WHERE action = 'auth.login.failed' ORDER BY id DESC LIMIT 1"
    ).get();
    expect(row).toBeTruthy();
    expect(JSON.parse(row.details).reason).toBe("bad_password");
  });

  it("records a logout in the audit trail", async () => {
    const reg = await request(app).post("/api/auth/register").send({
      email: "audit2@example.com", username: "audituser2", password: "testpassword",
    });
    await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${reg.body.token}`);
    const count = db.prepare("SELECT COUNT(*) c FROM audit_events WHERE action = 'auth.logout'").get().c;
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

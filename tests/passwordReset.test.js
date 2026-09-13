import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { db } from "./setup.js";
import { createApp } from "../server/app.js";

/**
 * There was no recovery path at all — a forgotten password meant a permanently
 * lost account. For a marketplace that means a buyer locked out of tools they
 * paid for, with no way back.
 *
 * Production must NOT return reset_token in the HTTP body (knowing an email is
 * not proof of account ownership). Tests that exercise the token path opt in
 * via ALLOW_INLINE_RESET_TOKEN=1 — the same break-glass used for local recovery
 * until a mailer delivers the token out-of-band.
 */
const app = createApp();
const EMAIL = "resetme@example.com";
const OLD = "originalpass1";
const NEW = "brandnewpass1";

beforeAll(async () => {
  await request(app).post("/api/auth/register").send({
    email: EMAIL, username: "resetme", password: OLD,
  });
});

describe("password reset default (no inline token)", () => {
  it("does not return reset_token and keeps response shapes identical", async () => {
    const prev = process.env.ALLOW_INLINE_RESET_TOKEN;
    process.env.ALLOW_INLINE_RESET_TOKEN = "0";
    try {
      const known = await request(app).post("/api/auth/password/request").send({ email: EMAIL });
      const unknown = await request(app).post("/api/auth/password/request").send({
        email: "still-nobody@example.com",
      });
      expect(known.status).toBe(200);
      expect(unknown.status).toBe(200);
      expect(known.body.message).toBe(unknown.body.message);
      expect(known.body.reset_token).toBeUndefined();
      expect(unknown.body.reset_token).toBeUndefined();
      expect(db.prepare("SELECT COUNT(*) c FROM password_resets").get().c).toBeGreaterThan(0);
    } finally {
      process.env.ALLOW_INLINE_RESET_TOKEN = prev;
    }
  });
});

describe("password reset (inline token opt-in)", () => {
  beforeAll(() => {
    process.env.ALLOW_INLINE_RESET_TOKEN = "1";
  });

  it("issues a token for a real account", async () => {
    const res = await request(app).post("/api/auth/password/request").send({ email: EMAIL });
    expect(res.status).toBe(200);
    expect(res.body.reset_token).toBeTruthy();
  });

  it("uses the same message for known and unknown emails", async () => {
    const known = await request(app).post("/api/auth/password/request").send({ email: EMAIL });
    const unknown = await request(app).post("/api/auth/password/request").send({ email: "nobody@example.com" });
    expect(unknown.status).toBe(known.status);
    expect(unknown.body.message).toBe(known.body.message);
    // Inline mode still omits the field for unknown emails; default mode
    // (tested above) keeps both responses token-free and identical.
    expect(unknown.body.reset_token).toBeUndefined();
  });

  it("stores only a HASH of the token", async () => {
    const res = await request(app).post("/api/auth/password/request").send({ email: EMAIL });
    const raw = res.body.reset_token;
    // A leaked database must not hand out working reset links.
    const stored = db.prepare("SELECT token_hash FROM password_resets WHERE token_hash = ?").get(raw);
    expect(stored).toBeUndefined();
    expect(db.prepare("SELECT COUNT(*) c FROM password_resets").get().c).toBeGreaterThan(0);
  });

  it("actually changes the password", async () => {
    const req1 = await request(app).post("/api/auth/password/request").send({ email: EMAIL });
    const done = await request(app).post("/api/auth/password/reset")
      .send({ token: req1.body.reset_token, password: NEW });
    expect(done.status).toBe(200);

    const oldLogin = await request(app).post("/api/auth/login").send({ email: EMAIL, password: OLD });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post("/api/auth/login").send({ email: EMAIL, password: NEW });
    expect(newLogin.status).toBe(200);
  });

  it("refuses to reuse a token", async () => {
    const r = await request(app).post("/api/auth/password/request").send({ email: EMAIL });
    const t = r.body.reset_token;
    await request(app).post("/api/auth/password/reset").send({ token: t, password: "secondpass123" });
    const again = await request(app).post("/api/auth/password/reset").send({ token: t, password: "thirdpass1234" });
    expect(again.status).toBe(400);
  });

  it("rejects an expired token", async () => {
    const r = await request(app).post("/api/auth/password/request").send({ email: EMAIL });
    db.prepare("UPDATE password_resets SET expires_at = ? WHERE used_at IS NULL")
      .run(new Date(Date.now() - 60_000).toISOString());
    const res = await request(app).post("/api/auth/password/reset")
      .send({ token: r.body.reset_token, password: "expiredpass12" });
    expect(res.status).toBe(400);
  });

  it("gives the same message for wrong, used and expired tokens", async () => {
    const bogus = await request(app).post("/api/auth/password/reset")
      .send({ token: "not-a-real-token", password: "whateverpass1" });
    expect(bogus.status).toBe(400);
    expect(bogus.body.error).toMatch(/invalid or has expired/i);
  });

  it("enforces the same password floor as registration", async () => {
    const r = await request(app).post("/api/auth/password/request").send({ email: EMAIL });
    const res = await request(app).post("/api/auth/password/reset")
      .send({ token: r.body.reset_token, password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 10 characters/);
  });

  it("invalidates an older outstanding token when a new one is requested", async () => {
    const first = await request(app).post("/api/auth/password/request").send({ email: EMAIL });
    await request(app).post("/api/auth/password/request").send({ email: EMAIL });
    const res = await request(app).post("/api/auth/password/reset")
      .send({ token: first.body.reset_token, password: "supersededpw1" });
    expect(res.status).toBe(400);
  });
});

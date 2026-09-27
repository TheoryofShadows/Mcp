import { describe, it, expect, afterAll, afterEach } from "vitest";
import request from "supertest";
import { cleanup } from "./setup.js";
import { createApp } from "../server/app.js";

const app = createApp();

afterAll(cleanup);

const PASS = "securepass1";

function setCookie(res) {
  const raw = res.headers["set-cookie"];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.find((c) => c.startsWith("mcpx_token=")) || "";
}

function cookiePair(header) {
  return header.split(";")[0];
}

describe("browser session cookie", () => {
  const original = process.env.CANONICAL_HOST;
  afterEach(() => {
    if (original === undefined) delete process.env.CANONICAL_HOST;
    else process.env.CANONICAL_HOST = original;
  });

  it("gives non-browser clients the token and an HttpOnly cookie", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "cookie-cli@example.com",
      username: "cookiecli",
      password: PASS,
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    const cookie = setCookie(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/Domain=/i);
    expect(cookie).not.toMatch(/__Host-/);
  });

  it("hides the token from a browser and authenticates the cookie", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("Host", "127.0.0.1")
      .send({ email: "cookie-cli@example.com", password: PASS });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeUndefined();
    expect(res.body.user.email).toBe("cookie-cli@example.com");

    const me = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookiePair(setCookie(res)));
    expect(me.status).toBe(200);
    expect(me.body.email).toBe("cookie-cli@example.com");
  });

  it("still returns a token to a browser that explicitly asks, for the CLI", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("X-MCPX-Issue-Token", "1")
      .send({ email: "cookie-cli@example.com", password: PASS });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it("revokes the cookie session on logout", async () => {
    const login = await request(app).post("/api/auth/login").send({
      email: "cookie-cli@example.com",
      password: PASS,
    });
    const pair = cookiePair(setCookie(login));
    const out = await request(app).post("/api/auth/logout").set("Cookie", pair);
    expect(out.status).toBe(200);
    expect(setCookie(out)).toMatch(/mcpx_token=;/);
    const me = await request(app).get("/api/auth/me").set("Cookie", pair);
    expect(me.status).toBe(401);
  });

  it("refuses a foreign origin", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "https://evil.example")
      .send({ email: "cookie-cli@example.com", password: PASS });
    expect(res.status).toBe(403);
    expect(setCookie(res)).toBe("");
    expect(res.body.token).toBeUndefined();
  });

  it("does not set a browser cookie on the non-canonical host", async () => {
    process.env.CANONICAL_HOST = "www.mcpx.digital";
    const browser = await request(app)
      .post("/api/auth/login")
      .set("Host", "mcpx.digital")
      .set("Origin", "https://mcpx.digital")
      .send({ email: "cookie-cli@example.com", password: PASS });
    expect(browser.status).toBe(400);
    expect(setCookie(browser)).toBe("");
    expect(browser.body.token).toBeUndefined();

    const cli = await request(app)
      .post("/api/auth/login")
      .set("Host", "mcpx.digital")
      .send({ email: "cookie-cli@example.com", password: PASS });
    expect(cli.status).toBe(200);
    expect(cli.body.token).toBeTruthy();
    expect(setCookie(cli)).toBe("");
  });
});

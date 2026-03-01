import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { cleanup } from "./setup.js";
import { createApp } from "../server/app.js";

const app = createApp();

afterAll(cleanup);

describe("POST /api/auth/register", () => {
  it("registers a new user successfully", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "testuser@example.com",
      username: "testuser",
      password: "securepass",
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toMatchObject({
      email: "testuser@example.com",
      username: "testuser",
      tier: "starter",
    });
    expect(res.body.user).not.toHaveProperty("password_hash");
  });

  it("rejects duplicate email", async () => {
    await request(app).post("/api/auth/register").send({
      email: "dup@example.com",
      username: "dupuser1",
      password: "securepass",
    });
    const res = await request(app).post("/api/auth/register").send({
      email: "dup@example.com",
      username: "dupuser2",
      password: "securepass",
    });
    expect(res.status).toBe(409);
  });

  it("rejects short password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "short@example.com",
      username: "shortpassuser",
      password: "abc",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  it("rejects invalid email format", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      username: "bademail",
      password: "validpass",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it("rejects username with invalid characters", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "valid@example.com",
      username: "bad username!",
      password: "validpass",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/username/i);
  });

  it("rejects missing required fields", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "nousername@example.com",
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    await request(app).post("/api/auth/register").send({
      email: "logintest@example.com",
      username: "logintest",
      password: "mypassword",
    });
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "logintest@example.com",
      password: "mypassword",
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe("logintest@example.com");
  });

  it("rejects wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "logintest@example.com",
      password: "wrongpassword",
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it("rejects non-existent email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@example.com",
      password: "somepassword",
    });
    expect(res.status).toBe(401);
  });

  it("rejects missing fields", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "logintest@example.com" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  let token;

  beforeAll(async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "metest@example.com",
      username: "metest",
      password: "mepassword",
    });
    token = res.body.token;
  });

  it("returns current user with valid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("metest@example.com");
    expect(res.body).toHaveProperty("server_count");
    expect(res.body).toHaveProperty("total_installs");
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid.token.here");
    expect(res.status).toBe(401);
  });
});

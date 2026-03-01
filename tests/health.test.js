import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { cleanup } from "./setup.js";
import { createApp } from "../server/app.js";

const app = createApp();

afterAll(cleanup);

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body).toHaveProperty("timestamp");
  });
});

describe("GET /api/categories", () => {
  it("returns categories list", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/stats", () => {
  it("returns platform stats", async () => {
    const res = await request(app).get("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("server_count");
    expect(res.body).toHaveProperty("total_installs");
    expect(res.body).toHaveProperty("publisher_count");
  });
});

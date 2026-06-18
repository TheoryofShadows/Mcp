import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../server/app.js";

// Enable trust proxy so X-Forwarded-For becomes req.ip — this lets each test
// use its own rate-limit bucket (the limiter keys on req.ip, which is module
// state shared across the file).
const app = createApp();
app.set("trust proxy", true);

const fromIp = (n) => ({ "X-Forwarded-For": `203.0.113.${n}` });

describe("/api/scan route — error & guard branches (no network)", () => {
  it("400 when repo_url is missing", async () => {
    const res = await request(app).post("/api/scan").set(fromIp(1)).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/repo_url/i);
  });

  it("400 for an unparseable URL (rejected before any clone)", async () => {
    const res = await request(app).post("/api/scan").set(fromIp(2)).send({ repo_url: "not a url" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid|public/i);
  });

  it("400 for an unsupported host", async () => {
    const res = await request(app).post("/api/scan").set(fromIp(3)).send({ repo_url: "https://evil.example.com/a/b" });
    expect(res.status).toBe(400);
  });

  it("accepts the repoUrl alias and still validates it", async () => {
    const res = await request(app).post("/api/scan").set(fromIp(4)).send({ repoUrl: "ftp://github.com/a/b" });
    expect(res.status).toBe(400); // ftp scheme is not an allowed repo host
  });

  it("GET /:owner/:repo with a disallowed ?host returns 400", async () => {
    const res = await request(app).get("/api/scan/owner/repo").query({ host: "evil.example.com" }).set(fromIp(5));
    expect(res.status).toBe(400);
  });

  it("rate-limits a single IP after the per-window budget (429)", async () => {
    const headers = fromIp(99);
    const codes = [];
    for (let i = 0; i < 9; i++) {
      const res = await request(app).post("/api/scan").set(headers).send({ repo_url: "not a url" });
      codes.push(res.status);
    }
    // First 8 pass the limiter (and 400 on the bad URL); the 9th trips it.
    expect(codes.slice(0, 8)).toEqual(Array(8).fill(400));
    expect(codes[8]).toBe(429);
  });
});

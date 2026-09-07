import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import {
  referrerHost,
  isTrackablePath,
  recordView,
  summary,
  pruneViews,
} from "../server/lib/analytics.js";
import { db, cleanup } from "./setup.js";
import { createApp } from "../server/app.js";

describe("analytics / referrerHost", () => {
  it("reduces a full referrer URL to a bare host, dropping path + query", () => {
    expect(referrerHost("https://example.com/some/path?utm=abc")).toBe("example.com");
  });
  it("strips www.", () => {
    expect(referrerHost("https://www.example.com/")).toBe("example.com");
  });
  it("normalizes known aggregators", () => {
    expect(referrerHost("https://old.reddit.com/r/mcp/comments/x")).toBe("reddit.com");
    expect(referrerHost("https://t.co/abc123")).toBe("twitter.com");
    expect(referrerHost("https://news.ycombinator.com/item?id=1")).toBe("news.ycombinator.com");
  });
  it("returns null for missing / unparseable referrers", () => {
    expect(referrerHost("")).toBeNull();
    expect(referrerHost(null)).toBeNull();
    expect(referrerHost("not a url")).toBeNull();
  });
});

describe("analytics / isTrackablePath", () => {
  it("counts real page navigations", () => {
    expect(isTrackablePath("/")).toBe(true);
    expect(isTrackablePath("/tool/stripe-mcp")).toBe(true);
    expect(isTrackablePath("/marketplace")).toBe(true);
  });
  it("ignores API calls and static assets", () => {
    expect(isTrackablePath("/api/servers")).toBe(false);
    expect(isTrackablePath("/assets/index-abc123.js")).toBe(false);
    expect(isTrackablePath("/favicon.ico")).toBe(false);
    expect(isTrackablePath("")).toBe(false);
  });
});

describe("analytics / recordView + summary (DB-backed)", () => {
  beforeEach(() => {
    db.prepare("DELETE FROM page_views").run();
  });
  afterAll(async () => {
    db.prepare("DELETE FROM page_views").run();
  });

  it("records a trackable view and rejects an untrackable one", () => {
    expect(recordView(db, { path: "/", referer: "https://news.ycombinator.com/item?id=1" })).toBe(true);
    expect(recordView(db, { path: "/api/health", referer: null })).toBe(false);
    const n = db.prepare("SELECT COUNT(*) AS n FROM page_views").get().n;
    expect(n).toBe(1);
  });

  it("summary attributes traffic to the right referrer sources", () => {
    recordView(db, { path: "/", referer: "https://news.ycombinator.com/item?id=1" });
    recordView(db, { path: "/", referer: "https://old.reddit.com/r/mcp" });
    recordView(db, { path: "/tool/x", referer: "https://old.reddit.com/r/mcp" });
    recordView(db, { path: "/", referer: null }); // direct

    const s = summary(db, 30);
    expect(s.total_views).toBe(4);
    const bySource = Object.fromEntries(s.top_referrers.map((r) => [r.source, r.views]));
    expect(bySource["reddit.com"]).toBe(2);
    expect(bySource["news.ycombinator.com"]).toBe(1);
    expect(bySource["direct / none"]).toBe(1);
    // top page is "/"
    expect(s.top_pages[0].path).toBe("/");
    expect(s.top_pages[0].views).toBe(3);
  });

  it("pruneViews removes rows past the retention window", () => {
    recordView(db, { path: "/", referer: null });
    db.prepare("UPDATE page_views SET created_at = datetime('now', '-200 days')").run();
    const removed = pruneViews(db);
    expect(removed).toBe(1);
    expect(db.prepare("SELECT COUNT(*) AS n FROM page_views").get().n).toBe(0);
  });
});

describe("GET /api/stats/traffic (private, token-gated)", () => {
  const app = createApp();
  const TOKEN = "test-analytics-secret";

  beforeEach(() => {
    process.env.ANALYTICS_TOKEN = TOKEN;
    db.prepare("DELETE FROM page_views").run();
    recordView(db, { path: "/", referer: "https://news.ycombinator.com/item?id=1" });
  });
  afterAll(async () => {
    delete process.env.ANALYTICS_TOKEN;
    db.prepare("DELETE FROM page_views").run();
    await cleanup();
  });

  it("returns the summary with a valid token", async () => {
    const res = await request(app).get("/api/stats/traffic").query({ token: TOKEN });
    expect(res.status).toBe(200);
    expect(res.body.total_views).toBe(1);
    expect(res.body.top_referrers[0].source).toBe("news.ycombinator.com");
  });

  it("accepts the token via header too", async () => {
    const res = await request(app).get("/api/stats/traffic").set("x-analytics-token", TOKEN);
    expect(res.status).toBe(200);
  });

  it("rejects a missing or wrong token", async () => {
    expect((await request(app).get("/api/stats/traffic")).status).toBe(401);
    expect((await request(app).get("/api/stats/traffic").query({ token: "nope" })).status).toBe(401);
  });

  it("returns 503 when ANALYTICS_TOKEN is unset (closed by default)", async () => {
    delete process.env.ANALYTICS_TOKEN;
    const res = await request(app).get("/api/stats/traffic").query({ token: "anything" });
    expect(res.status).toBe(503);
  });
});

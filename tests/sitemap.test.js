import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { cleanup } from "./setup.js";
import { createApp } from "../server/app.js";

const app = createApp();

let token;
beforeAll(async () => {
  const reg = await request(app).post("/api/auth/register").send({
    email: "sitemap@example.com",
    username: "sitemappub",
    password: "sitemappassword1",
  });
  token = reg.body.token;
  await request(app).post("/api/servers").set("Authorization", `Bearer ${token}`).send({
    name: "Sitemap Tool Server",
    category_id: "dev-tools",
    description: "Ensures active tool URLs appear in /sitemap.xml.",
    repo_url: "https://github.com/example/sitemap-tool",
    tags: ["dev"],
  });
});
afterAll(cleanup);

describe("GET /sitemap.xml", () => {
  it("returns xml with key routes and active tool detail URLs", async () => {
    const res = await request(app).get("/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/xml/);
    expect(res.text).toContain("<urlset");
    expect(res.text).toContain("https://www.mcpx.digital/");
    expect(res.text).toContain("https://www.mcpx.digital/marketplace");
    expect(res.text).toContain("https://www.mcpx.digital/pricing");
    expect(res.text).toContain("https://www.mcpx.digital/submit");
    expect(res.text).toContain("https://www.mcpx.digital/docs");
    expect(res.text).toContain("https://www.mcpx.digital/tool/sitemap-tool-server");
  });
});

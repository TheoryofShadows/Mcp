import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { cleanup } from "./setup.js";
import { createApp } from "../server/app.js";

const app = createApp();

let token;
beforeAll(async () => {
  const reg = await request(app).post("/api/auth/register").send({
    email: "disc@example.com", username: "discpublisher", password: "discpassword",
  });
  token = reg.body.token;
  await request(app).post("/api/servers").set("Authorization", `Bearer ${token}`).send({
    name: "Discover Feed Server", category_id: "dev-tools",
    description: "A server to verify the discovery feed output shape.",
    repo_url: "https://github.com/example/disc", tags: ["dev"],
  });
});
afterAll(cleanup);

describe("GET /api/discover", () => {
  it("returns an agent-readable feed with trust + url fields", async () => {
    const res = await request(app).get("/api/discover");
    expect(res.status).toBe(200);
    expect(res.body.feed).toBe("mcpx-discover");
    expect(Array.isArray(res.body.servers)).toBe(true);
    const s = res.body.servers.find((x) => x.slug === "discover-feed-server");
    expect(s).toBeTruthy();
    expect(s.url).toContain("/tool/discover-feed-server");
    expect(s.trust).toHaveProperty("score");
    expect(s.trust).toHaveProperty("tier");
  });

  it("respects the limit parameter", async () => {
    const res = await request(app).get("/api/discover?limit=1");
    expect(res.status).toBe(200);
    expect(res.body.servers.length).toBeLessThanOrEqual(1);
  });
});

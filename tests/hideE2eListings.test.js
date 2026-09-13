import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { cleanup, backdateUser } from "./setup.js";
import { createApp } from "../server/app.js";

const app = createApp();

let token;
let e2eSlug;
let realSlug;

beforeAll(async () => {
  const reg = await request(app).post("/api/auth/register").send({
    email: "e2ehide@example.com",
    username: "e2ehider",
    password: "e2ehidepassword1",
  });
  token = reg.body.token;
  backdateUser("e2ehide@example.com");

  const e2e = await request(app)
    .post("/api/servers")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "MCPX Flow Test Tool",
      category_id: "dev-tools",
      description: "Temporary E2E listing to verify publish marketplace install.",
      tags: ["test", "e2e"],
    });
  expect(e2e.status).toBe(201);
  e2eSlug = e2e.body.slug;

  const real = await request(app)
    .post("/api/servers")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Real Buyer Tool",
      category_id: "dev-tools",
      description: "A normal listing that should stay visible to buyers.",
      tags: ["dev"],
    });
  expect(real.status).toBe(201);
  realSlug = real.body.slug;
});

afterAll(cleanup);

describe("public discovery hides e2e fixtures", () => {
  it("omits e2e-tagged tools from GET /api/servers", async () => {
    const res = await request(app).get("/api/servers?limit=100");
    expect(res.status).toBe(200);
    const slugs = res.body.servers.map((s) => s.slug);
    expect(slugs).not.toContain(e2eSlug);
    expect(slugs).toContain(realSlug);
  });

  it("omits e2e-tagged tools from GET /api/discover", async () => {
    const res = await request(app).get("/api/discover");
    expect(res.status).toBe(200);
    const slugs = res.body.servers.map((s) => s.slug);
    expect(slugs).not.toContain(e2eSlug);
    expect(slugs).toContain(realSlug);
  });

  it("omits e2e-tagged tools from /sitemap.xml", async () => {
    const res = await request(app).get("/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.text).not.toContain(`/tool/${e2eSlug}`);
    expect(res.text).toContain(`/tool/${realSlug}`);
  });

  it("still returns the e2e tool by slug for the publisher", async () => {
    const res = await request(app)
      .get(`/api/servers/${e2eSlug}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe(e2eSlug);
  });

  it("maps infra/deploy tags to buyer-facing capabilities", async () => {
    const created = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Railway Style Infra",
        category_id: "dev-tools",
        description: "Infra listing used to verify capability derivation for buyers.",
        tags: ["railway", "deployment", "infra"],
      });
    expect(created.status).toBe(201);
    const res = await request(app).get(`/api/servers/${created.body.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.capabilities).toEqual(
      expect.arrayContaining(["network_access", "remote_code_execution"])
    );
    expect(res.body.risk_level).toBeTruthy();
  });
});

import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../server/app.js";

// The apex and www both answer on production. Without a canonical redirect
// Google indexes two complete copies of the site and splits ranking signals.
describe("canonical host redirect", () => {
  const original = process.env.CANONICAL_HOST;
  afterEach(() => {
    if (original === undefined) delete process.env.CANONICAL_HOST;
    else process.env.CANONICAL_HOST = original;
  });

  const appWith = (host) => {
    process.env.CANONICAL_HOST = host;
    return createApp();
  };

  it("301s a non-canonical host to the canonical one, preserving the path", async () => {
    const res = await request(appWith("www.mcpx.digital"))
      .get("/marketplace?q=files")
      .set("Host", "mcpx.digital");
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("https://www.mcpx.digital/marketplace?q=files");
  });

  it("leaves the canonical host alone", async () => {
    const res = await request(appWith("www.mcpx.digital"))
      .get("/api/health")
      .set("Host", "www.mcpx.digital");
    expect(res.status).toBe(200);
  });

  // A 301 on a webhook turns a delivered Stripe event into a lost sale.
  it("never redirects /api, even on a non-canonical host", async () => {
    const res = await request(appWith("www.mcpx.digital"))
      .get("/api/health")
      .set("Host", "mcpx.digital");
    expect(res.status).toBe(200);
  });

  it("does not redirect non-GET requests", async () => {
    const res = await request(appWith("www.mcpx.digital"))
      .post("/api/auth/login")
      .set("Host", "mcpx.digital")
      .send({ email: "nobody@example.com", password: "wrongpassword" });
    expect(res.status).not.toBe(301);
  });

  it("is inert when CANONICAL_HOST is unset (local dev, tests)", async () => {
    delete process.env.CANONICAL_HOST;
    const res = await request(createApp()).get("/api/health").set("Host", "localhost");
    expect(res.status).toBe(200);
  });

  it("tolerates a pasted scheme and trailing slash in the env value", async () => {
    const res = await request(appWith("https://www.mcpx.digital/"))
      .get("/pricing")
      .set("Host", "mcpx.digital");
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("https://www.mcpx.digital/pricing");
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { cleanup, db } from "./setup.js";
import { createApp } from "../server/app.js";

const app = createApp();

let token;
beforeAll(async () => {
  const reg = await request(app).post("/api/auth/register").send({
    email: "artifact@example.com", username: "artifactuser", password: "testpassword",
  });
  token = reg.body.token;
});
afterAll(cleanup);

describe("install_command on publish", () => {
  it("stores and returns a valid install_command", async () => {
    const res = await request(app).post("/api/servers").set("Authorization", `Bearer ${token}`).send({
      name: "Artifact Server", category_id: "dev-tools",
      description: "Server with a declared install command.",
      install_command: "npx -y @acme/mcp-server",
    });
    expect(res.status).toBe(201);
    expect(res.body.install_command).toBe("npx -y @acme/mcp-server");
    expect(res.body.repo_verified).toBe(false);
  });

  it("rejects an install_command with shell-control characters", async () => {
    const res = await request(app).post("/api/servers").set("Authorization", `Bearer ${token}`).send({
      name: "Evil Server", category_id: "dev-tools",
      description: "Tries to smuggle a shell command.",
      install_command: "npx pkg; rm -rf /",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/install_command/i);
  });
});

describe("scan → trust binding", () => {
  it("a high-risk source scan lowers the trust score", async () => {
    const create = await request(app).post("/api/servers").set("Authorization", `Bearer ${token}`).send({
      name: "Scanned Server", category_id: "dev-tools",
      description: "Server used to verify scan binding.",
      repo_url: "https://github.com/acme/scanned",
    });
    const { id, slug } = create.body;

    const before = await request(app).get(`/api/servers/${slug}/trust`);
    const baseScore = before.body.score;

    db.prepare(
      "INSERT INTO server_scans (server_id, score, tier, finding_count) VALUES (?, ?, ?, ?)"
    ).run(id, 20, "high", 4);

    const after = await request(app).get(`/api/servers/${slug}/trust`);
    expect(after.body.score).toBe(baseScore - 15);
    expect(after.body.penalties.some((p) => p.key === "scan")).toBe(true);
  });
});

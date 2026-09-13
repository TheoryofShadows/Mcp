import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";
import { cleanup, backdateUser, db } from "./setup.js";
import { createApp } from "../server/app.js";

const app = createApp();

let publisherToken;
let buyerToken;
let buyerId;
let strangerToken;
let refundedToken;
let refundedId;
let paidSlug;
let serverId;

function listRow(res) {
  return (res.body.servers || []).find((s) => s.slug === paidSlug);
}

beforeAll(async () => {
  const pub = await request(app).post("/api/auth/register").send({
    email: "lockpub@example.com",
    username: "lockpub",
    password: "lockpassword1",
  });
  publisherToken = pub.body.token;
  backdateUser("lockpub@example.com");

  const buyer = await request(app).post("/api/auth/register").send({
    email: "lockbuyer@example.com",
    username: "lockbuyer",
    password: "lockpassword1",
  });
  buyerToken = buyer.body.token;
  buyerId = buyer.body.user.id;

  const stranger = await request(app).post("/api/auth/register").send({
    email: "lockstranger@example.com",
    username: "lockstranger",
    password: "lockpassword1",
  });
  strangerToken = stranger.body.token;

  const refunded = await request(app).post("/api/auth/register").send({
    email: "lockrefunded@example.com",
    username: "lockrefunded",
    password: "lockpassword1",
  });
  refundedToken = refunded.body.token;
  refundedId = refunded.body.user.id;

  const created = await request(app)
    .post("/api/servers")
    .set("Authorization", `Bearer ${publisherToken}`)
    .send({
      name: "Paid Lock Server",
      category_id: "dev-tools",
      description: "A paid server used to verify install unlock gating.",
      price_type: "paid",
      price_amount: 1600,
      install_command: "npx -y secret-paid-mcp",
      repo_url: "https://github.com/example/paid-lock",
      tags: ["dev"],
    });
  expect(created.status).toBe(201);
  paidSlug = created.body.slug;
  serverId = created.body.id;
});

afterAll(cleanup);

describe("paid tool install lock", () => {
  it("redacts install_command for anonymous buyers", async () => {
    const res = await request(app).get(`/api/servers/${paidSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.price_type).toBe("paid");
    expect(res.body.buyer_has_access).toBe(false);
    expect(res.body.install_locked).toBe(true);
    expect(res.body.install_command).toBeNull();
  });

  it("unlocks install_command after a recorded sale", async () => {
    db.prepare(
      "INSERT INTO sales (id, server_id, buyer_id, gross_cents, fee_cents, payment_method) VALUES (?,?,?,?,?,?)"
    ).run(randomUUID(), serverId, buyerId, 1600, 240, "stripe");

    const res = await request(app)
      .get(`/api/servers/${paidSlug}`)
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.buyer_has_access).toBe(true);
    expect(res.body.install_locked).toBeUndefined();
    expect(res.body.install_command).toBe("npx -y secret-paid-mcp");
  });
});

describe("paid tool list paywall", () => {
  it("redacts install_command on GET /api/servers for anonymous visitors", async () => {
    const res = await request(app).get("/api/servers?search=paid-lock-server");
    expect(res.status).toBe(200);
    const row = listRow(res);
    expect(row).toBeTruthy();
    expect(row.price_type).toBe("paid");
    expect(row.install_locked).toBe(true);
    expect(row.install_command).toBeNull();
  });

  it("redacts install_command on the list API for a signed-in non-buyer", async () => {
    const res = await request(app)
      .get("/api/servers?search=paid-lock-server")
      .set("Authorization", `Bearer ${strangerToken}`);
    expect(res.status).toBe(200);
    const row = listRow(res);
    expect(row).toBeTruthy();
    expect(row.install_locked).toBe(true);
    expect(row.install_command).toBeNull();
  });

  it("keeps install_command visible to the author on list", async () => {
    const res = await request(app)
      .get("/api/servers?author=lockpub")
      .set("Authorization", `Bearer ${publisherToken}`);
    expect(res.status).toBe(200);
    const row = listRow(res);
    expect(row).toBeTruthy();
    expect(row.install_command).toBe("npx -y secret-paid-mcp");
    expect(row.install_locked).toBeUndefined();
  });

  it("keeps install_command visible to the author on detail", async () => {
    const res = await request(app)
      .get(`/api/servers/${paidSlug}`)
      .set("Authorization", `Bearer ${publisherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.install_command).toBe("npx -y secret-paid-mcp");
    expect(res.body.install_locked).toBeUndefined();
    // Author is not a buyer — they cannot purchase their own tool.
    expect(res.body.buyer_has_access).toBe(false);
  });

  it("unlocks install_command on the list API after a recorded sale", async () => {
    const owned = db.prepare(
      "SELECT 1 AS ok FROM sales WHERE server_id = ? AND buyer_id = ? AND refunded_at IS NULL"
    ).get(serverId, buyerId);
    if (!owned) {
      db.prepare(
        "INSERT INTO sales (id, server_id, buyer_id, gross_cents, fee_cents, payment_method) VALUES (?,?,?,?,?,?)"
      ).run(randomUUID(), serverId, buyerId, 1600, 240, "stripe");
    }
    const res = await request(app)
      .get("/api/servers?search=paid-lock-server")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    const row = listRow(res);
    expect(row).toBeTruthy();
    expect(row.install_command).toBe("npx -y secret-paid-mcp");
    expect(row.install_locked).toBeUndefined();
  });

  it("keeps a refunded sale locked on both list and detail", async () => {
    db.prepare(
      "INSERT INTO sales (id, server_id, buyer_id, gross_cents, fee_cents, payment_method, refunded_at) VALUES (?,?,?,?,?,?,datetime('now'))"
    ).run(randomUUID(), serverId, refundedId, 1600, 240, "stripe");

    const list = await request(app)
      .get("/api/servers?search=paid-lock-server")
      .set("Authorization", `Bearer ${refundedToken}`);
    expect(list.status).toBe(200);
    const row = listRow(list);
    expect(row).toBeTruthy();
    expect(row.install_command).toBeNull();
    expect(row.install_locked).toBe(true);

    const detail = await request(app)
      .get(`/api/servers/${paidSlug}`)
      .set("Authorization", `Bearer ${refundedToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.buyer_has_access).toBe(false);
    expect(detail.body.install_command).toBeNull();
    expect(detail.body.install_locked).toBe(true);
  });
});

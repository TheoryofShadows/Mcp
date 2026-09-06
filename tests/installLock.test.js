import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";
import { cleanup, backdateUser, db } from "./setup.js";
import { createApp } from "../server/app.js";

const app = createApp();

let publisherToken;
let buyerToken;
let buyerId;
let paidSlug;
let serverId;

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

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { cleanup, backdateUser, db } from "./setup.js";
import { createApp } from "../server/app.js";
import { computePurchasable } from "../server/lib/purchasable.js";

const app = createApp();

let publisherToken;
let publisherId;
let paidSlug;

beforeAll(async () => {
  const pub = await request(app).post("/api/auth/register").send({
    email: "purchasablepub@example.com",
    username: "purchasablepub",
    password: "purchasablepass1",
  });
  publisherToken = pub.body.token;
  publisherId = pub.body.user.id;
  backdateUser("purchasablepub@example.com");

  const created = await request(app)
    .post("/api/servers")
    .set("Authorization", `Bearer ${publisherToken}`)
    .send({
      name: "Paid Connect Gate",
      category_id: "dev-tools",
      description: "Paid listing used to verify purchasable honesty flags.",
      price_type: "paid",
      price_amount: 1600,
      install_command: "npx -y connect-gate-mcp",
      repo_url: "https://github.com/example/connect-gate",
      tags: ["dev"],
    });
  expect(created.status).toBe(201);
  paidSlug = created.body.slug;
  // Fresh paid publish without Connect must be unpurchasable.
  expect(created.body.purchasable).toBe(false);
  expect(created.body.purchase_blocked_reason).toMatch(/payouts not enabled/i);
});

afterAll(cleanup);

describe("computePurchasable", () => {
  it("marks free tools purchasable", () => {
    expect(computePurchasable({ price_type: "free" })).toEqual({
      purchasable: true,
      purchase_blocked_reason: null,
    });
  });

  it("blocks paid tools without Stripe Connect", () => {
    expect(computePurchasable({ price_type: "paid" })).toEqual({
      purchasable: false,
      purchase_blocked_reason: "Publisher payouts not enabled",
    });
    expect(
      computePurchasable({
        price_type: "paid",
        stripe_account_id: "acct_x",
        stripe_onboarding_done: 0,
      })
    ).toEqual({
      purchasable: false,
      purchase_blocked_reason: "Publisher payouts not enabled",
    });
  });

  it("allows paid tools when Connect account + onboarding are ready", () => {
    expect(
      computePurchasable({
        price_type: "paid",
        stripe_account_id: "acct_ready",
        stripe_onboarding_done: 1,
      })
    ).toEqual({ purchasable: true, purchase_blocked_reason: null });
  });
});

describe("GET /api/servers purchasable flag", () => {
  it("lists paid tools without Connect as unpurchasable", async () => {
    const res = await request(app).get(`/api/servers?author=purchasablepub`);
    expect(res.status).toBe(200);
    const row = res.body.servers.find((s) => s.slug === paidSlug);
    expect(row).toBeTruthy();
    expect(row.purchasable).toBe(false);
    expect(row.purchase_blocked_reason).toBe("Publisher payouts not enabled");
  });

  it("detail endpoint exposes the same honesty fields", async () => {
    const res = await request(app).get(`/api/servers/${paidSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.purchasable).toBe(false);
    expect(res.body.purchase_blocked_reason).toBe("Publisher payouts not enabled");
    expect(res.body.install_locked).toBe(true);
    expect(res.body.install_command).toBeNull();
  });

  it("flips to purchasable after publisher completes Stripe Connect", async () => {
    db.prepare(
      "UPDATE users SET stripe_account_id = ?, stripe_onboarding_done = 1 WHERE id = ?"
    ).run("acct_test_purchasable", publisherId);

    const res = await request(app).get(`/api/servers/${paidSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.purchasable).toBe(true);
    expect(res.body.purchase_blocked_reason).toBeNull();
  });

  it("keeps free tools purchasable without Connect", async () => {
    const created = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${publisherToken}`)
      .send({
        name: "Free Always Open",
        category_id: "dev-tools",
        description: "Free listing should remain installable without Stripe Connect.",
        price_type: "free",
        install_command: "npx -y free-open-mcp",
      });
    expect(created.status).toBe(201);
    expect(created.body.purchasable).toBe(true);
    expect(created.body.purchase_blocked_reason).toBeNull();

    const res = await request(app).get(`/api/servers/${created.body.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.purchasable).toBe(true);
  });
});

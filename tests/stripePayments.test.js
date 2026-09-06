import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { cleanup, backdateUser, db } from "./setup.js";
import { createApp } from "../server/app.js";
import { Keypair } from "@solana/web3.js";
import {
  stripeKeyMode,
  payoutReadiness,
  grantToolPurchase,
  hasPurchased,
} from "../server/routes/payments.js";

const app = createApp();

let buyerId;
let buyerToken;
let publisherId;
let serverId;
let serverSlug;

beforeAll(async () => {
  const pub = await request(app).post("/api/auth/register").send({
    email: "stripepub@example.com",
    username: "stripepub",
    password: "stripepubpass1",
  });
  publisherId = pub.body.user.id;
  backdateUser("stripepub@example.com");

  const buyer = await request(app).post("/api/auth/register").send({
    email: "stripebuyer@example.com",
    username: "stripebuyer",
    password: "stripebuyerpass1",
  });
  buyerId = buyer.body.user.id;
  buyerToken = buyer.body.token;

  const created = await request(app)
    .post("/api/servers")
    .set("Authorization", `Bearer ${pub.body.token}`)
    .send({
      name: "Grant Path Tool",
      category_id: "dev-tools",
      description: "Paid listing used to verify the Stripe grant path.",
      price_type: "paid",
      price_amount: 2000,
      install_command: "npx -y grant-path-mcp",
    });
  expect(created.status).toBe(201);
  serverId = created.body.id;
  serverSlug = created.body.slug;
});

afterAll(cleanup);

describe("stripeKeyMode", () => {
  it("reads live vs test off the key prefix", () => {
    expect(stripeKeyMode("sk_live_abc")).toBe("live");
    expect(stripeKeyMode("rk_live_abc")).toBe("live");
    expect(stripeKeyMode("sk_test_abc")).toBe("test");
    expect(stripeKeyMode("rk_test_abc")).toBe("test");
  });

  it("reports unset and unrecognised keys distinctly", () => {
    expect(stripeKeyMode("")).toBe("unset");
    expect(stripeKeyMode(undefined)).toBe("unset");
    expect(stripeKeyMode("whsec_nonsense")).toBe("unknown");
  });
});

describe("payoutReadiness", () => {
  const ready = {
    details_submitted: true,
    charges_enabled: true,
    payouts_enabled: true,
    capabilities: { transfers: "active" },
  };

  it("is ready only when Stripe can both charge and pay out", () => {
    const r = payoutReadiness(ready);
    expect(r.ready).toBe(true);
    expect(r.status).toBe("enabled");
  });

  it("is not ready while transfers are still inactive", () => {
    const r = payoutReadiness({ ...ready, capabilities: { transfers: "pending" } });
    expect(r.ready).toBe(false);
    expect(r.status).toBe("verifying");
  });

  it("is not ready when payouts are disabled despite submitted details", () => {
    const r = payoutReadiness({ ...ready, payouts_enabled: false });
    expect(r.ready).toBe(false);
  });

  it("reports pending before details are submitted", () => {
    expect(payoutReadiness({ details_submitted: false }).status).toBe("pending");
    expect(payoutReadiness(null).ready).toBe(false);
    expect(payoutReadiness(undefined).status).toBe("pending");
  });

  it("surfaces a restriction reason so the publisher knows what to fix", () => {
    const r = payoutReadiness({
      details_submitted: true,
      requirements: { disabled_reason: "requirements.past_due", currently_due: ["individual.id_number"] },
    });
    expect(r.status).toBe("restricted");
    expect(r.disabled_reason).toBe("requirements.past_due");
    expect(r.currently_due).toEqual(["individual.id_number"]);
  });
});

describe("grantToolPurchase", () => {
  const salesFor = (buyer) =>
    db.prepare("SELECT * FROM sales WHERE server_id = ? AND buyer_id = ?").all(serverId, buyer);

  it("records the sale with the 15% platform fee and unlocks the install", () => {
    const out = grantToolPurchase({ server_id: serverId, buyer_id: buyerId, gross_cents: 2000 });
    expect(out.granted).toBe(true);
    expect(out.fee_cents).toBe(300);

    const sales = salesFor(buyerId);
    expect(sales).toHaveLength(1);
    expect(sales[0].gross_cents).toBe(2000);
    expect(sales[0].fee_cents).toBe(300);
    expect(sales[0].payment_method).toBe("stripe");

    const install = db
      .prepare("SELECT 1 AS ok FROM installs WHERE server_id = ? AND user_id = ?")
      .get(serverId, buyerId);
    expect(install).toBeTruthy();
  });

  it("still records the sale when the buyer already installed the tool", async () => {
    const other = await request(app).post("/api/auth/register").send({
      email: "repeatbuyer@example.com",
      username: "repeatbuyer",
      password: "repeatbuyerpass1",
    });
    const repeatId = other.body.user.id;

    // Pre-existing install — the UNIQUE(server_id, user_id) index used to make
    // this throw and take the publisher's sale row down with it.
    db.prepare("INSERT INTO installs (id, server_id, user_id) VALUES ('pre-existing', ?, ?)")
      .run(serverId, repeatId);

    expect(() =>
      grantToolPurchase({ server_id: serverId, buyer_id: repeatId, gross_cents: 2000 })
    ).not.toThrow();
    expect(salesFor(repeatId)).toHaveLength(1);
  });

  it("counts a paid install toward adoption exactly once", async () => {
    const other = await request(app).post("/api/auth/register").send({
      email: "countbuyer@example.com",
      username: "countbuyer",
      password: "countbuyerpass1",
    });
    const countId = other.body.user.id;
    const before = db.prepare("SELECT installs FROM servers WHERE id = ?").get(serverId).installs;

    grantToolPurchase({ server_id: serverId, buyer_id: countId, gross_cents: 2000 });
    grantToolPurchase({ server_id: serverId, buyer_id: countId, gross_cents: 2000 });

    const after = db.prepare("SELECT installs FROM servers WHERE id = ?").get(serverId).installs;
    expect(after).toBe(before + 1);
  });

  it("is a no-op without a server or buyer rather than a half-written grant", () => {
    expect(grantToolPurchase({ buyer_id: buyerId, gross_cents: 2000 }).granted).toBe(false);
    expect(grantToolPurchase({ server_id: serverId, gross_cents: 2000 }).granted).toBe(false);
  });

  it("feeds the publisher's earnings endpoint", async () => {
    const login = await request(app).post("/api/auth/login").send({
      email: "stripepub@example.com",
      password: "stripepubpass1",
    });
    const res = await request(app)
      .get("/api/earnings")
      .set("Authorization", `Bearer ${login.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.sales_count).toBeGreaterThan(0);
    // Publisher keeps 85% of every gross cent.
    expect(res.body.total_net_cents).toBe(
      res.body.total_gross_cents - Math.round(res.body.total_gross_cents * 0.15)
    );
  });
});

describe("GET /api/payments/stripe/config", () => {
  it("reports readiness without leaking any key material", async () => {
    const res = await request(app).get("/api/payments/stripe/config");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      enabled: false,
      mode: "unset",
      livemode: false,
      webhook_secret_set: false,
      platform_fee_pct: 15,
      publisher_share_pct: 85,
      label: "Not configured",
    });
    expect(JSON.stringify(res.body)).not.toMatch(/sk_|rk_|whsec_/);
  });
});

describe("hasPurchased", () => {
  it("is false for a buyer with no sale, true once one is recorded", async () => {
    const fresh = await request(app).post("/api/auth/register").send({
      email: "ownercheck@example.com",
      username: "ownercheck",
      password: "ownercheckpass1",
    });
    const freshId = fresh.body.user.id;

    expect(hasPurchased(serverId, freshId)).toBe(false);
    grantToolPurchase({ server_id: serverId, buyer_id: freshId, gross_cents: 2000 });
    expect(hasPurchased(serverId, freshId)).toBe(true);
  });

  it("is false when either side is missing", () => {
    expect(hasPurchased(null, buyerId)).toBe(false);
    expect(hasPurchased(serverId, null)).toBe(false);
  });
});

describe("double-purchase guard", () => {
  const TREASURY = Keypair.generate().publicKey.toBase58();
  const PUBLISHER_WALLET = Keypair.generate().publicKey.toBase58();

  beforeAll(() => {
    process.env.SOLANA_TREASURY_WALLET = TREASURY;
    process.env.SOLANA_CLUSTER = "devnet";
    process.env.SOLANA_USD_PER_SOL = "150";
    db.prepare("UPDATE users SET solana_wallet = ? WHERE id = ?").run(PUBLISHER_WALLET, publisherId);
  });

  afterAll(() => {
    delete process.env.SOLANA_TREASURY_WALLET;
  });

  it("refuses to open a Solana purchase for a tool the buyer already owns", async () => {
    // buyerId already has a sale for serverId from the grant tests above.
    expect(hasPurchased(serverId, buyerId)).toBe(true);
    const before = db
      .prepare("SELECT COUNT(*) AS c FROM solana_purchases WHERE buyer_id = ?")
      .get(buyerId).c;

    const res = await request(app)
      .post("/api/payments/solana/request")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ server_slug: serverSlug });

    expect(res.status).toBe(200);
    expect(res.body.already_purchased).toBe(true);
    // No pending purchase created — an on-chain payment has no chargeback.
    expect(res.body.reference).toBeUndefined();
    const after = db
      .prepare("SELECT COUNT(*) AS c FROM solana_purchases WHERE buyer_id = ?")
      .get(buyerId).c;
    expect(after).toBe(before);
  });

  it("still opens a purchase for a buyer who does not own the tool", async () => {
    const other = await request(app).post("/api/auth/register").send({
      email: "firsttimebuyer@example.com",
      username: "firsttimebuyer",
      password: "firsttimepass1",
    });

    const res = await request(app)
      .post("/api/payments/solana/request")
      .set("Authorization", `Bearer ${other.body.token}`)
      .send({ server_slug: serverSlug });

    expect(res.status).toBe(200);
    expect(res.body.already_purchased).toBeUndefined();
    expect(res.body.reference).toBeTruthy();
    expect(res.body.recipient).toBe(PUBLISHER_WALLET);
  });
});

describe("POST /api/payments/stripe/webhook", () => {
  it("refuses unsigned deliveries", async () => {
    const res = await request(app)
      .post("/api/payments/stripe/webhook")
      .set("Content-Type", "application/json")
      .send({ id: "evt_unsigned", type: "checkout.session.completed" });
    // 501 without a key configured; never 200 — an unsigned event must not grant.
    expect(res.status).not.toBe(200);
  });
});

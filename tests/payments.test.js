import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { Keypair } from "@solana/web3.js";
import { periodEndISO } from "../server/routes/payments.js";
import {
  centsToLamports,
  splitLamports,
  isValidPubkey,
  setSolanaVerifyImpl,
  resetSolanaVerifyImpl,
  verifyPurchaseTransaction,
  extractSystemTransfers,
  SystemProgram,
} from "../server/lib/solanaPay.js";
import bs58 from "bs58";
import { cleanup, db, backdateUser } from "./setup.js";
import { createApp } from "../server/app.js";

// 2025-01-01T00:00:00Z
const TS = 1735689600;
const ISO = new Date(TS * 1000).toISOString();

const TREASURY = Keypair.generate().publicKey.toBase58();
const PUBLISHER_WALLET = Keypair.generate().publicKey.toBase58();

describe("payments / periodEndISO (Basil+ subscription period)", () => {
  it("reads the item-level current_period_end (Basil+ shape)", () => {
    const sub = { items: { data: [{ current_period_end: TS }] } };
    expect(periodEndISO(sub)).toBe(ISO);
  });

  it("falls back to the legacy top-level field (pre-Basil webhook payload)", () => {
    const sub = { current_period_end: TS };
    expect(periodEndISO(sub)).toBe(ISO);
  });

  it("prefers the item-level field when both are present", () => {
    const sub = {
      current_period_end: 1,
      items: { data: [{ current_period_end: TS }] },
    };
    expect(periodEndISO(sub)).toBe(ISO);
  });

  it("returns null (never throws) when the value is missing", () => {
    expect(periodEndISO({ items: { data: [{}] } })).toBeNull();
    expect(periodEndISO({ items: { data: [] } })).toBeNull();
    expect(periodEndISO({})).toBeNull();
    expect(periodEndISO(null)).toBeNull();
    expect(periodEndISO(undefined)).toBeNull();
  });
});

describe("solanaPay helpers", () => {
  it("validates base58 pubkeys", () => {
    expect(isValidPubkey(TREASURY)).toBe(true);
    expect(isValidPubkey("not-a-key")).toBe(false);
    expect(isValidPubkey("")).toBe(false);
  });

  it("converts cents to lamports with FX stub and splits 85/15", () => {
    const lamports = centsToLamports(1500, 150); // $15 at $150/SOL = 0.1 SOL
    expect(lamports).toBe(100_000_000);
    const { publisher_lamports, platform_lamports } = splitLamports(lamports);
    expect(publisher_lamports + platform_lamports).toBe(lamports);
    expect(publisher_lamports).toBe(Math.floor(lamports * 0.85));
  });
});


function encodeTransferData(lamports) {
  const buf = Buffer.alloc(12);
  buf.writeUInt32LE(2, 0); // SystemInstruction::Transfer
  buf.writeBigUInt64LE(BigInt(lamports), 4);
  return bs58.encode(buf);
}

function mockLegacyTx({ accountKeys, preBalances, postBalances, transfers, err = null }) {
  const systemId = SystemProgram.programId.toBase58();
  // Ensure system program is in accountKeys for programIdIndex
  const keys = [...accountKeys];
  if (!keys.includes(systemId)) keys.push(systemId);
  const ixs = transfers.map(({ from, to, lamports }) => ({
    programIdIndex: keys.indexOf(systemId),
    accounts: [keys.indexOf(from), keys.indexOf(to)],
    data: encodeTransferData(lamports),
  }));
  return {
    meta: { err, preBalances, postBalances },
    transaction: { message: { accountKeys: keys, instructions: ixs } },
  };
}

function mockConnection(tx) {
  return { getTransaction: async () => tx };
}


describe("verifyPurchaseTransaction (balance + same-wallet)", () => {
  const buyer = Keypair.generate().publicKey.toBase58();
  const publisher = Keypair.generate().publicKey.toBase58();
  const treasury = Keypair.generate().publicKey.toBase58();
  const reference = Keypair.generate().publicKey.toBase58();
  const publisherLamports = 850_000;
  const platformLamports = 150_000;

  it("accepts distinct-wallet purchase via balance deltas", async () => {
    const accountKeys = [buyer, publisher, treasury, reference];
    const tx = mockLegacyTx({
      accountKeys,
      preBalances: [10_000_000, 1_000_000, 500_000, 0],
      postBalances: [10_000_000 - publisherLamports - platformLamports - 5000, 1_000_000 + publisherLamports, 500_000 + platformLamports, 0],
      transfers: [
        { from: buyer, to: publisher, lamports: publisherLamports },
        { from: buyer, to: treasury, lamports: platformLamports },
      ],
    });
    const res = await verifyPurchaseTransaction({
      signature: "3".repeat(88),
      reference,
      recipient: publisher,
      platformRecipient: treasury,
      publisherLamports,
      platformLamports,
      connection: mockConnection(tx),
    });
    expect(res.ok).toBe(true);
  });

  it("rejects distinct-wallet when publisher delta too low", async () => {
    const accountKeys = [buyer, publisher, treasury, reference];
    const tx = mockLegacyTx({
      accountKeys,
      preBalances: [10_000_000, 1_000_000, 500_000, 0],
      postBalances: [9_000_000, 1_000_100, 500_000 + platformLamports, 0],
      transfers: [
        { from: buyer, to: publisher, lamports: 100 },
        { from: buyer, to: treasury, lamports: platformLamports },
      ],
    });
    const res = await verifyPurchaseTransaction({
      signature: "4".repeat(88),
      reference,
      recipient: publisher,
      platformRecipient: treasury,
      publisherLamports,
      platformLamports,
      connection: mockConnection(tx),
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Publisher amount mismatch/);
  });

  it("accepts same-wallet (buyer === publisher) via transfer instruction parsing", async () => {
    // Self-transfer: recipient balance does not increase by publisherLamports
    // (netted with the outbound self-transfer). Delta-only checks would fail.
    const accountKeys = [buyer, treasury, reference];
    const fee = 5000;
    const tx = mockLegacyTx({
      accountKeys,
      preBalances: [10_000_000, 500_000, 0],
      // buyer paid platform + fee; self-transfer is balance-neutral
      postBalances: [10_000_000 - platformLamports - fee, 500_000 + platformLamports, 0],
      transfers: [
        { from: buyer, to: buyer, lamports: publisherLamports },
        { from: buyer, to: treasury, lamports: platformLamports },
      ],
    });
    // recipient is buyer (same wallet)
    const res = await verifyPurchaseTransaction({
      signature: "5".repeat(88),
      reference,
      recipient: buyer,
      platformRecipient: treasury,
      publisherLamports,
      platformLamports,
      connection: mockConnection(tx),
    });
    expect(res.ok).toBe(true);
    expect(res.same_wallet).toBe(true);
  });

  it("rejects same-wallet when publisher transfer ix is missing/short", async () => {
    const accountKeys = [buyer, treasury, reference];
    const tx = mockLegacyTx({
      accountKeys,
      preBalances: [10_000_000, 500_000, 0],
      postBalances: [10_000_000 - platformLamports - 5000, 500_000 + platformLamports, 0],
      transfers: [
        { from: buyer, to: buyer, lamports: 10 }, // too small
        { from: buyer, to: treasury, lamports: platformLamports },
      ],
    });
    const res = await verifyPurchaseTransaction({
      signature: "6".repeat(88),
      reference,
      recipient: buyer,
      platformRecipient: treasury,
      publisherLamports,
      platformLamports,
      connection: mockConnection(tx),
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Publisher amount mismatch/);
  });

  it("extractSystemTransfers reads transfer lamports", () => {
    const accountKeys = [buyer, publisher, treasury];
    const tx = mockLegacyTx({
      accountKeys,
      preBalances: [0, 0, 0],
      postBalances: [0, 0, 0],
      transfers: [{ from: buyer, to: publisher, lamports: 42 }],
    });
    const list = extractSystemTransfers(tx, tx.transaction.message.accountKeys);
    expect(list).toEqual([{ from: buyer, to: publisher, lamports: 42 }]);
  });
});

describe("Solana Pay HTTP", () => {
  const app = createApp();
  let publisherToken;
  let buyerToken;
  let paidSlug;

  beforeAll(async () => {
    process.env.SOLANA_TREASURY_WALLET = TREASURY;
    process.env.SOLANA_CLUSTER = "devnet";
    process.env.SOLANA_USD_PER_SOL = "150";

    const suffix = Date.now().toString(36);
    const pubEmail = `solana-pub-${suffix}@example.com`;
    const buyerEmail = `solana-buyer-${suffix}@example.com`;

    const pub = await request(app).post("/api/auth/register").send({
      email: pubEmail,
      username: `solanapub${suffix}`,
      password: "testpassword1",
    });
    expect(pub.status).toBe(201);
    publisherToken = pub.body.token;
    backdateUser(pubEmail);

    const buyer = await request(app).post("/api/auth/register").send({
      email: buyerEmail,
      username: `solanabuyer${suffix}`,
      password: "testpassword1",
    });
    expect(buyer.status).toBe(201);
    buyerToken = buyer.body.token;

    const created = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${publisherToken}`)
      .send({
        name: `Solana Paid Tool ${suffix}`,
        category_id: "dev-tools",
        description: "A paid tool for Solana Pay tests.",
        price_type: "paid",
        price_amount: 1500,
      });
    expect(created.status).toBe(201);
    paidSlug = created.body.slug;
  });

  afterAll(async () => {
    resetSolanaVerifyImpl();
    delete process.env.SOLANA_TREASURY_WALLET;
    await cleanup();
  });

  beforeEach(() => {
    resetSolanaVerifyImpl();
    process.env.SOLANA_TREASURY_WALLET = TREASURY;
  });

  it("GET /solana/config reports enabled when treasury is set", async () => {
    const res = await request(app).get("/api/payments/solana/config");
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
    expect(res.body.cluster).toBe("devnet");
    expect(res.body.currency_label).toMatch(/FX stub/i);
    expect(res.body.label).toMatch(/devnet/i);
  });

  it("POST /solana/request returns 501 when treasury unset", async () => {
    delete process.env.SOLANA_TREASURY_WALLET;
    const res = await request(app)
      .post("/api/payments/solana/request")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ server_slug: paidSlug });
    expect(res.status).toBe(501);
    expect(res.body.error).toMatch(/not configured/i);
  });

  it("POST /solana/request returns 402 when publisher has no wallet", async () => {
    const res = await request(app)
      .post("/api/payments/solana/request")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ server_slug: paidSlug });
    expect(res.status).toBe(402);
    expect(res.body.error).toMatch(/Solana payout wallet/i);
  });

  it("PUT /solana/wallet rejects invalid pubkey", async () => {
    const res = await request(app)
      .put("/api/payments/solana/wallet")
      .set("Authorization", `Bearer ${publisherToken}`)
      .send({ solana_wallet: "nope" });
    expect(res.status).toBe(400);
  });

  it("happy path: save wallet → request → confirm (mocked RPC) unlocks", async () => {
    const save = await request(app)
      .put("/api/payments/solana/wallet")
      .set("Authorization", `Bearer ${publisherToken}`)
      .send({ solana_wallet: PUBLISHER_WALLET });
    expect(save.status).toBe(200);
    expect(save.body.solana_wallet).toBe(PUBLISHER_WALLET);

    const req = await request(app)
      .post("/api/payments/solana/request")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ server_slug: paidSlug });
    expect(req.status).toBe(200);
    expect(req.body.purchase_id).toBeTruthy();
    expect(req.body.reference).toBeTruthy();
    expect(req.body.recipient).toBe(PUBLISHER_WALLET);
    expect(req.body.platform_recipient).toBe(TREASURY);
    expect(req.body.publisher_lamports + req.body.platform_lamports).toBeGreaterThan(0);
    expect(req.body.spl_token).toBeNull();
    expect(req.body.cluster).toBe("devnet");

    setSolanaVerifyImpl(async () => ({ ok: true }));

    const fakeSig = `sig1${Date.now()}${"a".repeat(60)}`;
    const conf = await request(app)
      .post("/api/payments/solana/confirm")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ purchase_id: req.body.purchase_id, signature: fakeSig });
    expect(conf.status).toBe(200);
    expect(conf.body.status).toBe("completed");

    const status = await request(app)
      .get(`/api/payments/solana/status/${req.body.purchase_id}`)
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(status.body.status).toBe("completed");

    const sale = db.prepare(
      "SELECT payment_method, gross_cents, fee_cents FROM sales WHERE payment_method = 'solana' ORDER BY created_at DESC LIMIT 1"
    ).get();
    expect(sale.payment_method).toBe("solana");
    expect(sale.gross_cents).toBe(1500);
    expect(sale.fee_cents).toBe(225);

    const install = db.prepare(`
      SELECT i.id FROM installs i
      JOIN servers s ON s.id = i.server_id
      WHERE s.slug = ?
      ORDER BY i.installed_at DESC
      LIMIT 1
    `).get(paidSlug);
    expect(install).toBeTruthy();
  });

  it("confirm rejects when verification fails (no fake paid)", async () => {
    // Ensure publisher wallet still set
    await request(app)
      .put("/api/payments/solana/wallet")
      .set("Authorization", `Bearer ${publisherToken}`)
      .send({ solana_wallet: PUBLISHER_WALLET });

    const req = await request(app)
      .post("/api/payments/solana/request")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ server_slug: paidSlug });
    expect(req.status).toBe(200);

    setSolanaVerifyImpl(async () => ({ ok: false, error: "Publisher amount mismatch" }));

    const conf = await request(app)
      .post("/api/payments/solana/confirm")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ purchase_id: req.body.purchase_id, signature: `sig2${Date.now()}${"b".repeat(60)}` });
    expect(conf.status).toBe(402);
    expect(conf.body.error).toMatch(/mismatch/i);

    const row = db.prepare("SELECT status FROM solana_purchases WHERE id = ?").get(req.body.purchase_id);
    expect(row.status).toBe("pending");
  });

  it("POST /solana/request requires auth and server_slug", async () => {
    const unauth = await request(app).post("/api/payments/solana/request").send({ server_slug: paidSlug });
    expect(unauth.status).toBe(401);

    const missing = await request(app)
      .post("/api/payments/solana/request")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({});
    expect(missing.status).toBe(400);
  });
});

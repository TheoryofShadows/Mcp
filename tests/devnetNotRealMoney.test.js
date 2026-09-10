import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { zeroOutDevnetSales } from "../server/lib/devnetSalesCleanup.js";
import { getSolanaConfig } from "../server/lib/solanaPay.js";

/**
 * Devnet SOL is free from a faucet. A "purchase" made with it costs the buyer
 * nothing, so it must never be counted as revenue — the publisher dashboard
 * would otherwise report money nobody paid.
 *
 * Found when the owner reported a $1 sale on a tool they never bought.
 */
let db;
beforeEach(() => {
  db = new Database(":memory:");
  db.exec(`
    CREATE TABLE sales (
      id TEXT PRIMARY KEY,
      server_id TEXT,
      buyer_id TEXT,
      gross_cents INTEGER,
      fee_cents INTEGER,
      payment_method TEXT,
      refunded_at TEXT
    );
  `);
});

const addSale = (id, method, gross, fee) =>
  db.prepare("INSERT INTO sales (id, server_id, buyer_id, gross_cents, fee_cents, payment_method) VALUES (?,?,?,?,?,?)")
    .run(id, "srv", "buyer", gross, fee, method);
const get = (id) => db.prepare("SELECT * FROM sales WHERE id = ?").get(id);

describe("devnet SOL is not revenue", () => {
  it("marks devnet as not real money, mainnet as real", () => {
    const cfg = getSolanaConfig();
    // Production runs devnet today.
    expect(cfg.is_real_money).toBe(cfg.cluster === "mainnet-beta");
  });

  it("zeroes a solana sale while the cluster is not mainnet", () => {
    addSale("s1", "solana", 100, 15);
    const { updated } = zeroOutDevnetSales(db, { is_real_money: false });
    expect(updated).toBe(1);
    const row = get("s1");
    expect(row.gross_cents).toBe(0);
    expect(row.fee_cents).toBe(0);
    expect(row.payment_method).toBe("solana-devnet");
  });

  it("KEEPS the row, so the buyer does not lose access", () => {
    addSale("s1", "solana", 100, 15);
    zeroOutDevnetSales(db, { is_real_money: false });
    // Access is gated on a non-refunded sale existing — it must still be there.
    const owned = db.prepare(
      "SELECT 1 AS ok FROM sales WHERE server_id = ? AND buyer_id = ? AND refunded_at IS NULL LIMIT 1"
    ).get("srv", "buyer");
    expect(owned?.ok).toBe(1);
  });

  it("never touches Stripe sales — those are real money", () => {
    addSale("stripe1", "stripe", 100, 15);
    zeroOutDevnetSales(db, { is_real_money: false });
    const row = get("stripe1");
    expect(row.gross_cents).toBe(100);
    expect(row.payment_method).toBe("stripe");
  });

  it("does nothing once the cluster IS mainnet", () => {
    addSale("s1", "solana", 100, 15);
    const res = zeroOutDevnetSales(db, { is_real_money: true });
    expect(res.skipped).toBe(true);
    expect(get("s1").gross_cents).toBe(100);
  });

  it("is idempotent", () => {
    addSale("s1", "solana", 100, 15);
    expect(zeroOutDevnetSales(db, { is_real_money: false }).updated).toBe(1);
    expect(zeroOutDevnetSales(db, { is_real_money: false }).updated).toBe(0);
  });

  it("records new devnet purchases at zero from the start", () => {
    const src = readFileSync(new URL("../server/routes/payments.js", import.meta.url), "utf8");
    expect(src).toMatch(/const realMoney = cfg\.is_real_money/);
    expect(src).toMatch(/realMoney \? purchase\.gross_cents : 0/);
    expect(src).toMatch(/realMoney \? "solana" : "solana-devnet"/);
  });

  it("does not present devnet to a buyer as a real payment", () => {
    const ui = readFileSync(new URL("../src/pages/ToolDetail.jsx", import.meta.url), "utf8");
    expect(ui).toMatch(/Test payment \(devnet · not real money\)/);
    expect(ui).toMatch(/solanaCfg\.is_real_money/);
  });
});

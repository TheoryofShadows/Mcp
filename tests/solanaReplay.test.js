import { describe, it, expect, beforeEach } from "vitest";
import db from "../server/db.js";
import { randomUUID as uuid } from "node:crypto";

// A signature is proof that ONE payment happened. Letting it settle two
// purchases is free money for an attacker, so the database — not a SELECT that
// races an awaited RPC call — has to be the authority.
describe("solana signature replay protection", () => {
  let buyerId, serverId;

  beforeEach(() => {
    buyerId = uuid();
    serverId = uuid();
    db.prepare("INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, 'x')")
      .run(buyerId, `replay-${buyerId}@example.com`, `replay${buyerId.slice(0, 8)}`);
    db.prepare(
      "INSERT INTO servers (id, name, slug, description, category_id, author_id, gradient) VALUES (?, ?, ?, 'd', 'dev-tools', ?, 'g')"
    ).run(serverId, "Replay Test", `replay-${serverId.slice(0, 8)}`, buyerId);
  });

  const newPurchase = (signature) => {
    const id = uuid();
    db.prepare(`
      INSERT INTO solana_purchases
        (id, buyer_id, server_id, reference, recipient, platform_recipient,
         publisher_lamports, platform_lamports, gross_cents, fee_cents, cluster, status, signature)
      VALUES (?, ?, ?, ?, 'rec', 'plat', 100, 15, 1000, 150, 'devnet', 'completed', ?)
    `).run(id, buyerId, serverId, uuid(), signature);
    return id;
  };

  it("allows a signature to settle exactly one purchase", () => {
    expect(() => newPurchase(`sig_unique_${uuid()}`)).not.toThrow();
  });

  it("rejects the same signature on a second purchase at the DB level", () => {
    const sig = `sig_replay_${uuid()}`;
    newPurchase(sig);
    // This is the race winner/loser pair: both passed the route's SELECT.
    expect(() => newPurchase(sig)).toThrow(/UNIQUE constraint failed/i);
  });

  it("still allows many pending purchases with no signature yet", () => {
    expect(() => {
      newPurchase(null);
      newPurchase(null);
      newPurchase(null);
    }).not.toThrow();
  });

  it("the unique index exists and is scoped to non-null signatures", () => {
    const idx = db
      .prepare("SELECT sql FROM sqlite_master WHERE type='index' AND name='idx_solana_purchases_unique_sig'")
      .get();
    expect(idx).toBeTruthy();
    expect(idx.sql).toMatch(/WHERE signature IS NOT NULL/i);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import db from "../server/db.js";
import { randomUUID as uuid } from "node:crypto";
import { revokeToolPurchase, hasPurchased, grantToolPurchase } from "../server/routes/payments.js";

// Without revocation a buyer can pay, take the install command, charge back, and
// keep the tool forever — Stripe claws the money back from the publisher while
// MCPX keeps handing out access.
describe("refund / chargeback revocation", () => {
  let buyerId, serverId;

  beforeEach(() => {
    buyerId = uuid();
    serverId = uuid();
    db.prepare("INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, 'x')")
      .run(buyerId, `refund-${buyerId}@example.com`, `refund${buyerId.slice(0, 8)}`);
    db.prepare(
      "INSERT INTO servers (id, name, slug, description, category_id, author_id, gradient, price_type, price_amount) VALUES (?, ?, ?, 'd', 'dev-tools', ?, 'g', 'paid', 1600)"
    ).run(serverId, "Refund Test", `refund-${serverId.slice(0, 8)}`, buyerId);
  });

  it("grants access on purchase", () => {
    grantToolPurchase({ server_id: serverId, buyer_id: buyerId, gross_cents: 1600, payment_ref: "pi_grant" });
    expect(hasPurchased(serverId, buyerId)).toBe(true);
  });

  it("revokes access when the charge is refunded", () => {
    const ref = `pi_${uuid()}`;
    grantToolPurchase({ server_id: serverId, buyer_id: buyerId, gross_cents: 1600, payment_ref: ref });
    expect(hasPurchased(serverId, buyerId)).toBe(true);

    expect(revokeToolPurchase(ref)).toBe(1);
    expect(hasPurchased(serverId, buyerId)).toBe(false);
  });

  it("keeps the sale row for the audit trail instead of deleting it", () => {
    const ref = `pi_${uuid()}`;
    grantToolPurchase({ server_id: serverId, buyer_id: buyerId, gross_cents: 1600, payment_ref: ref });
    revokeToolPurchase(ref);

    const row = db.prepare("SELECT gross_cents, refunded_at FROM sales WHERE payment_ref = ?").get(ref);
    expect(row).toBeTruthy();
    expect(row.gross_cents).toBe(1600);
    expect(row.refunded_at).toBeTruthy();
  });

  it("is idempotent — a repeated refund webhook revokes nothing further", () => {
    const ref = `pi_${uuid()}`;
    grantToolPurchase({ server_id: serverId, buyer_id: buyerId, gross_cents: 1600, payment_ref: ref });
    expect(revokeToolPurchase(ref)).toBe(1);
    expect(revokeToolPurchase(ref)).toBe(0);
  });

  it("ignores an unknown payment reference", () => {
    expect(revokeToolPurchase("pi_does_not_exist")).toBe(0);
    expect(revokeToolPurchase(null)).toBe(0);
  });

  it("lets a refunded buyer purchase the tool again", () => {
    const ref = `pi_${uuid()}`;
    grantToolPurchase({ server_id: serverId, buyer_id: buyerId, gross_cents: 1600, payment_ref: ref });
    revokeToolPurchase(ref);
    // hasPurchased false means tool-checkout opens a new session rather than
    // replying "already_purchased" and stranding the buyer.
    expect(hasPurchased(serverId, buyerId)).toBe(false);
  });
});

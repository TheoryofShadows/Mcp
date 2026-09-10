import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { backfillPriceLabels } from "../server/lib/priceLabelBackfill.js";

let db;
beforeEach(() => {
  db = new Database(":memory:");
  db.exec(`
    CREATE TABLE servers (
      id TEXT PRIMARY KEY,
      slug TEXT,
      price_label TEXT,
      billing_period TEXT DEFAULT 'one_time'
    );
  `);
});

const insert = (id, label, period = "one_time") =>
  db.prepare("INSERT INTO servers (id, slug, price_label, billing_period) VALUES (?, ?, ?, ?)")
    .run(id, id, label, period);
const labelOf = (id) => db.prepare("SELECT price_label FROM servers WHERE id = ?").get(id).price_label;

describe("backfillPriceLabels", () => {
  it("strips /mo from one-time listings", () => {
    insert("a", "$16/mo");
    insert("b", "$9.99/mo");
    expect(backfillPriceLabels(db).updated).toBe(2);
    expect(labelOf("a")).toBe("$16");
    expect(labelOf("b")).toBe("$9.99");
  });

  it("LEAVES a genuinely monthly listing alone", () => {
    // A publisher who chose monthly billing is correctly labelled — the /mo
    // is true for them and must survive.
    insert("m", "$16/mo", "monthly");
    expect(backfillPriceLabels(db).updated).toBe(0);
    expect(labelOf("m")).toBe("$16/mo");
  });

  it("treats a NULL billing_period as one-time", () => {
    db.prepare("INSERT INTO servers (id, slug, price_label, billing_period) VALUES ('n','n','$5/mo',NULL)").run();
    backfillPriceLabels(db);
    expect(labelOf("n")).toBe("$5");
  });

  it("does not touch free or already-correct labels", () => {
    insert("f", "free");
    insert("c", "$12");
    expect(backfillPriceLabels(db).updated).toBe(0);
    expect(labelOf("f")).toBe("free");
    expect(labelOf("c")).toBe("$12");
  });

  it("never changes the price itself, only the suffix", () => {
    insert("p", "$1234.56/mo");
    backfillPriceLabels(db);
    expect(labelOf("p")).toBe("$1234.56");
  });

  it("is idempotent — running twice changes nothing the second time", () => {
    insert("a", "$16/mo");
    expect(backfillPriceLabels(db).updated).toBe(1);
    expect(backfillPriceLabels(db).updated).toBe(0);
    expect(labelOf("a")).toBe("$16");
  });
});

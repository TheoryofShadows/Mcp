import { describe, it, expect, afterAll } from "vitest";
import { cleanup, db } from "./setup.js";
import { cleanupProcessedEvents } from "../server/routes/payments.js";

afterAll(cleanup);

describe("processed_events retention", () => {
  it("prunes events older than the retention window but keeps recent ones", () => {
    db.prepare(
      "INSERT INTO processed_events (event_id, event_type, processed_at) VALUES (?, ?, datetime('now', '-200 days'))"
    ).run("evt_old", "checkout.session.completed");
    db.prepare(
      "INSERT INTO processed_events (event_id, event_type, processed_at) VALUES (?, ?, datetime('now'))"
    ).run("evt_fresh", "checkout.session.completed");

    const removed = cleanupProcessedEvents();
    expect(removed).toBeGreaterThanOrEqual(1);

    expect(db.prepare("SELECT 1 FROM processed_events WHERE event_id = 'evt_old'").get()).toBeUndefined();
    expect(db.prepare("SELECT 1 FROM processed_events WHERE event_id = 'evt_fresh'").get()).toBeTruthy();
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { v4 as uuid } from "uuid";
import { cleanup, db } from "./setup.js";
import { createApp } from "../server/app.js";

const app = createApp();
afterAll(cleanup);

let token, authorId, serverId;

beforeAll(async () => {
  const reg = await request(app).post("/api/auth/register").send({
    email: "earn@example.com", username: "earnuser", password: "testpassword",
  });
  token = reg.body.token;
  authorId = reg.body.user.id;

  const s = await request(app).post("/api/servers").set("Authorization", `Bearer ${token}`).send({
    name: "Paid Tool", category_id: "dev-tools", description: "A paid tool for earnings tests.",
  });
  serverId = s.body.id;
});

describe("GET /api/earnings", () => {
  it("requires auth", async () => {
    const res = await request(app).get("/api/earnings");
    expect(res.status).toBe(401);
  });

  it("returns zeros before any sales", async () => {
    const res = await request(app).get("/api/earnings").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.total_net_cents).toBe(0);
    expect(res.body.sales_count).toBe(0);
    expect(res.body.by_month).toEqual([]);
  });

  it("aggregates net = gross - fee across the author's sales", async () => {
    // Two sales: $10.00 (fee $1.50) and $20.00 (fee $3.00) → net 850 + 1700 = 2550
    db.prepare("INSERT INTO sales (id, server_id, buyer_id, gross_cents, fee_cents) VALUES (?,?,?,?,?)")
      .run(uuid(), serverId, null, 1000, 150);
    db.prepare("INSERT INTO sales (id, server_id, buyer_id, gross_cents, fee_cents) VALUES (?,?,?,?,?)")
      .run(uuid(), serverId, null, 2000, 300);

    const res = await request(app).get("/api/earnings").set("Authorization", `Bearer ${token}`);
    expect(res.body.total_gross_cents).toBe(3000);
    expect(res.body.total_net_cents).toBe(2550);
    expect(res.body.sales_count).toBe(2);
    expect(res.body.by_month.length).toBe(1);
  });

  it("does not leak another publisher's sales", async () => {
    const other = await request(app).post("/api/auth/register").send({
      email: "earn2@example.com", username: "earnuser2", password: "testpassword",
    });
    const res = await request(app).get("/api/earnings").set("Authorization", `Bearer ${other.body.token}`);
    expect(res.body.total_net_cents).toBe(0);
    expect(authorId).toBeTruthy();
  });
});

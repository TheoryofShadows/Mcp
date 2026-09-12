import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { db } from "./setup.js";
import { createApp } from "../server/app.js";

/**
 * A signed-in user could not change their password, and there was no way to
 * delete an account at all — a GDPR/CCPA obligation with no implementation.
 */
const app = createApp();

async function makeUser(tag) {
  const email = `${tag}@example.com`;
  const pass = `${tag}password1`;
  const r = await request(app).post("/api/auth/register").send({ email, username: tag, password: pass });
  return { email, pass, token: r.body.token, id: r.body.user.id };
}

describe("change password", () => {
  let u;
  beforeAll(async () => { u = await makeUser("changer"); });

  it("requires the current password", async () => {
    const res = await request(app).patch("/api/auth/password")
      .set("Authorization", `Bearer ${u.token}`)
      .send({ current_password: "wrongwrongwrong", new_password: "newpassword123" });
    expect(res.status).toBe(401);
  });

  it("enforces the same 10-character floor as registration", async () => {
    const res = await request(app).patch("/api/auth/password")
      .set("Authorization", `Bearer ${u.token}`)
      .send({ current_password: u.pass, new_password: "short" });
    expect(res.status).toBe(400);
  });

  it("changes the password and the new one works", async () => {
    const res = await request(app).patch("/api/auth/password")
      .set("Authorization", `Bearer ${u.token}`)
      .send({ current_password: u.pass, new_password: "changedpass123" });
    expect(res.status).toBe(200);

    const old = await request(app).post("/api/auth/login").send({ email: u.email, password: u.pass });
    expect(old.status).toBe(401);
    const now = await request(app).post("/api/auth/login").send({ email: u.email, password: "changedpass123" });
    expect(now.status).toBe(200);
  });

  it("rejects an unauthenticated caller", async () => {
    const res = await request(app).patch("/api/auth/password")
      .send({ current_password: "x", new_password: "yyyyyyyyyy" });
    expect(res.status).toBe(401);
  });
});

describe("delete account", () => {
  it("requires the password", async () => {
    const u = await makeUser("deleter1");
    const res = await request(app).delete("/api/auth/account")
      .set("Authorization", `Bearer ${u.token}`).send({ password: "notmypassword" });
    expect(res.status).toBe(401);
  });

  it("erases personal data and blocks sign-in", async () => {
    const u = await makeUser("deleter2");
    const res = await request(app).delete("/api/auth/account")
      .set("Authorization", `Bearer ${u.token}`).send({ password: u.pass });
    expect(res.status).toBe(200);

    const row = db.prepare("SELECT email, username, display_name FROM users WHERE id = ?").get(u.id);
    expect(row.email).not.toBe(u.email);
    expect(row.email).toMatch(/@deleted\.invalid$/);
    expect(row.display_name).toBeNull();

    const login = await request(app).post("/api/auth/login").send({ email: u.email, password: u.pass });
    expect(login.status).toBe(401);
  });

  it("removes the user's listings", async () => {
    const u = await makeUser("deleter3");
    await request(app).post("/api/servers").set("Authorization", `Bearer ${u.token}`).send({
      name: "Doomed Listing", category_id: "dev-tools",
      description: "This listing should not survive account deletion.",
      price_type: "free", repo_url: "https://github.com/acme/doomed",
    });
    expect(db.prepare("SELECT COUNT(*) c FROM servers WHERE author_id = ?").get(u.id).c).toBe(1);

    await request(app).delete("/api/auth/account")
      .set("Authorization", `Bearer ${u.token}`).send({ password: u.pass });
    expect(db.prepare("SELECT COUNT(*) c FROM servers WHERE author_id = ?").get(u.id).c).toBe(0);
  });

  it("KEEPS sales records — they are financial data we must retain", async () => {
    const u = await makeUser("deleter4");
    // A sale against this buyer, as the Stripe webhook would write it.
    const pub = await makeUser("deleter4pub");
    const srv = await request(app).post("/api/servers").set("Authorization", `Bearer ${pub.token}`).send({
      name: "Sold Tool 4", category_id: "dev-tools",
      description: "A listing that was purchased before the buyer left.",
      price_type: "paid", price_amount: 500, repo_url: "https://github.com/acme/sold4",
    });
    db.prepare(
      "INSERT INTO sales (id, server_id, buyer_id, gross_cents, fee_cents, payment_method) VALUES ('s-del-4', ?, ?, 500, 75, 'stripe')"
    ).run(srv.body.id, u.id);

    await request(app).delete("/api/auth/account")
      .set("Authorization", `Bearer ${u.token}`).send({ password: u.pass });

    const sale = db.prepare("SELECT gross_cents FROM sales WHERE id = 's-del-4'").get();
    expect(sale).toBeDefined();
    expect(sale.gross_cents).toBe(500);
  });

  it("invalidates the session token", async () => {
    const u = await makeUser("deleter5");
    await request(app).delete("/api/auth/account")
      .set("Authorization", `Bearer ${u.token}`).send({ password: u.pass });
    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${u.token}`);
    expect(me.status).toBe(401);
  });
});

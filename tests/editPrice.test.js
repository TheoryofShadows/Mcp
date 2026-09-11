import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { backdateUser } from "./setup.js";
import { createApp } from "../server/app.js";

/**
 * A published listing's price could not be changed at all: price_amount was
 * missing from the PATCH allowlist. Correcting a mispriced tool meant deleting
 * and recreating it, which discards installs, reviews and Trust Score history.
 */
const app = createApp();
let token, slug;

beforeAll(async () => {
  const reg = await request(app).post("/api/auth/register").send({
    email: "pricer@example.com", username: "pricer", password: "pricerpass1",
  });
  token = reg.body.token;
  backdateUser("pricer@example.com");

  const made = await request(app)
    .post("/api/servers")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Price Edit Fixture",
      category_id: "dev-tools",
      description: "A listing whose price we intend to change.",
      price_type: "paid",
      price_amount: 500,
      repo_url: "https://github.com/acme/price-fixture",
    });
  slug = made.body.slug;
});

describe("editing a listing's price", () => {
  it("updates the amount", async () => {
    const res = await request(app)
      .patch(`/api/servers/${slug}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price_amount: 1200 });
    expect(res.status).toBe(200);
    expect(res.body.price_amount).toBe(1200);
  });

  it("keeps the displayed label in step with the amount", async () => {
    await request(app)
      .patch(`/api/servers/${slug}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price_amount: 999 });
    const got = await request(app).get(`/api/servers/${slug}`);
    // Showing one price while charging another is the failure this prevents.
    expect(got.body.price_amount).toBe(999);
    expect(got.body.price_label).toBe("$9.99");
  });

  it("enforces the $3 minimum on edits, not just on creation", async () => {
    const res = await request(app)
      .patch(`/api/servers/${slug}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price_amount: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/start at \$3\.00/);
  });

  it("rejects a non-author", async () => {
    const other = await request(app).post("/api/auth/register").send({
      email: "notpricer@example.com", username: "notpricer", password: "notpricerpass1",
    });
    const res = await request(app)
      .patch(`/api/servers/${slug}`)
      .set("Authorization", `Bearer ${other.body.token}`)
      .send({ price_amount: 5000 });
    expect(res.status).toBe(403);
  });
});

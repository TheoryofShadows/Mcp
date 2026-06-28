import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import Database from "better-sqlite3";
import { cleanup } from "./setup.js";
import { createApp } from "../server/app.js";
import { backupDatabase } from "../scripts/backup-db.js";

const app = createApp();
afterAll(cleanup);

describe("GET /api/health (DB-checked)", () => {
  it("reports ok with the database reachable", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.db).toBe("ok");
  });
});

describe("backupDatabase", () => {
  it("writes a consistent copy that preserves data", async () => {
    const srcPath = join(tmpdir(), `mcpx-bak-src-${randomBytes(4).toString("hex")}.db`);
    const destDir = join(tmpdir(), `mcpx-bak-dest-${randomBytes(4).toString("hex")}`);
    const src = new Database(srcPath);
    src.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)");
    src.prepare("INSERT INTO t (v) VALUES (?)").run("hello");
    src.close();

    const dest = await backupDatabase(srcPath, destDir);
    expect(existsSync(dest)).toBe(true);

    const copy = new Database(dest, { readonly: true });
    const row = copy.prepare("SELECT v FROM t WHERE id = 1").get();
    copy.close();
    expect(row.v).toBe("hello");

    rmSync(srcPath, { force: true });
    rmSync(destDir, { recursive: true, force: true });
  });
});

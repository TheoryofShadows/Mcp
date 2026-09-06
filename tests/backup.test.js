import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, utimesSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveS3Config,
  objectKeyForBackup,
  pruneLocalBackups,
} from "../scripts/backup-db.js";
import {
  backupsEnabled,
  shouldRunBackup,
} from "../server/lib/backupScheduler.js";

describe("resolveS3Config", () => {
  it("returns null when no bucket is configured", () => {
    expect(resolveS3Config({})).toBeNull();
  });

  it("accepts AWS SDK env names", () => {
    const cfg = resolveS3Config({
      BACKUP_S3_BUCKET: "mcpx-backups",
      AWS_ACCESS_KEY_ID: "AKIA",
      AWS_SECRET_ACCESS_KEY: "secret",
      AWS_ENDPOINT_URL: "https://t3.storageapi.dev",
      AWS_REGION: "auto",
    });
    expect(cfg).toEqual({
      bucket: "mcpx-backups",
      accessKeyId: "AKIA",
      secretAccessKey: "secret",
      endpoint: "https://t3.storageapi.dev",
      region: "auto",
    });
  });

  it("accepts Railway bucket variable aliases", () => {
    const cfg = resolveS3Config({
      BUCKET: "mcpx-backups-abc123",
      ACCESS_KEY_ID: "tid",
      SECRET_ACCESS_KEY: "tsecret",
      ENDPOINT: "https://t3.storageapi.dev",
      REGION: "auto",
    });
    expect(cfg.bucket).toBe("mcpx-backups-abc123");
    expect(cfg.accessKeyId).toBe("tid");
    expect(cfg.endpoint).toBe("https://t3.storageapi.dev");
  });

  it("throws when bucket is set without credentials", () => {
    expect(() => resolveS3Config({ BACKUP_S3_BUCKET: "x" })).toThrow(/AWS_ACCESS_KEY_ID/);
  });
});

describe("objectKeyForBackup", () => {
  it("builds mcpx/YYYY/mm/dd/<filename>", () => {
    const when = new Date(Date.UTC(2026, 8, 6, 12, 0, 0));
    expect(objectKeyForBackup("/data/backups/mcpx-2026-09-06T12-00-00-000Z.db", when)).toBe(
      "mcpx/2026/09/06/mcpx-2026-09-06T12-00-00-000Z.db"
    );
  });
});

describe("pruneLocalBackups", () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mcpx-backup-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("keeps the newest N backups", () => {
    const now = Date.now() / 1000;
    for (let i = 0; i < 5; i++) {
      const p = join(dir, `mcpx-old-${i}.db`);
      writeFileSync(p, "x");
      utimesSync(p, now - i * 100, now - i * 100);
    }
    const { kept, removed } = pruneLocalBackups(dir, 3);
    expect(kept).toHaveLength(3);
    expect(removed).toHaveLength(2);
    expect(readdirSync(dir).sort()).toEqual(["mcpx-old-0.db", "mcpx-old-1.db", "mcpx-old-2.db"].sort());
  });
});

describe("backupScheduler gates", () => {
  it("is quiet without BACKUP_S3_BUCKET / BACKUP_ENABLED", () => {
    expect(backupsEnabled({})).toBe(false);
  });

  it("enables with BACKUP_ENABLED=1", () => {
    expect(backupsEnabled({ BACKUP_ENABLED: "1" })).toBe(true);
  });

  it("enables when bucket + creds present", () => {
    expect(
      backupsEnabled({
        BACKUP_S3_BUCKET: "b",
        AWS_ACCESS_KEY_ID: "a",
        AWS_SECRET_ACCESS_KEY: "s",
      })
    ).toBe(true);
  });

  it("shouldRunBackup when no files", () => {
    const dir = mkdtempSync(join(tmpdir(), "mcpx-empty-"));
    try {
      expect(shouldRunBackup(dir)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("shouldRunBackup false when fresh", () => {
    const dir = mkdtempSync(join(tmpdir(), "mcpx-fresh-"));
    try {
      writeFileSync(join(dir, "mcpx-fresh.db"), "x");
      expect(shouldRunBackup(dir, Date.now(), 23 * 60 * 60 * 1000)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const entry = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "server", "index.js"),
  "utf8"
);

// Node terminates the process on an unhandled promise rejection by default, so
// one unawaited rejection in a request path takes the site down for everyone
// until Railway restarts it. These guards are the difference between a logged
// error and an outage — assert they stay wired up.
describe("server crash guards", () => {
  it("handles unhandledRejection instead of letting the process die", () => {
    expect(entry).toMatch(/process\.on\(\s*["']unhandledRejection["']/);
  });

  it("handles uncaughtException", () => {
    expect(entry).toMatch(/process\.on\(\s*["']uncaughtException["']/);
  });

  it("reports both to the error tracker, not just the console", () => {
    const handlers = entry.slice(entry.indexOf("unhandledRejection"));
    expect(handlers).toContain("captureError");
  });

  it("imports captureError so the handlers cannot throw themselves", () => {
    expect(entry).toMatch(/import\s*\{[^}]*captureError[^}]*\}\s*from\s*["']\.\/lib\/observability\.js["']/);
  });

  it("still shuts down gracefully on SIGTERM", () => {
    expect(entry).toMatch(/process\.on\(\s*["']SIGTERM["']/);
  });
});

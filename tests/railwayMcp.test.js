import { describe, it, expect } from "vitest";
import {
  TOOL_DEFS, WRITE_TOOLS, isWriteEnabled, enabledTools, assertToolAllowed, redactVariables,
} from "../railway-mcp/lib.js";

describe("@mcpx/railway capability gating", () => {
  it("is read-only by default", () => {
    const names = enabledTools({}).map((t) => t.name);
    expect(names).toContain("list_projects");
    expect(names).not.toContain("trigger_deploy");
    expect(names.some((n) => WRITE_TOOLS.has(n))).toBe(false);
  });

  it("exposes write tools only when explicitly opted in", () => {
    expect(isWriteEnabled({})).toBe(false);
    expect(isWriteEnabled({ MCPX_RAILWAY_ALLOW_WRITE: "1" })).toBe(true);
    const names = enabledTools({ MCPX_RAILWAY_ALLOW_WRITE: "1" }).map((t) => t.name);
    expect(names).toContain("trigger_deploy");
    expect(names.length).toBe(TOOL_DEFS.length);
  });

  it("re-checks the write gate on call (defense in depth)", () => {
    expect(() => assertToolAllowed("trigger_deploy", {})).toThrow(/write/i);
    expect(() => assertToolAllowed("list_projects", {})).not.toThrow();
    expect(assertToolAllowed("trigger_deploy", { MCPX_RAILWAY_ALLOW_WRITE: "1" }).name).toBe("trigger_deploy");
  });

  it("rejects unknown tools", () => {
    expect(() => assertToolAllowed("rm_rf_everything", {})).toThrow(/unknown tool/i);
  });

  it("never returns secret variable values", () => {
    const redacted = redactVariables({ DATABASE_URL: "postgres://secret", API_KEY: "sk-live-xyz" });
    expect(redacted).toEqual({ DATABASE_URL: "***redacted***", API_KEY: "***redacted***" });
    expect(JSON.stringify(redacted)).not.toMatch(/secret|sk-live/);
  });
});

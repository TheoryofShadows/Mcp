/**
 * Audit logging — MCPX
 *
 * Records security- and safety-sensitive actions to a persistent `audit_events`
 * table so they survive process restarts (the previous implementation only
 * wrote to stdout, which vanished with the container). We *also* keep the
 * structured stdout line so real-time log aggregation still works unchanged.
 *
 * Persisting must never break the request it's auditing — a failed insert is
 * logged and swallowed, not thrown.
 */
import db from "../db.js";

const insertStmt = db.prepare(
  "INSERT INTO audit_events (action, actor, details) VALUES (?, ?, ?)"
);

/**
 * @param {string} action  dotted action name, e.g. "admin.server.delete"
 * @param {string} actor   who performed it (user id, username, descope sub, or ip)
 * @param {object} [details] arbitrary JSON-serializable context
 */
export function auditLog(action, actor, details = {}) {
  const actorStr = actor == null ? "unknown" : String(actor);
  try {
    insertStmt.run(action, actorStr, JSON.stringify(details));
  } catch (err) {
    console.error("[audit] failed to persist audit event:", err.message);
  }
  console.log(JSON.stringify({
    type: "audit", action, actor: actorStr, ...details,
    timestamp: new Date().toISOString(),
  }));
}

export default auditLog;

import { useState, useEffect, useCallback } from "react";
import { X, Copy, Check, ShieldCheck, AlertCircle } from "lucide-react";
import { getVerification, verifyRepo } from "../api/client";

/**
 * Walks a publisher through proving they control their server's repository:
 *   1. fetch a per-server token (.mcpx-verify challenge)
 *   2. they add the file to the repo root and push
 *   3. "Check now" clones + verifies → flips repo_verified, which unlocks the
 *      full provenance points in the Trust Score.
 *
 * Props: { server, onClose, onVerified }
 */
export default function VerifyRepoModal({ server, onClose, onVerified }) {
  const [info, setInfo] = useState(null);          // { token, filename, instructions, repo_verified }
  const [loadError, setLoadError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(null);      // { kind: "success"|"pending"|"error", message }
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let alive = true;
    getVerification(server.slug)
      .then((d) => { if (alive) setInfo(d); })
      .catch((e) => { if (alive) setLoadError(e.message); });
    return () => { alive = false; };
  }, [server.slug]);

  // Tick down the post-check cooldown (server enforces ~30s between attempts).
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const copyToken = useCallback(async () => {
    if (!info?.token) return;
    try { await navigator.clipboard.writeText(info.token); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [info]);

  async function check() {
    setChecking(true);
    setStatus(null);
    try {
      const res = await verifyRepo(server.slug);
      if (res.repo_verified) {
        setStatus({ kind: "success", message: res.message || "Repository ownership verified." });
        onVerified?.(server.slug);
      } else {
        setStatus({ kind: "pending", message: res.message || "Not verified yet." });
      }
    } catch (err) {
      const map = {
        422: "Token not found yet. Make sure the file is committed to the default branch, then check again.",
        429: "Just checked — wait a few seconds and try again.",
        502: "Couldn't reach the repository. Ensure it's public.",
      };
      setStatus({ kind: "error", message: map[err.status] || err.message });
      if (err.status === 429) setCooldown(30);
    } finally {
      setChecking(false);
      if (status?.kind !== "success") setCooldown((c) => (c > 0 ? c : 15));
    }
  }

  const verified = status?.kind === "success" || info?.repo_verified;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Verify repository ownership"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1000 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#12121c", border: "1px solid #1a1a28", borderRadius: "14px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid #1a1a28" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldCheck size={18} color="#10b981" />
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "16px" }}>Verify repository ownership</h2>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          <p style={{ fontSize: "13px", color: "var(--text-secondary, #9ca3af)", marginBottom: "16px", lineHeight: 1.6 }}>
            Proving you control <strong style={{ color: "#c4c9d4" }}>{server.repo_url || "your repository"}</strong> unlocks
            the full source-provenance points in your Trust Score.
          </p>

          {verified ? (
            <div style={{ display: "flex", gap: "10px", alignItems: "center", padding: "14px 16px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "10px" }}>
              <Check size={16} color="#10b981" />
              <span style={{ fontSize: "13px", color: "#34d399" }}>Verified — your repository ownership is confirmed.</span>
            </div>
          ) : loadError ? (
            <div style={{ display: "flex", gap: "10px", alignItems: "center", padding: "14px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "10px" }}>
              <AlertCircle size={16} color="#ef4444" />
              <span style={{ fontSize: "13px", color: "#f87171" }}>{loadError}</span>
            </div>
          ) : !info ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Loading…</p>
          ) : (
            <>
              <ol style={{ fontSize: "13px", color: "var(--text-secondary, #9ca3af)", lineHeight: 1.9, paddingLeft: "18px", margin: "0 0 16px" }}>
                <li>Create a file named <code style={{ background: "#1a1a28", padding: "1px 6px", borderRadius: "4px" }}>{info.filename}</code> in your repo root.</li>
                <li>Paste the token below as its only contents.</li>
                <li>Commit and push to the default branch, then click <strong>Check now</strong>.</li>
              </ol>

              <div style={{ background: "#0a0a0f", border: "1px solid #1a1a28", borderRadius: "8px", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "16px" }}>
                <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#c4c9d4", wordBreak: "break-all" }}>{info.token}</code>
                <button
                  onClick={copyToken}
                  style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "6px", border: "none", background: copied ? "rgba(16,185,129,0.12)" : "rgba(124, 108, 255,0.12)", color: copied ? "#10b981" : "#a594ff", cursor: "pointer", fontSize: "12px", fontFamily: "var(--font-mono)", flexShrink: 0 }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              {status && (
                <div
                  style={{
                    fontSize: "13px", padding: "10px 14px", borderRadius: "8px", marginBottom: "14px",
                    background: status.kind === "error" ? "rgba(239,68,68,0.08)" : "rgba(251, 191, 36,0.08)",
                    border: `1px solid ${status.kind === "error" ? "rgba(239,68,68,0.25)" : "rgba(251, 191, 36,0.25)"}`,
                    color: status.kind === "error" ? "#f87171" : "#fbbf24",
                  }}
                >
                  {status.message}
                </div>
              )}

              <button
                onClick={check}
                disabled={checking || cooldown > 0}
                style={{
                  width: "100%", padding: "12px", borderRadius: "10px", border: "none",
                  background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff",
                  fontSize: "13px", fontWeight: 600,
                  cursor: checking || cooldown > 0 ? "not-allowed" : "pointer",
                  opacity: checking || cooldown > 0 ? 0.7 : 1,
                }}
              >
                {checking ? "Checking…" : cooldown > 0 ? `Check again in ${cooldown}s` : "Check now"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

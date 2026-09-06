import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader, AlertCircle, CheckCircle, CreditCard, ArrowRight, Info } from "lucide-react";
import GithubIcon from "../components/icons/GithubIcon";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { createServer } from "../api/client";
import { SEED_CATEGORIES } from "../data/seed";

const CATEGORIES = SEED_CATEGORIES.filter((c) => c.id !== "all");

function parsePriceLabel(amount) {
  return `$${amount}/mo`;
}

async function fetchGitHubMeta(url) {
  // Extract owner/repo from URL
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error("Invalid GitHub URL");
  const [, owner, repo] = match;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error("Repository not found or private");
  const data = await res.json();
  const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
    headers: { Accept: "application/vnd.github.raw+json" },
  });
  const readme = readmeRes.ok ? await readmeRes.text() : "";
  return {
    name: data.name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: data.description || "",
    readme: readme.slice(0, 8000),
    author_name: owner,
    github_url: data.html_url,
  };
}

export default function Submit() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  const [githubUrl, setGithubUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [fetched, setFetched] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    readme: "",
    author_name: "",
    category_id: "dev",
    price_type: "free",
    price_amount: "",
    tags: "",
    install_command: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleFetch() {
    if (!githubUrl.trim()) return;
    setFetching(true);
    setFetchError("");
    try {
      const meta = await fetchGitHubMeta(githubUrl.trim());
      setForm((f) => ({
        ...f,
        name: meta.name,
        description: meta.description,
        readme: meta.readme,
        author_name: meta.author_name,
        install_command: `npx -y ${githubUrl.trim().replace("https://github.com/", "@").replace(/\/$/, "")}`,
      }));
      setFetched(true);
    } catch (e) {
      setFetchError(e.message);
    } finally {
      setFetching(false);
    }
  }

  function field(key) {
    return {
      value: form[key],
      onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      const tags = form.tags.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);

      if (supabase) {
        // Supabase backend (when configured)
        const slug = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const { error } = await supabase.from("servers").insert({
          slug,
          name: form.name,
          description: form.description,
          readme: form.readme,
          author_id: user.id,
          author_name: form.author_name || user.username,
          category_id: form.category_id,
          price_type: form.price_type,
          price_amount: form.price_type === "paid" ? Number(form.price_amount) : null,
          price_label: form.price_type === "paid" ? parsePriceLabel(form.price_amount) : "Free",
          repo_url: githubUrl,
          install_command: form.install_command,
          tags,
          gradient: "linear-gradient(135deg, #22d3ee, #14b8a6)",
          published: true, // Express path publishes active immediately; Supabase path marks published
        });
        if (error) throw error;
      } else {
        // Default deployment: persist through the Express API (SQLite).
        // price_amount is stored in cents server-side; the form collects dollars.
        await createServer({
          name: form.name,
          category_id: form.category_id,
          description: form.description,
          long_description: form.readme || "",
          price_type: form.price_type,
          price_amount: form.price_type === "paid" ? Math.round(Number(form.price_amount) * 100) : 0,
          repo_url: githubUrl || "",
          install_command: form.install_command || "",
          tags,
        });
      }

      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main style={{ maxWidth: "560px", margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
        <div
          style={{
            width: 64,
            height: 64,
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <CheckCircle size={28} color="#10b981" />
        </div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "26px", marginBottom: "12px" }}>
          Tool Published!
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "15px", lineHeight: 1.65, marginBottom: "32px" }}>
          Your tool is now live in the marketplace. Find it via search or your dashboard.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <Link
            to="/marketplace"
            style={{
              padding: "11px 22px",
              background: "linear-gradient(135deg, #22d3ee, #14b8a6)",
              borderRadius: "10px",
              color: "#fff",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            View Marketplace
          </Link>
          <Link
            to="/dashboard"
            style={{
              padding: "11px 22px",
              background: "#12121c",
              border: "1px solid #2e2e44",
              borderRadius: "10px",
              color: "var(--text-secondary)",
              textDecoration: "none",
              fontSize: "14px",
            }}
          >
            Go to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    background: "#0d0d15",
    border: "1px solid #2e2e44",
    borderRadius: "10px",
    color: "var(--text-primary)",
    fontSize: "14px",
    fontFamily: "var(--font-body)",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const labelStyle = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: "7px",
    fontFamily: "var(--font-mono)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  return (
    <main id="main-content" style={{ maxWidth: "680px", margin: "0 auto", padding: "48px 24px 80px" }}>
      <div style={{ marginBottom: "36px" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "28px", marginBottom: "8px", letterSpacing: "-0.5px" }}>
          Publish an MCP Tool
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
          Publish your MCP server to the marketplace. Earn 85% of subscription revenue.
        </p>
      </div>

      {/* GitHub URL fetch */}
      <div style={{ background: "#12121c", border: "1px solid #1d1d2b", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
        <label style={labelStyle}>
          <GithubIcon size={12} style={{ display: "inline", marginRight: "5px" }} />
          GitHub Repository URL
        </label>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="url"
            value={githubUrl}
            onChange={(e) => { setGithubUrl(e.target.value); setFetched(false); setFetchError(""); }}
            placeholder="https://github.com/owner/repo"
            style={{ ...inputStyle, flex: 1 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(34, 211, 238,0.4)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#2e2e44")}
          />
          <button
            type="button"
            onClick={handleFetch}
            disabled={fetching || !githubUrl.trim()}
            style={{
              padding: "11px 18px",
              background: fetching ? "#1d1d2b" : "rgba(34, 211, 238,0.15)",
              border: "1px solid rgba(34, 211, 238,0.3)",
              borderRadius: "10px",
              color: "#a5f3fc",
              fontSize: "13px",
              cursor: fetching ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {fetching ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowRight size={14} />}
            {fetching ? "Fetching…" : "Auto-fill"}
          </button>
        </div>
        {fetchError && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "10px", color: "#f87171", fontSize: "13px" }}>
            <AlertCircle size={13} /> {fetchError}
          </div>
        )}
        {fetched && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "10px", color: "#10b981", fontSize: "13px" }}>
            <CheckCircle size={13} /> Repository data loaded — review the fields below
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ background: "#12121c", border: "1px solid #1d1d2b", borderRadius: "14px", padding: "24px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "18px" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "16px", marginBottom: "4px" }}>Tool Details</h2>

          <div>
            <label style={labelStyle}>Tool Name *</label>
            <input type="text" required placeholder="My Awesome MCP Tool" style={inputStyle} {...field("name")}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(34, 211, 238,0.4)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2e2e44")}
            />
          </div>

          <div>
            <label style={labelStyle}>Author / Publisher *</label>
            <input type="text" required placeholder="your-github-username" style={inputStyle} {...field("author_name")}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(34, 211, 238,0.4)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2e2e44")}
            />
          </div>

          <div>
            <label style={labelStyle}>Description *</label>
            <textarea
              required
              rows={3}
              placeholder="Describe what your MCP tool does and what problems it solves…"
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              {...field("description")}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(34, 211, 238,0.4)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2e2e44")}
            />
          </div>

          <div>
            <label style={labelStyle}>Category *</label>
            <select required style={{ ...inputStyle, cursor: "pointer" }} {...field("category_id")}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(34, 211, 238,0.4)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2e2e44")}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Install Command</label>
            <input type="text" placeholder="npx -y @org/mcp-tool" style={inputStyle} {...field("install_command")}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(34, 211, 238,0.4)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2e2e44")}
            />
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "7px", lineHeight: 1.5 }}>
              The exact command to launch your server. Used by the install buttons and <code style={{ fontFamily: "var(--font-mono)" }}>npx mcpx install</code>.
              Without it, the installer falls back to a guessed package name.
            </p>
          </div>

          <div>
            <label style={labelStyle}>Tags (comma-separated)</label>
            <input type="text" placeholder="github, api, automation" style={inputStyle} {...field("tags")}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(34, 211, 238,0.4)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2e2e44")}
            />
          </div>
        </div>

        {/* Pricing */}
        <div style={{ background: "#12121c", border: "1px solid #1d1d2b", borderRadius: "14px", padding: "24px", marginBottom: "16px" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "16px", marginBottom: "18px" }}>Pricing</h2>

          <div style={{ display: "flex", gap: "10px", marginBottom: form.price_type === "paid" ? "16px" : "0" }}>
            {["free", "paid"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm((f) => ({ ...f, price_type: type }))}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "10px",
                  border: "1px solid",
                  borderColor: form.price_type === type ? "rgba(34, 211, 238,0.5)" : "#2e2e44",
                  background: form.price_type === type ? "rgba(34, 211, 238,0.1)" : "#0d0d15",
                  color: form.price_type === type ? "#a5f3fc" : "var(--text-secondary)",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  transition: "all 0.15s",
                }}
              >
                {type === "free" ? "🆓 Free" : "💳 Paid"}
              </button>
            ))}
          </div>

          {form.price_type === "paid" && (
            <div>
              <label style={labelStyle}>Monthly Price (USD) *</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "14px" }}>$</span>
                <input
                  type="number"
                  min="1"
                  max="999"
                  step="1"
                  required={form.price_type === "paid"}
                  placeholder="9"
                  style={{ ...inputStyle, paddingLeft: "28px" }}
                  {...field("price_amount")}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(34, 211, 238,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#2e2e44")}
                />
              </div>

              {/* Stripe placeholder */}
              <div
                style={{
                  marginTop: "16px",
                  padding: "16px",
                  background: "rgba(34, 211, 238,0.06)",
                  border: "1px solid rgba(34, 211, 238,0.15)",
                  borderRadius: "10px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                }}
              >
                <CreditCard size={16} color="#67e8f9" style={{ flexShrink: 0, marginTop: "1px" }} />
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Stripe Connect</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6 }}>
                    {/* TODO: Implement Stripe Connect onboarding flow */}
                    Connect your Stripe account to receive payouts. We take a 15% platform fee.
                    Stripe Connect onboarding will be available after approval.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* README */}
        <div style={{ background: "#12121c", border: "1px solid #1d1d2b", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
          <label style={{ ...labelStyle, marginBottom: "10px" }}>README / Documentation</label>
          <textarea
            rows={10}
            placeholder="## My Tool&#10;&#10;Paste your README markdown here…"
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, fontFamily: "var(--font-mono)", fontSize: "12.5px" }}
            {...field("readme")}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(34, 211, 238,0.4)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#2e2e44")}
          />
        </div>

        {!user && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              padding: "14px 16px",
              background: "rgba(251, 191, 36,0.08)",
              border: "1px solid rgba(251, 191, 36,0.2)",
              borderRadius: "10px",
              marginBottom: "16px",
            }}
          >
            <Info size={15} color="#fbbf24" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              You must be{" "}
              <Link to="/login" style={{ color: "#67e8f9" }}>signed in</Link>
              {" "}to submit a tool.
            </p>
          </div>
        )}

        {submitError && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", marginBottom: "16px", color: "#f87171", fontSize: "13px" }}>
            <AlertCircle size={14} /> {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            padding: "14px",
            background: submitting ? "#1d1d2b" : "linear-gradient(135deg, #22d3ee, #14b8a6)",
            border: "none",
            borderRadius: "10px",
            color: "#fff",
            fontSize: "15px",
            fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: submitting ? "none" : "0 0 24px rgba(34, 211, 238,0.3)",
            transition: "all 0.15s",
          }}
        >
          {submitting ? <Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowRight size={16} />}
          {submitting ? "Publishing…" : "Publish Tool"}
        </button>
      </form>
    </main>
  );
}

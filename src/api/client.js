// API base. In split deployments (static frontend on a separate host from the
// Node API), set VITE_API_BASE_URL to the API origin, e.g. https://your-api-host
// (just the host — we append "/api"). When unset — local dev, or single-service
// hosting where Express serves the SPA — we fall back to a relative "/api".
const API_HOST = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const BASE = `${API_HOST}/api`;

function getToken() {
  try {
    return localStorage.getItem("mcpx_token");
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  // 30-second timeout — prevents silent hangs on slow/dead server
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers, signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") throw new Error("Request timed out");
    throw err;
  }
  clearTimeout(timer);

  // Guard: server may return HTML (nginx 502, Express unhandled error) instead of JSON
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json")
    ? await res.json()
    : { error: `Server error (${res.status})` };

  if (!res.ok) {
    const msg = data.detail || data.error || `Request failed (${res.status})`;
    const error = new Error(msg);
    error.status = res.status;
    error.detail = data.detail;
    throw error;
  }

  return data;
}

// ─── Auth ───

export async function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email, username, password) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, username, password, display_name: username }),
  });
}

export async function getMe() {
  return request("/auth/me");
}

// ─── Servers ───

export async function fetchServers(params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, v);
  }
  return request(`/servers?${qs.toString()}`);
}

export async function fetchServer(slug) {
  return request(`/servers/${encodeURIComponent(slug)}`);
}

export async function createServer(data) {
  return request("/servers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function postReview(slug, rating, comment) {
  return request(`/servers/${encodeURIComponent(slug)}/reviews`, {
    method: "POST",
    body: JSON.stringify({ rating, comment }),
  });
}

export async function recordInstall(slug) {
  return request(`/servers/${encodeURIComponent(slug)}/install`, {
    method: "POST",
  });
}

// ─── Categories ───

export async function fetchCategories() {
  return request("/categories");
}

// ─── Stats ───

export async function fetchStats() {
  return request("/stats");
}

// ─── Tiers ───

export async function fetchTiers() {
  return request("/tiers");
}

export async function subscribeTier(tier) {
  const data = await request("/tiers/subscribe", {
    method: "POST",
    body: JSON.stringify({ tier }),
  });

  // Paid tiers: server returns { requires_payment: true, checkout_endpoint, tier }
  if (data?.requires_payment) {
    const checkout = await request("/payments/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ tier: data.tier }),
    });
    if (checkout?.checkout_url) {
      window.location.href = checkout.checkout_url;
      return null; // navigation in progress
    }
  }

  return data;
}

// ─── Stripe Payments ───

/** Redirect user to Stripe Checkout for a paid tool (destination charge). */
export async function toolCheckout(serverSlug) {
  const data = await request("/payments/stripe/tool-checkout", {
    method: "POST",
    body: JSON.stringify({ server_slug: serverSlug }),
  });
  if (data?.checkout_url) {
    window.location.href = data.checkout_url;
    return null;
  }
  return data;
}

/**
 * Start Stripe Connect onboarding (or get dashboard link if already onboarded).
 * Returns { onboarding_url } or { dashboard_url, onboarding_done: true }.
 */
export async function connectStripe() {
  return request("/payments/stripe/connect");
}

// ─── Admin ───

export async function adminFetchServers() {
  return request("/admin/servers");
}

export async function adminPatchServer(id, updates) {
  return request(`/admin/servers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function adminDeleteServer(id) {
  return request(`/admin/servers/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function adminFetchUsers() {
  return request("/admin/users");
}

const BASE = "/api";

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
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`);
    error.status = res.status;
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
    if (v !== undefined && v !== null && v !== "") {
      qs.set(k, v);
    }
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
  return request("/tiers/subscribe", {
    method: "POST",
    body: JSON.stringify({ tier }),
  });
}

// ─── Billing ───

export async function createCheckoutSession(tier) {
  return request("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ tier }),
  });
}

export async function createPortalSession() {
  return request("/billing/portal", { method: "POST" });
}

export async function getBillingStatus() {
  return request("/billing/status");
}

// ─── API Keys ───

export async function fetchApiKeys() {
  return request("/keys");
}

export async function createApiKey(name) {
  return request("/keys", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function revokeApiKey(id) {
  return request(`/keys/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ─── Publisher Stats ───

export async function fetchPublisherStats() {
  return request("/stats/publisher");
}

// ─── Collections ───

export async function fetchCollections() {
  return request("/collections");
}

export async function fetchFeatured() {
  return request("/servers/featured");
}

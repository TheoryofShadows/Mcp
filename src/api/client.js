const BASE = "/api";

const TOKEN_KEY = "mcpx_token";
const REFRESH_KEY = "mcpx_refresh_token";

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function storeTokens(token, refreshToken) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  } catch { /* storage unavailable */ }
}

export function clearTokens() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch { /* storage unavailable */ }
}

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  // Deduplicate concurrent refresh calls
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) {
        clearTokens();
        return false;
      }
      const data = await res.json();
      storeTokens(data.token, data.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request(path, options = {}, retried = false) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  // If 401 and we have a refresh token, try to refresh and retry once
  if (res.status === 401 && !retried && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request(path, options, true);
    }
  }

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

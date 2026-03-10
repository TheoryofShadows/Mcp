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

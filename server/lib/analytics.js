/**
 * Privacy-friendly page-view analytics for MCPX.
 *
 * Purpose: answer one question — "did my post (HN / Reddit / X) actually drive
 * traffic, and did any of it convert?" — without building surveillance.
 *
 * What we store per visit: path, referrer *host only*, and a UTC day. What we
 * deliberately DO NOT store: IP address, cookies, user id, user agent, full
 * referrer URL, or any fingerprint. That means no per-person tracking is even
 * possible from this table — by design.
 *
 * Pure helpers (referrerHost, recordView, summary) so they unit-test without HTTP.
 */

const RETENTION_DAYS = 180;

/**
 * Reduce a raw Referer header to a bare hostname for grouping, or null.
 * Full URLs (with paths/queries that can carry personal data) never get stored.
 * Known aggregators are normalized so "t.co" and "old.reddit.com" roll up.
 */
export function referrerHost(referer) {
  if (!referer || typeof referer !== "string") return null;
  let host;
  try {
    host = new URL(referer).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host) return null;
  host = host.replace(/^www\./, "");

  // Roll common variants up to a single recognizable source.
  const NORMALIZE = [
    [/(^|\.)reddit\.com$/, "reddit.com"],
    [/^t\.co$/, "twitter.com"],
    [/(^|\.)x\.com$/, "x.com"],
    [/(^|\.)twitter\.com$/, "twitter.com"],
    [/(^|\.)ycombinator\.com$/, "news.ycombinator.com"],
    [/(^|\.)google\./, "google"],
  ];
  for (const [re, label] of NORMALIZE) {
    if (re.test(host)) return label;
  }
  return host;
}

/** Only count real page navigations, not asset/API/bot noise. */
export function isTrackablePath(path) {
  if (!path || typeof path !== "string") return false;
  if (path.startsWith("/api/")) return false;
  if (/\.[a-z0-9]{2,5}$/i.test(path)) return false; // .js, .css, .png, .ico…
  return true;
}

/**
 * Record one page view. Never throws into the request path — analytics failing
 * must never break a page load.
 * @returns {boolean} whether a row was written
 */
export function recordView(db, { path, referer, now = new Date() }) {
  try {
    if (!isTrackablePath(path)) return false;
    const day = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    db.prepare(
      "INSERT INTO page_views (path, referrer_host, day) VALUES (?, ?, ?)"
    ).run(path.slice(0, 512), referrerHost(referer), day);
    return true;
  } catch {
    return false;
  }
}

/** Delete rows older than the retention window. Returns rows removed. */
export function pruneViews(db) {
  return db
    .prepare("DELETE FROM page_views WHERE created_at < datetime('now', ?)")
    .run(`-${RETENTION_DAYS} days`).changes;
}

/**
 * Traffic summary for the given window: totals, top referrers, top pages, and a
 * per-day series — the numbers that tell you whether a post landed.
 * @param {number} days - lookback window (default 30)
 */
export function summary(db, days = 30) {
  const since = `-${Math.max(1, Math.floor(days))} days`;

  const total = db
    .prepare("SELECT COUNT(*) AS n FROM page_views WHERE created_at >= datetime('now', ?)")
    .get(since).n;

  const topReferrers = db
    .prepare(
      `SELECT COALESCE(referrer_host, 'direct / none') AS source, COUNT(*) AS views
       FROM page_views
       WHERE created_at >= datetime('now', ?)
       GROUP BY source ORDER BY views DESC LIMIT 10`
    )
    .all(since);

  const topPages = db
    .prepare(
      `SELECT path, COUNT(*) AS views
       FROM page_views
       WHERE created_at >= datetime('now', ?)
       GROUP BY path ORDER BY views DESC LIMIT 10`
    )
    .all(since);

  const perDay = db
    .prepare(
      `SELECT day, COUNT(*) AS views
       FROM page_views
       WHERE created_at >= datetime('now', ?)
       GROUP BY day ORDER BY day ASC`
    )
    .all(since);

  return { window_days: days, total_views: total, top_referrers: topReferrers, top_pages: topPages, per_day: perDay };
}

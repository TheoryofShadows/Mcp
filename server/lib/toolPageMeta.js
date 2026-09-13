/**
 * Server-side Open Graph / Twitter meta for tool detail deep links.
 *
 * Client-side document.title updates help the browser tab, but Slack / X /
 * iMessage crawlers usually do not run JS — they only see the static
 * index.html shell. Injecting tool-specific tags in the SPA fallback makes
 * shared /tool/:slug links preview the listing instead of the homepage.
 */

const DEFAULT_DESCRIPTION =
  "Discover, install, and publish Model Context Protocol servers that supercharge Claude, Cursor, and VS Code.";

export function escapeHtmlAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Match /tool/:slug and /tools/:slug (both App routes). Slugs are [a-z0-9-].
 * @returns {string|null}
 */
export function parseToolSlugFromPath(path) {
  const clean = String(path || "").split("?")[0].split("#")[0];
  const m = clean.match(/^\/tools?\/([a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?)$/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * @param {{ slug: string, name: string, description?: string|null }} tool
 * @param {string} site  origin without trailing slash
 * @param {string} [path] request path to preserve /tool vs /tools in og:url
 */
export function buildToolShareMeta(tool, site = "https://www.mcpx.digital", path) {
  const name = String(tool?.name || "").trim() || "MCP tool";
  const slug = String(tool?.slug || "").trim();
  const title = `${name} · MCPX`;
  const rawDesc = String(tool?.description || "").trim();
  const description = (rawDesc || DEFAULT_DESCRIPTION).slice(0, 160);
  const base = String(site || "https://www.mcpx.digital").replace(/\/$/, "");
  const pathPart = path && parseToolSlugFromPath(path)
    ? String(path).split("?")[0]
    : slug
      ? `/tool/${slug}`
      : "/";
  return { title, description, url: `${base}${pathPart}` };
}

function replaceMetaByAttr(html, attrName, attrValue, content) {
  const re = new RegExp(
    `(<meta\\s+[^>]*${attrName}=["']${attrValue}["'][^>]*content=["'])([^"']*)(["'][^>]*>)`,
    "i"
  );
  if (re.test(html)) {
    return html.replace(re, `$1${content}$3`);
  }
  // Alternate attribute order: content before name/property
  const reAlt = new RegExp(
    `(<meta\\s+[^>]*content=["'])([^"']*)(["'][^>]*${attrName}=["']${attrValue}["'][^>]*>)`,
    "i"
  );
  if (reAlt.test(html)) {
    return html.replace(reAlt, `$1${content}$3`);
  }
  return html;
}

/**
 * Rewrite title / description / canonical / og+twitter tags in the SPA shell.
 * Pure string transform — safe to unit-test without Express.
 */
export function injectToolPageMeta(html, meta) {
  if (!html || !meta?.title) return html;
  const title = escapeHtmlAttr(meta.title);
  const description = escapeHtmlAttr(meta.description || DEFAULT_DESCRIPTION);
  const url = escapeHtmlAttr(meta.url || "https://www.mcpx.digital/");

  let out = html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
  out = replaceMetaByAttr(out, "name", "description", description);
  out = out.replace(
    /(<link\s+rel=["']canonical["']\s+href=["'])([^"']*)(["']\s*\/?>)/i,
    `$1${url}$3`
  );
  out = replaceMetaByAttr(out, "property", "og:title", title);
  out = replaceMetaByAttr(out, "property", "og:description", description);
  out = replaceMetaByAttr(out, "property", "og:url", url);
  out = replaceMetaByAttr(out, "name", "twitter:title", title);
  out = replaceMetaByAttr(out, "name", "twitter:description", description);
  return out;
}

export { DEFAULT_DESCRIPTION };

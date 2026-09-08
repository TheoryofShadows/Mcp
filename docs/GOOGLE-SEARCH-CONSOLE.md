# Getting mcpx.digital and thebookandme.com into Google Search Console

"Google dashboard" for a site you own = **Google Search Console** (GSC):
<https://search.google.com/search-console>. It is free, and it is where you see
what Google has indexed, what people searched to find you, and any errors
blocking indexing.

Sign in with the Google account you want to own these properties
(heatherjones530@gmail.com).

> **Note:** GSC reports on how Google *already* sees your site. It does not make
> a site rank. Adding a property does not change the site itself.

---

## Current status (checked 2026-09-07)

Run `node scripts/check-seo-setup.js` any time to re-check this.

| | mcpx.digital | thebookandme.com |
|---|---|---|
| Google TXT record | ❌ needs adding at Name.com | ✅ already verified |
| Canonical host | ❌ set `CANONICAL_HOST` in Railway | ✅ www already 301s to apex |
| sitemap.xml | ✅ live (43 URLs) | ✅ live (2,724 URLs) |

---

## Which verification method to use

GSC offers a **Domain** property (covers every subdomain and both http/https,
verified by DNS) and a **URL prefix** property (covers exactly one origin,
verified several ways).

**Prefer the Domain property for both sites.** It is one entry per site instead
of four, and it survives the apex/www split entirely.

It requires adding one DNS TXT record per domain. **The two domains are at
different registrars** — checked via their nameservers on 2026-09-07:

| Domain | DNS managed at | Where to add the TXT record |
|---|---|---|
| `mcpx.digital` | **Name.com** (`ns1kpv.name.com`, …) | name.com → My Domains → mcpx.digital → DNS Records |
| `thebookandme.com` | **Porkbun** (`fortaleza.ns.porkbun.com`, …) | porkbun.com → Domain Management → thebookandme.com → DNS |

> **Railway does not host mcpx.digital's DNS — a common mix-up.** Railway is
> where the records *point* (`www` is a CNAME to `n478mba1.up.railway.app`, the
> apex is an A record to Railway's edge), but the authoritative nameservers are
> Name.com's. Railway's dashboard tells you what values to set; it cannot create
> a TXT record for a zone it does not answer for.
> **The Google TXT record goes at Name.com.**

So log in to the right one for each site — this is the step most likely to trip
you up.

---

## Site 1 — mcpx.digital (Railway)

### Step 1. Add the property
GSC → property dropdown → **Add property** → **Domain** → enter `mcpx.digital`
(no `https://`, no `www`).

### Step 2. Verify by DNS
Google shows a TXT record like `google-site-verification=abc123...`.
Add it at **Name.com** for `mcpx.digital`:

| Field | Value |
|---|---|
| Type | `TXT` |
| Name / Host | `@` (or blank — means the root domain) |
| Value | the full `google-site-verification=...` string Google gives you |
| TTL | default |

Save, wait a few minutes, click **Verify**. If it fails, wait longer — DNS
propagation is sometimes slow — and try again. Nothing is lost by retrying.

### Step 3. Set the canonical host (IMPORTANT — do this once)
Both `mcpx.digital` and `www.mcpx.digital` currently serve the **full site**
with a `200`. Google treats that as two complete copies and splits ranking
signals between them.

The redirect that fixes it shipped in PR #92 but is **opt-in**. To turn it on:

> Railway dashboard → the `mcpx` service → **Variables** → add
> `CANONICAL_HOST` = `www.mcpx.digital` → deploy.

After it redeploys, confirm:

```bash
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://mcpx.digital/
# expect: 301 -> https://www.mcpx.digital/

curl -s -o /dev/null -w "%{http_code}\n" https://www.mcpx.digital/api/health
# expect: 200  (/api is never redirected, so Stripe webhooks are unaffected)
```

`www` is canonical because `sitemap.xml` and the `<link rel="canonical">` tag
already commit to it.

### Step 4. Submit the sitemap
GSC → **Sitemaps** → enter `sitemap.xml` → Submit.
Already live and valid: <https://www.mcpx.digital/sitemap.xml> (43 URLs).

---

## Site 2 — thebookandme.com (GitHub Pages)

**This domain is already Google-verified** — a `google-site-verification=W4a6n63k…`
TXT record is already live at Porkbun (confirmed 2026-09-07). So there is no DNS
work here: add the Domain property in GSC and it should verify immediately.
If it does not, the record may belong to a different Google account, in which
case add a fresh one alongside it — multiple verification TXT records can
coexist.

This site already redirects `www` → apex correctly, so there is no canonical
work to do. Its sitemap is large and healthy:
<https://thebookandme.com/sitemap.xml> (**2,724 URLs**).

GSC → **Sitemaps** → `sitemap.xml` → Submit.

> Because the sitemap uses the bare apex (`https://thebookandme.com/...`), a
> Domain property is the right choice — a URL-prefix property for the `www`
> version would report almost nothing.

### If DNS verification is not possible
Fall back to a **URL prefix** property for `https://thebookandme.com/` and use
the **HTML file** method: Google gives you a `google<hash>.html` file. Commit it
to `docs/` in the `The-Book` repo (that folder is the published site root) and
push. It will be live at `https://thebookandme.com/google<hash>.html`.

The MCPX equivalent is `public/` in the `Mcp` repo, served at the site root.

---

## After both are verified

- **Indexing takes days to weeks.** Submitting a sitemap is a request, not a
  command. Do not expect same-day numbers.
- Use **URL Inspection** on a single important page to force a re-crawl.
- Check **Pages** for anything reported as excluded, and **Performance** for the
  queries people actually use to find you.
- Neither site blocks crawling — both `robots.txt` files allow it (MCPX
  disallows only `/admin`, `/dashboard`, `/auth/`, `/api/`; The Book disallows
  only `/the-book.html`).

## Optional — Bing

Bing Webmaster Tools (<https://www.bing.com/webmasters>) can **import directly
from Search Console**, so once GSC is done Bing takes about a minute. This also
feeds ChatGPT search results, which is worth having for MCPX.

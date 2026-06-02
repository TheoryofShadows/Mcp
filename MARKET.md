# MCPX — Strategy Memo: How This Becomes a Category-Defining Company

> **What this is.** A founder-grade strategy memo with an investor-grade evidence appendix. The
> *analytical positions* are original arguments and stand on their reasoning. The *external facts*
> are now backed by cited sources (see inline links and the Appendix); confidence is noted where a
> figure is a market-research estimate or a secondary source. Researched and dated **2026-05-31**.

---

## TL;DR — the one-paragraph thesis

The consensus play ("be the App Store for MCP servers — list them, charge a subscription, take
30%") is a **trap**. MCP is a free, open protocol that, as of **Dec 9, 2025, is owned by no single
vendor** — it was donated to the **Agentic AI Foundation under the Linux Foundation** (co-founded
by Anthropic, Block, and OpenAI) — and it already has an **official open-source registry** that
acts as the upstream "registry of registries" every downstream marketplace ingests from. So a
directory-plus-take-rate has neither a moat nor pricing power. The defensible company is not a
*catalog of servers* — it is the **trust, routing, and settlement layer between agents and tools
at runtime**. Whoever becomes the place agents *call through* (not the place humans *browse*) owns
the only durable position: a usage-metered chokepoint that compounds with every call, where
**verification is the wedge, routing/telemetry is the lock-in, and settlement is the money**. The
directory is customer acquisition; the runtime is the business.

---

## Four contrarian positions (each with its strongest counterargument)

### Position 1 — A directory is a feature, not a company. The runtime gateway is the company.

**Claim.** Browsing-and-installing is a commodity. Anthropic's **official MCP Registry** (launched
Sept 8, 2025) is open-source and explicitly designed as upstream truth that "opinionated MCP
marketplaces" enrich downstream — i.e., the catalog layer is *officially* commoditized.[^reg]
Free directories already pile on: **Glama ~22–29k servers, mcp.so ~20k, PulseMCP ~12–16k, Smithery
~7k**.[^dirs] The non-commodity asset is the **gateway/proxy every agent routes tool calls
through**: auth brokering, policy, observability, caching, per-call metering. That is where you see
usage, and usage is the only thing you can meter and bill.

**Why it's right.** Marketplaces capture value at the point of *transaction*, not *discovery*.
Google didn't win by listing pages; it won the auction at the moment of intent. The MCP equivalent
of intent is the tool *call*, not the tool *listing*.

**Steelman against.** Agents may not want a third party in the hot path (latency, privacy, single
point of failure); a model vendor could ship a first-party gateway in its SDK; **and the gateway
land-grab is already underway** — Docker (MCP Gateway + 300+ verified signed-image catalog),
Cloudflare (MCP Server Portals), Composio (Tool Router), and Arcade.dev are all building exactly
this layer.[^infra] **Rebuttal:** the crowd validates the bet but doesn't close it — none of them
is the *neutral cross-vendor trust authority* (Docker/Cloudflare sell their own platform lock-in; a
model vendor grading its own ecosystem is conflicted). Ship an **open-source proxy devs want to
self-host**, win on neutral verification + data, and monetize the managed control plane (the
Sentry/GitLab pattern). The adjacent auth bet is already funded: **Arcade.dev raised $12M (Mar
2025)**.[^arcade] *Honest read: this is the most contested of the four positions — move fast or
don't play.*

### Position 2 — You cannot tax an open protocol. So don't. Sell trust, hosting, and settlement.

**Claim.** A take-rate on raw MCP traffic is largely *uncapturable* — the protocol is open,
servers self-host, and an agent can hit a server directly and bypass you. The empirical record is
unambiguous: **npm, Docker Hub, PyPI, GitHub Packages, and Hugging Face charge zero take-rate on
the open commons and monetize the private/enterprise side instead** — npm Teams ~$7/user/mo, Docker
Business $24/user/mo, GitHub Team $4/user/mo, Hugging Face ($4.5B valuation, ~$130M 2024 revenue)
via paid hosting/enterprise, not a download tax.[^npm][^docker][^ghp][^hf] Package **provenance is
free** (npm + Sigstore, GA 2023); the *paid* security layer is a separate product — **Snyk, ~$300M+
ARR, last valued $7.4B**.[^prov][^snyk]

**Why it's right.** Open standards route around tolls. Surviving revenue attaches to something
proprietary you *add*: a verification stamp enterprises trust, a private registry they can't
cheaply self-stand-up at quality, or a settlement rail that handles money.

**Steelman against.** Stripe and the App Store *do* take a % of otherwise-open activity.
**Rebuttal:** they own a genuinely hard asset — Stripe owns banking/fraud integration
(2.9%+$0.30, ~$70B valuation); Apple owns the device install base.[^stripe] A marketplace owns
neither unless it *builds* the equivalent. And app-store tolls are **eroding under regulation**
(post-*Epic* ruling Apple can't take a cut on external-link purchases; EU DMA forced the CTF
restructuring) — betting the company on a 30% toll is betting against the regulatory tide.[^epic]

### Position 3 — The buyer is the agent, not the human. Build for machine consumption first.

**Claim.** Every competitor builds a *website for humans to browse servers*. Wrong consumer. The
entity that "shops" for a tool is increasingly an **agent at runtime** doing semantic
tool-selection — and tool *sprawl* (~10k active servers, ~97M monthly SDK downloads as of Dec
2025) is already the bottleneck.[^lf] The winning product is a **machine-native selection API**
("which tool, which scopes, what cost, what trust score, for this task now?") with the human UI as
a thin management layer.

**Why it's right.** Agents measurably degrade when handed too many tools — the "context rot"
problem is documented (Chroma; Red Hat's Tool-RAG work), and the fix is *retrieving a minimal,
relevant tool subset per task*, not exposing the whole catalog.[^infra] Whoever solves runtime
tool-selection (rank, scope, budget-cap) becomes infrastructure the agent can't run without — far
stickier than a pretty catalog. The funding signal is here: **Composio raised $25M (Jul 2025)** to
connect agents to 3,000+ apps via a single Tool Router endpoint.[^composio]

**Steelman against.** Frameworks (LangChain — now a **$1.25B unicorn**, Oct 2025 — and the model
SDKs) will absorb tool-selection natively.[^lc] **Rebuttal:** likely true for the *selection
logic* — so don't sell the algorithm, sell the **data** that feeds it: real-world reliability,
cost, latency, and security telemetry per tool, collectible only by the entity in the call path. A
Bloomberg-for-tools data moat, not an algorithm.

### Position 4 — The endgame is agent-side settlement/identity; the marketplace is the trojan horse.

**Claim.** The biggest prize isn't marketplace revenue — it's being the **settlement and identity
layer for agent-to-tool commerce**. Agent-payment rails went from zero to a crowded field in ~18
months: **Stripe Agent Toolkit** (Nov 2024) and **Stripe×OpenAI Agentic Commerce Protocol** (Sept
29, 2025), **Coinbase x402** (May 2025; x402 Foundation with Cloudflare, Sept 2025), **Google's
Agent Payments Protocol / AP2** (Sept 16, 2025, 60+ partners incl. Mastercard/PayPal/Amex — and
**explicitly positioned as an extension to MCP**), **Skyfire** (agent wallets, $8.5M seed Aug
2024), plus **Mastercard Agent Pay / Visa Intelligent Commerce** and **PayPal×Perplexity Instant
Buy** (Nov 2025).[^pay] Agents will pay for tool calls autonomously, and soon. A marketplace that
already holds the supplier relationships and the call path is the natural **clearinghouse**:
identity, metering, billing, payout. The directory gets you the two-sided relationship; settlement
is the defensible business.

**Why it's right.** Whoever sits where money settles earns a durable take-rate (Stripe/Plaid
economics — Plaid raised $575M at $6.1B in Apr 2025 owning bank-connection rails), unlike whoever
sits where browsing happens (zero pricing power).[^plaid] Settlement *requires* a trusted neutral
intermediary — a role model vendors are structurally conflicted to play.

**Steelman against.** Payment rails are brutal, regulated, and contested by Stripe, Coinbase, and
the model vendors. **Rebuttal:** you don't *build the rail* — you're the **distribution + trust
layer on top of** whichever rail wins (AP2 being MCP-aware is the opening), owning the tool-maker
relationship and the agent's trust graph. Shopify on top of Stripe, not Stripe.

---

## Lens 1 — Moat & Market Positioning

**The real game is trust arbitrage + the runtime chokepoint — not distribution.**

| Candidate moat | Verdict | Why |
|---|---|---|
| Largest catalog | ❌ Weak | Official open registry + free directories zero it out; scrapeable.[^reg][^dirs] |
| Best human UX | ❌ Weak | Pretty, copyable, aimed at the wrong (human) buyer. |
| **Verification / trust** | ✅ Strong wedge | Enterprises won't run arbitrary servers (real CVEs below); a *neutral* certifier is credible where model vendors are conflicted. |
| **Runtime gateway data** | ✅ Strong lock-in | Only the call-path entity sees reliability/cost/security telemetry. Compounding. |
| **Settlement / identity** | ✅ Strongest, hardest | Where money clears, a real take-rate survives. |
| Network effects | ⚠️ Conditional | Two-sided — but only if you own the *transaction*, not the *listing*. |

**The trust gap is real and citable**, which is what makes verification a *product* not a feature:
tool-poisoning (Invariant Labs, Apr 2025), line-jumping (Trail of Bits, Apr 2025), **CVE-2025-49596**
MCP Inspector RCE (CVSS 9.4), **CVE-2025-6514** mcp-remote RCE (9.6), **MCPoison/CVE-2025-54136**
Cursor rug-pull, **Asana** cross-tenant exposure (~1,000 orgs), and the **postmark-mcp**
supply-chain backdoor. OWASP codified **MCP04:2025 supply-chain risk**.[^sec] Precedent that
verification sells: npm/Sigstore provenance (free trust layer) + Snyk (paid).[^prov][^snyk]

**Positioning statement:** *"MCPX is the trust and settlement layer for the agent economy — the
neutral place agents verify, route, and pay for tools."* Not *"the marketplace for MCP servers."*

**Who you're really fighting:** not other directories — the **official registry** (integrate, don't
fight) and the **cloud vendors** (AWS/Azure/Google), all of whom shipped MCP support in
2025.[^adopt] **Cross-vendor neutrality is your one structural advantage none of them can copy** —
and the Linux Foundation donation makes neutrality the ecosystem's explicit value, not just
yours.[^lf2]

## Lens 2 — Product / 10x Features (non-incremental bets)

1. **Trust Score + signed verification** — static analysis, sandboxed behavioral testing,
   permission diffing, public security grade. "Verified by MCPX" becomes the install gate.
   *Ship first — clearest enterprise pull.*
2. **Open-source runtime gateway** — self-hostable MCP proxy: OAuth brokering, scoped tokens,
   per-call policy, audit log, caching, metering. Viral free; monetized managed control plane.
3. **Machine-native selection API** — ranked, scoped, budget-capped tool set per task. Sell the
   *telemetry*, not the algorithm.
4. **Tool reliability telemetry ("Bloomberg for tools")** — uptime, latency, cost/call,
   breaking-change alerts; collectible only from the call path.
5. **Private/internal registries** — enterprise "internal app store" for sanctioned servers
   (the Backstage pattern; Spotify already monetizes a managed "Portal" atop the free framework —
   proof enterprises pay for a curated catalog layer); cleanest enterprise willingness-to-pay.[^idp]
6. **Agentic settlement** — metered billing + payouts atop whichever agent-payment rail wins.

## Lens 3 — Business Model / Monetization

**Kill the bet that fails:** a flat $29/$499 subscription on a catalog. It prices the weakest asset
(the listing) and is trivially undercut by free directories.

**Stack that survives, ordered by defensibility:**

1. **Verification / compliance (enterprise buyers)** — vetted servers, continuous monitoring,
   attestations, private registry. Highest willingness-to-pay, lowest leakage. **Start here.**
   (Comp: Snyk's paid security on top of free provenance.[^snyk][^prov])
2. **Managed gateway control plane (seat + usage)** — free OSS proxy; charge SSO, audit, policy,
   SLAs, multi-team. (Comp: npm Teams/Docker Business/GitHub seat model.[^npm][^docker][^ghp])
3. **Settlement take-rate (long game)** — a real % **only on money you actually clear** for
   tool-makers, never on protocol traffic you merely observe. (Comp: Stripe/Plaid rails.[^stripe][^plaid])
4. **Tool-maker growth tools** — analytics, A/B, promoted placement; modest, ad-like.

**The hard truth (Position 2):** do **not** model a take-rate on raw MCP call volume — it leaks to
zero. Benchmark reality: pure marketplaces that *do* charge are either eroding (Apple/Google 30%/15%
under legal pressure) or low-single-digit B2B (**AWS Marketplace 1.5–3%**); the one high-rate API
marketplace, **RapidAPI, takes 25%** — but it owns billing/hosting, not an open protocol.[^aws][^rapid]

## Lens 4 — Investor Narrative

**Reframe "App Store for AI" → "Stripe + Verisign for the agent economy."** The App Store framing
invites the killer question *"why won't the model vendor own the store?"* The trust-and-settlement
framing answers it: **neutrality across model vendors is the product**, and a model vendor is
structurally conflicted to provide it — a point the Linux Foundation donation makes structural,
not aspirational.[^lf2]

**Sizing — lead with the spread, not a single number (all market-research TAMs are medium/low
confidence; definitions vary ~2x):**

| Forecaster | Figure | Horizon | CAGR |
|---|---|---|---|
| Grand View Research (enterprise agentic AI) | $2.58B (2024) → **$24.5B** | 2030 | 46.2% |
| MarketsandMarkets (AI agents) | $7.84B (2025) → **$52.6B** | 2030 | 46.3% |
| Precedence Research (agentic AI) | $7.55B (2025) → **$199B** | 2034 | 43.8% |
| MarkNtel (bearish outlier) | $6.73B (2024) → $33.2B | 2030 | **30.5%** |

The ~2x divergence at the same horizon is *definitional* (what counts as an "agent"), not a
growth-rate dispute — CAGRs cluster **44–46%**.[^tam] **Don't sell one number; sell the convergence
of a bottom-up build** (# servers × verification ARPU + gateway seats × enterprises + settlement
GMV × take-rate).

**The bull/bear tension is sharpest inside Gartner itself** — and it *favors* this thesis:
**"40%+ of agentic AI projects will be canceled by 2027,"** AI agents sit at the **"Peak of
Inflated Expectations,"** and "agent washing" means only ~130 of thousands of vendors are real —
*yet* Gartner also projects **15% of work decisions autonomous and 33% of enterprise apps agentic
by 2028**.[^gartner] Translation: a shakeout is coming, and shakeouts **consolidate value into
trusted infrastructure** — exactly the position MCPX should claim.

**Comparable exits/valuations that anchor the model:** Hugging Face $4.5B (open hub → paid
hosting), Snyk $7.4B (trust layer), Stripe ~$70B / Plaid $6.1B (settlement rails), LangChain
$1.25B (agent infra).[^hf][^snyk][^stripe][^plaid][^lc]

**Three things an investor must believe:**
1. MCP (or successor) is the durable cross-vendor tool standard. *(Supported: OpenAI, Google,
   Microsoft, AWS, GitHub all shipped MCP in 2025; donated to the Linux Foundation Dec 2025.)*[^adopt][^lf2]
2. Trust + settlement, not discovery, is where value accrues — and a neutral party owns it best.
3. This team can get into the **call path** before the gateway commoditizes.

**Risks to underwrite honestly:** (a) model vendors bundle a first-party gateway; (b) protocol
fragments/is replaced; (c) trust/verification proves a feature, not a company; (d) settlement is
won by Stripe/Coinbase first; (e) the agentic-AI hype unwind (Gartner's 40% cancellation) drags
the category before infra consolidates.

---

## What to build in the next 90 days

1. Ship the **Trust Score + "Verified" badge** — wedge with the clearest enterprise pull.
2. Open-source a **minimal MCP gateway/proxy** — get into the call path, start the telemetry moat.
3. Land **3 enterprise private-registry** design partners — fastest real revenue + WTP proof.
4. **Integrate the official Anthropic/LF registry** as upstream — stop competing on the catalog;
   compete on trust.

---

## Appendix — Sources & confidence

Confidence: **H** primary/official, **M** reputable secondary or estimate, **L** opinion/unverified.

[^reg]: Official MCP Registry preview, launched 2025-09-08; open-source, upstream "subregistries enrich downstream" model. blog.modelcontextprotocol.io/posts/2025-09-08-mcp-registry-preview/ — **H**
[^dirs]: Server counts by directory (Glama ~22–29k, mcp.so ~20k, PulseMCP ~12–16k, Smithery ~7k), May 2026 snapshots; vary by source. glama.ai/mcp/servers; digitalapplied.com MCP H1-2026 retrospective. Smithery seed from South Park Commons (a16z association **unconfirmed/incorrect**). — **M**
[^arcade]: Arcade.dev $12M seed (authenticated agent tool-calling), led by Laude Ventures. techcrunch.com 2025-03-18. — **H**
[^npm]: npm Teams ~$7/user/mo; open registry has no install take-rate. docs.npmjs.com/upgrading-to-a-paid-organization-plan — **H** model / **M** exact $
[^docker]: Docker Business $24/user/mo (annual); paid tiers get unlimited pulls (Apr 2025); pull limits are a free-tier lever. docker.com/blog/november-2024-updated-plans-announcement; docker.com/pricing — **H** model / **M** exact $
[^ghp]: GitHub Packages free for public; GitHub Team $4/user/mo, Enterprise $21. docs.github.com/billing; github.com/pricing — **H** model / **M** exact $
[^hf]: Hugging Face $4.5B valuation ($235M Series D, Aug 2023); ~$130M 2024 revenue (est., up from ~$70M 2023); monetizes via Pro $9/mo, Enterprise from $20/user/mo, Inference Endpoints. techcrunch.com 2023-08-24; sacra.com/c/hugging-face — **H** valuation / **M** revenue est.
[^prov]: npm package provenance (Sigstore-backed) free, GA 2023, SLSA Build L2. github.blog introducing-npm-package-provenance; blog.sigstore.dev/npm-provenance-ga — **H**
[^snyk]: Snyk ~$300M+ ARR (2024 figures vary $278–344M); last valued $7.4B (Dec 2022); Team $25/dev/mo, free tier exists. sacra.com/c/snyk; snyk.io/plans — **M** financials / **H** model
[^stripe]: Stripe 2.9%+$0.30 per charge; ~$65–70B valuation (2024 tenders). stripe.com/pricing — **H** pricing / **M** valuation
[^epic]: Post-*Epic v. Apple* (2025) Apple barred from commission on external-link purchases in US; EU DMA forced Core Technology Fee → 5% Core Technology Commission restructuring. en.wikipedia.org/wiki/Epic_Games_v._Apple; macrumors.com CTF coverage — **H** ruling / **M** evolving DMA terms
[^aws]: AWS Marketplace listing fees (Jan 2024): 3% public SaaS; private offers 3%/2%/1.5% by TCV. aws.amazon.com/about-aws/whats-new/2024/01/aws-marketplace-simplified-reduced-listing-fees — **H**
[^rapid]: RapidAPI flat 25% marketplace fee (providers keep 75%); metered billing supported. docs.rapidapi.com/docs/payouts-and-finance — **H**
[^plaid]: Plaid $575M at $6.1B (Apr 2025), down from $13.4B (2021); usage-based, owns bank-connection rails. techcrunch.com 2025-04-03; cnbc.com 2025-04-03 — **H**
[^lc]: LangChain $125M Series B at $1.25B (Oct 2025), led by IVP; ~$260M raised total. langchain.com/blog/series-b; fortune.com 2025-10-20 — **H**
[^composio]: Composio $25M Series A (Jul 2025), led by Lightspeed; connects agents to 3,000+ apps. siliconangle.com 2025-07-22 — **H** round / **L** valuation
[^lf]: ~97M monthly SDK downloads, ~10,000 active servers (Dec 9, 2025). Linux Foundation / Anthropic. — **H**
[^lf2]: MCP donated to Agentic AI Foundation under the Linux Foundation, 2025-12-09 (co-founded Anthropic, Block, OpenAI; support from Google, Microsoft, AWS, Cloudflare, Bloomberg). linuxfoundation.org press; anthropic.com/news/donating-the-model-context-protocol... — **H**
[^adopt]: 2025 cross-vendor MCP adoption: OpenAI Agents SDK (~Mar 2025), Google/Gemini (Apr 9 2025), Microsoft Copilot Studio (Mar 2025) + Windows (Ignite Nov 2025), AWS (May 2025), GitHub (Apr 4 2025). Respective primary blogs/changelogs; techcrunch.com 2025-04-09 — **H** (months) / **M** (exact days)
[^sec]: MCP attack research/CVEs: tool poisoning (Invariant Labs, 2025-04-01); line-jumping (Trail of Bits, 2025-04-21); CVE-2025-49596 (MCP Inspector RCE, CVSS 9.4); CVE-2025-6514 (mcp-remote RCE, 9.6, JFrog); CVE-2025-54136 "MCPoison" (Cursor, Check Point); Asana cross-tenant exposure (~1,000 orgs, Jun 2025); postmark-mcp backdoor (Sep 2025); OWASP MCP04:2025 supply-chain. Respective vendor blogs + owasp.org/www-project-mcp-top-10 — **H** (most) / **M** (some figures)
[^tam]: Agentic-AI TAM spread: GVR $24.5B/2030 (46.2%), M&M $52.6B/2030 (46.3%), Precedence $199B/2034 (43.8%), MarkNtel $33.2B/2030 (30.5%). All **M/L** — market-research estimates, definition-dependent. Respective firm report pages.
[^gartner]: Gartner (2025-06-25): >40% of agentic AI projects canceled by 2027; "agent washing" (~130 real vendors); 15% of work decisions autonomous & 33% of enterprise apps agentic by 2028. (2025-08-05) AI agents at Peak of Inflated Expectations. gartner.com newsroom — **H** (quoted text; direct fetch was 403, corroborated by multiple outlets)
[^pay]: Agent-payment rails: Stripe Agent Toolkit (Nov 2024, stripe.com/blog/giving-agents-the-ability-to-pay); Stripe×OpenAI Agentic Commerce Protocol (2025-09-29, stripe.com/newsroom); Coinbase x402 (2025-05-06, github.com/coinbase/x402) + x402 Foundation w/ Cloudflare (2025-09-23); Google AP2 (2025-09-16, 60+ partners, Intent/Cart/Payment mandates, extends A2A + MCP; cloud.google.com/blog AP2); Skyfire ($8.5M seed 2024-08-21, agent wallets, techcrunch.com); Mastercard Agent Pay / Visa Intelligent Commerce (2025, trade press — **M**); PayPal×Perplexity Instant Buy (2025-11-25, paypal newsroom). — **H** (most) / **M** (card-network dates, exact days)
[^infra]: MCP gateway/routing infra already shipping: Docker MCP Catalog (300+ verified signed images) + open-source MCP Gateway (isolated containers, routing, logging); Cloudflare MCP Server Portals (OAuth 2.1 provider, centralized auth/observability, open beta ~Aug 2025); Composio Tool Router (1,000+ apps via one MCP endpoint); Arcade.dev MCP runtime (per-user OAuth). docker.com/blog/docker-mcp-gateway...; blog.cloudflare.com/zero-trust-mcp-server-portals; composio.dev; arcade.dev — **H**. Tool-sprawl/"context rot" evidence for runtime selection: Chroma context-rot study; Red Hat Tool-RAG (next.redhat.com 2025-11-26). — **H** problem / **M** exact figures
[^idp]: Internal developer portal analogy: Backstage (Spotify, OSS 2020, CNCF Incubating) — Software Catalog + golden paths; Spotify monetizes via premium plugins (since 2022) and managed "Spotify Portal" (GA ~Oct 2025), i.e. paid curated catalog atop free framework. backstage.spotify.com — **H** model / **M** vendor-reported adoption stats

*Drafted on `claude/market-growth-analysis-RNXNO`. Positions are deliberately falsifiable — argue with them.*

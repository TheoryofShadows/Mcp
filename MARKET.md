# MCPX — Strategy Memo: How This Becomes a Category-Defining Company

> **Status of this document.** This is a founder-grade strategy memo. The *analytical
> positions* are original arguments and stand on their own reasoning. The *external facts and
> figures* are written from working knowledge of the MCP ecosystem as of early 2026 and are
> marked **`[VERIFY]`** wherever a number or dated event needs a live-source citation before it
> goes in front of an investor. A cited evidence appendix is stubbed at the bottom and will be
> hardened in a follow-up research pass.

---

## TL;DR — the one-paragraph thesis

The consensus play ("be the App Store for MCP servers — list them, charge a subscription, take
30%") is a **trap**: MCP is a free, open protocol with an official Anthropic registry, so a
directory-plus-take-rate has no moat and no pricing power. The defensible company is not a
*catalog of servers* — it is the **trust, routing, and settlement layer that sits between agents
and tools at runtime**. Whoever becomes the place agents *call through* (not the place humans
*browse*) owns the only durable position: a usage-metered chokepoint that gets more valuable with
every call, where verification is the wedge, routing is the lock-in, and settlement is the
money. Directories are a customer-acquisition cost; the runtime is the business.

---

## Four contrarian positions (each with its strongest counterargument)

### Position 1 — A directory is a feature, not a company. The runtime gateway is the company.

**Claim.** Browsing-and-installing is a commodity that Anthropic's official registry `[VERIFY]`,
GitHub, and a dozen free directories (Smithery, Glama, PulseMCP, mcp.so `[VERIFY]`) already give
away. The non-commodity asset is the **gateway/proxy every agent routes its tool calls through**:
auth brokering, policy enforcement, observability, caching, and per-call metering. That is where
you see usage, and usage is the only thing you can meter and bill.

**Why it's right.** Marketplaces capture value at the point of *transaction*, not the point of
*discovery*. Google didn't win by listing websites; it won the ad auction at the moment of intent.
The MCP equivalent of "the moment of intent" is the tool *call*, not the tool *listing*.

**Steelman against.** Gateways are infrastructure agents may not want a third party in the hot
path of (latency, privacy, a single point of failure). Anthropic/OpenAI could ship a first-party
gateway in their SDKs and make yours redundant. **Rebuttal:** that risk is real, which is exactly
why the wedge must be *trust/verification* (a neutral third party is more credible than a model
vendor grading its own ecosystem) and why you ship as an open-source proxy developers *want* to
self-host, then monetize the managed/enterprise control plane (the Sentry/GitLab pattern).

### Position 2 — You cannot tax an open protocol. So don't. Sell trust and settlement instead.

**Claim.** A take-rate on MCP traffic is largely *uncapturable* — the protocol is open, servers
are self-hostable, and anyone can point an agent directly at a server and bypass you. Every
business model that assumes "we skim X% of all MCP calls because we're the marketplace" will leak
to zero. npm never charged a take-rate on `npm install`; Docker never taxed `docker pull`. They
monetized **private hosting, teams, and security/provenance** `[VERIFY]`.

**Why it's right.** Open standards route around tolls. The only revenue that survives is revenue
attached to something proprietary you *add*: a verification stamp enterprises trust, a private
registry they can't easily self-stand-up at quality, or a settlement rail that handles money
(money requires a trusted intermediary by definition).

**Steelman against.** Stripe and the App Store *do* take a percentage of an otherwise-open
activity (moving money / distributing software). **Rebuttal:** they do it because they own a
genuinely hard-to-replicate asset — Stripe owns the banking/fraud integration; Apple owns the
device install base. A marketplace owns neither unless it *builds* the equivalent hard asset.
For MCPX that hard asset is **agent-payment settlement + identity** (see Position 4), not the
listing.

### Position 3 — The buyer is the agent, not the human. Build for machine consumption first.

**Claim.** Every competitor is building a *website for humans to browse MCP servers*. That is
optimizing for the wrong consumer. By 2026 the entity that "shops" for a tool is increasingly an
**agent at runtime** doing semantic tool-selection. The winning product is a **machine-native
discovery + selection API** ("which tool, with which scopes, at what cost, with what trust score,
for this task right now?") that agents query programmatically — with the human UI as a thin
management layer on top.

**Why it's right.** Tool *sprawl* is already the bottleneck: agents degrade when handed hundreds
of tools. Whoever solves runtime tool-selection (rank, filter, scope, budget-cap) becomes
infrastructure the agent can't run without. That is a far stickier position than a pretty catalog.

**Steelman against.** Frameworks (LangChain, the model SDKs) will absorb tool-selection as a
native feature, commoditizing it. **Rebuttal:** likely true for *selection logic* — so don't sell
the algorithm, sell the **data** that feeds it: real-world reliability, cost, latency, and
security telemetry per tool, which only the entity in the call path can collect. The model is a
Bloomberg-for-tools data moat, not an algorithm.

### Position 4 — The endgame is agent-side payments/identity, and the marketplace is the trojan horse.

**Claim.** The largest prize is not marketplace revenue — it's being the **settlement and identity
layer for agent-to-tool commerce**. Emerging agent-payment protocols (Stripe's agent toolkit,
x402, Google's Agent Payments Protocol/AP2, Skyfire `[VERIFY]`) signal that agents will soon *pay*
for tool calls autonomously. A marketplace that already holds the supplier relationships and the
call path is the natural place to become the **clearinghouse**: identity, metering, billing,
payout. The directory is the trojan horse that gets you the two-sided relationship; payments is
the business that's actually defensible.

**Why it's right.** Whoever sits where the money settles earns a real, durable take-rate (Stripe
economics), unlike whoever sits where the browsing happens (zero pricing power). Payments need a
trusted neutral intermediary — a role a model vendor is structurally conflicted to play.

**Steelman against.** Payment rails are brutally hard, regulated, and already contested by Stripe,
Coinbase, and the model vendors themselves. A small marketplace has no right to win here.
**Rebuttal:** correct that you won't *build the rail* — you'll be the **distribution and trust
layer on top of** whichever rail wins, owning the merchant (tool-maker) relationship and the
agent's trust graph. You're the Shopify on top of the Stripe, not the Stripe.

---

## Lens 1 — Moat & Market Positioning

**The real game is not distribution. It's trust arbitrage + the runtime chokepoint.**

| Candidate moat | Verdict | Why |
|---|---|---|
| Largest catalog | ❌ Weak | Free directories + the official registry zero this out. Scrapeable. |
| Best human UX | ❌ Weak | Pretty, copyable, and aimed at the wrong (human) buyer. |
| **Verification / trust** | ✅ Strong wedge | Enterprises won't run arbitrary third-party servers; a *neutral* certifier is credible where model vendors are conflicted. |
| **Runtime gateway data** | ✅ Strong lock-in | Only the entity in the call path sees reliability/cost/security telemetry. Compounding data moat. |
| **Settlement / identity** | ✅ Strongest, hardest | Where money clears, a real take-rate survives. |
| Network effects | ⚠️ Conditional | Two-sided, but *only* if you own the transaction, not the listing. |

**Positioning statement:** *"MCPX is the trust and settlement layer for the agent economy — the
neutral place agents verify, route, and pay for tools."* Not *"the marketplace for MCP servers."*

**Who you're really fighting:** not other directories — **Anthropic's official registry** (which
makes the catalog a commodity, and which you should *integrate with*, not fight) and the **cloud
vendors** (AWS/Azure/Google) who can bundle a registry into their agent platforms `[VERIFY]`.
Neutrality across model vendors is your one structural advantage none of them can copy.

## Lens 2 — Product / 10x Features (non-incremental bets)

1. **Trust Score + signed verification.** Static analysis, sandboxed behavioral testing, permission
   diffing, and a public security grade per server. The "Verified by MCPX" badge becomes the thing
   enterprises gate installs on. *This is the wedge — ship it first.*
2. **Runtime gateway (open-source).** A self-hostable MCP proxy: OAuth brokering, scoped tokens,
   per-call policy, audit log, caching, and metering. Free and viral on the dev side; monetized as
   a managed enterprise control plane.
3. **Machine-native selection API.** `POST /select-tool` → ranked, scoped, budget-capped tool set
   for a task. Sells the *telemetry data*, not the algorithm.
4. **Tool reliability telemetry ("Bloomberg for tools").** Live uptime, latency, cost-per-call,
   breaking-change alerts — data only the call-path entity can collect.
5. **Private/internal registries.** Enterprise "internal app store" for sanctioned MCP servers
   (the Backstage pattern) — the cleanest enterprise wedge with obvious willingness-to-pay.
6. **Agentic settlement.** Metered billing + payouts so a tool-maker can charge per call and an
   agent can pay autonomously — sitting on top of whichever payment protocol wins.

## Lens 3 — Business Model / Monetization

**Kill the bet that fails:** a flat $29/$499 subscription on a catalog. It's priced against the
weakest asset (the listing) and is trivially undercut by free directories.

**Stack that survives, in order of defensibility:**

1. **Verification/compliance (sell to enterprise buyers).** Pay for vetted servers, continuous
   monitoring, SOC2-grade attestations, private registry. *Highest willingness-to-pay, lowest
   leakage.* Start here.
2. **Managed gateway control plane (seat + usage).** Free OSS proxy; charge for SSO, audit, policy,
   SLAs, multi-team.
3. **Settlement take-rate (long game).** A real percentage — but only on **money you actually clear**
   for tool-makers, not on protocol traffic you merely observe. This is the one defensible take-rate.
4. **Tool-maker growth tools.** Analytics, A/B, promoted placement — *modest*, ad-like revenue.

**The hard truth (Position 2):** do **not** model a take-rate on raw MCP call volume. It leaks to
zero. Model revenue only against things you proprietarily add — trust, hosting, or settlement.

## Lens 4 — Investor Narrative

**Sharpen the pitch from "App Store for AI" → "Stripe + Verisign for the agent economy."**
The App Store framing invites the killer question *"why won't the model vendor own the store?"*
The trust-and-settlement framing answers it: **neutrality across model vendors is the product**,
and a model vendor is structurally conflicted to provide it.

**Sizing (must be rebuilt with live sources — current figures are illustrative `[VERIFY]`):**
- Top-down: agentic-AI TAM forecasts span enormously across analysts — anchor to the *spread*, not
  one number, and note that even bearish takes (e.g., Gartner's "many agent projects will be
  cancelled" line `[VERIFY]`) imply a *consolidation toward trusted infrastructure* — which is you.
- Bottom-up: # MCP servers × verification ARPU + gateway seats × enterprises + settlement GMV ×
  take-rate. This is the credible, defensible build — show it converging from below.
- Comparables for the take-rate story: Stripe/Plaid (rails), RapidAPI (~20% on metered API calls
  `[VERIFY]`), Hugging Face (monetizing an open hub via hosting/enterprise `[VERIFY]`), Snyk/Sigstore
  (security/provenance as a paid layer `[VERIFY]`).

**The three things an investor must believe:**
1. MCP (or its successor) becomes the durable cross-vendor tool standard. *(Adoption by OpenAI,
   Google, Microsoft, AWS through 2025 supports this `[VERIFY]`.)*
2. Trust + settlement, not discovery, is where the value accrues — and a neutral third party is
   best positioned to own it.
3. This team can get into the **call path** before the gateway becomes a commodity.

**Biggest risks to underwrite honestly:** (a) model vendors bundle a first-party gateway; (b) the
protocol fragments or is replaced; (c) trust/verification proves to be a feature, not a company;
(d) settlement is won by Stripe/Coinbase before MCPX reaches escape velocity.

---

## What to build in the next 90 days (so the memo isn't just words)

1. Ship the **Trust Score + "Verified" badge** — the wedge with the clearest enterprise pull.
2. Open-source a **minimal MCP gateway/proxy** to get into the call path and start collecting
   telemetry (the data moat compounds from day one).
3. Land **3 enterprise private-registry** design partners — fastest path to real revenue and the
   only proof that willingness-to-pay is real.
4. **Integrate** the official Anthropic registry as upstream — stop competing on the catalog;
   compete on trust.

---

## Appendix — Evidence to verify (live-source pass pending)

Every `[VERIFY]` above maps to a claim to be cited in the follow-up research pass:
MCP launch/adoption timeline and cross-vendor support; existence/scope of the official registry;
server counts across Smithery/Glama/PulseMCP/mcp.so; named MCP security research (tool poisoning,
rug-pull, line-jumping); agent-payment protocols (Stripe agent toolkit, x402, AP2, Skyfire);
comparable take-rates and valuations (App Store 30/15, RapidAPI ~20%, Hugging Face, Snyk/Sigstore,
Docker/npm monetization); and agentic-AI TAM forecasts with their inter-analyst spread.

*Drafted on the `claude/market-growth-analysis-RNXNO` branch. Positions are deliberately
opinionated and falsifiable — argue with them.*

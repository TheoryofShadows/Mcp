# Going Live on Solana (mainnet-beta) — Handoff

**Status of the code:** ✅ Ready. The Solana Pay path is cluster-agnostic,
validates the treasury wallet, prices in real USD→SOL from a live feed, and
verifies every purchase on-chain against the exact amounts locked at request
time. Nothing in the code hardcodes devnet.

**What's left is configuration + real funds — steps only you can do.** This
doc is the exact checklist. Do them in order. Nothing here moves money until
the final step.

---

## Why Claude did not do these steps

Flipping to mainnet means (a) creating/holding a wallet with a real private
key, and (b) pointing real customer payments at it. Handling private keys and
authorizing real fund flows are yours to own — an assistant setting these would
be putting your money behind a config it can't be accountable for. So the code
is done; the switch is yours.

---

## Pre-flight (do once, on devnet, before touching mainnet)

1. Confirm the live site already reports Stripe as live and healthy:
   ```
   curl https://mcpx.digital/api/payments/stripe/config
   # expect: "mode":"live", "webhook_secret_set":true, "label":"Live (mainnet money)"
   ```
2. Confirm Solana works end-to-end **on devnet** with a real Phantom wallet and
   devnet SOL (free from a faucet). Buy one paid tool, confirm the install
   unlocks. If devnet works, mainnet is the same flow with real SOL.

## The mainnet switch

3. **Create a dedicated treasury wallet** for MCPX fees (a fresh Phantom or
   hardware wallet). This wallet's public key is your `SOLANA_TREASURY_WALLET`.
   Its 15% fees land here.
   - Keep its seed phrase offline. The server only ever needs the **public**
     key — never paste a private key or seed into any env var or file.

4. **Set the production environment variables** (Railway dashboard → MCPX
   service → Variables):
   ```
   SOLANA_CLUSTER=mainnet-beta
   SOLANA_TREASURY_WALLET=<your treasury PUBLIC key, base58>
   SOLANA_RPC_URL=<a mainnet RPC endpoint>      # see note below
   SOLANA_USD_PER_SOL=<current SOL price>        # fallback only; keep it current-ish
   ```
   - **RPC note:** the default public mainnet endpoint (`api.mainnet-beta.solana.com`)
     is rate-limited and will fail under real traffic. Use a dedicated RPC
     (Helius, QuickNode, Triton, Alchemy — free tiers exist). Paste its URL as
     `SOLANA_RPC_URL`.

5. **Redeploy.** Railway rebuilds from `main` on push; a variable change alone
   may need a manual redeploy. After it's up, verify:
   ```
   curl https://mcpx.digital/api/payments/solana/config
   # expect: "cluster":"mainnet-beta", "enabled":true,
   #         "rate_source":"live", "label":"Live (mainnet)"
   ```
   If `rate_source` is `"stub"`, the price feed couldn't be reached from the
   server — check outbound network / RPC before selling.

6. **Do one real end-to-end purchase yourself** (buy a cheap paid tool with a
   real Phantom wallet). Confirm:
   - The publisher wallet received 85%.
   - Your treasury wallet received 15%.
   - The tool's install unlocked in your account.

   This is the only true proof. Do it before announcing crypto is live.

---

## Safety properties already in the code (so you know what protects you)

- **Rate locked at request time.** The USD→SOL rate is fixed when the pending
  purchase is created and stored as exact lamport amounts. A price swing during
  checkout can't change what the buyer owes or what you receive.
- **On-chain verification.** `POST /solana/confirm` re-reads the transaction
  from the chain and checks the reference, both recipients, and that the
  treasury got **at least** its 15% before unlocking. A forged or short payment
  is rejected.
- **No double-spend of signatures.** A signature used for one purchase can't be
  replayed for another.
- **Feed outage is safe.** If the price feed is down, checkout falls back to
  `SOLANA_USD_PER_SOL` rather than failing — keep that value sane.

## Rolling back

Set `SOLANA_CLUSTER=devnet` (or unset `SOLANA_TREASURY_WALLET`) and redeploy.
Crypto checkout returns to test mode / disabled instantly. Stripe is unaffected.

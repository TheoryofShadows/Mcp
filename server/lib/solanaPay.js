/**
 * Solana Pay helpers for MCPX paid-tool checkout.
 *
 * Currency: native SOL with a documented fixed USD→SOL FX stub
 * (SOLANA_USD_PER_SOL, default 150). Prefer USDC later when a reliable
 * cluster mint + ATA path is wired; until then amounts are labeled clearly
 * as "SOL (FX stub)" in API responses and the UI.
 *
 * Atomic 85/15: one buyer-signed transaction with two SystemProgram transfers
 * (publisher 85%, platform treasury 15%) plus a Solana Pay reference account.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

export const PLATFORM_FEE_PCT = 0.15;
export const PUBLISHER_PCT = 0.85;

/** Test seam — replace with a mock in vitest. */
let _verifyImpl = null;

export function setSolanaVerifyImpl(fn) {
  _verifyImpl = fn;
}

export function resetSolanaVerifyImpl() {
  _verifyImpl = null;
}

export function getSolanaConfig() {
  const cluster = (process.env.SOLANA_CLUSTER || "devnet").trim();
  const allowed = new Set(["devnet", "mainnet-beta", "testnet"]);
  const safeCluster = allowed.has(cluster) ? cluster : "devnet";

  const treasury = (process.env.SOLANA_TREASURY_WALLET || "").trim() || null;
  const rpcUrl =
    (process.env.SOLANA_RPC_URL || "").trim() ||
    clusterApiUrl(safeCluster);

  // Documented FX stub — NOT a live oracle. Label in product copy.
  const usdPerSol = Number(process.env.SOLANA_USD_PER_SOL) || 150;

  return {
    cluster: safeCluster,
    treasury,
    rpcUrl,
    usdPerSol,
    enabled: !!treasury && isValidPubkey(treasury),
    currency: "SOL",
    currency_label: "SOL (FX stub)",
    fx_note: `USD→SOL uses fixed stub rate $${usdPerSol}/SOL (env SOLANA_USD_PER_SOL). Not a live price feed.`,
  };
}

export function isValidPubkey(value) {
  if (!value || typeof value !== "string") return false;
  try {
    // Throws if not valid base58 pubkey
    // eslint-disable-next-line no-new
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

/** Convert price cents → total lamports using the FX stub (ceil so we never undercharge). */
export function centsToLamports(cents, usdPerSol = 150) {
  const usd = Number(cents) / 100;
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  const sol = usd / usdPerSol;
  return Math.max(1, Math.ceil(sol * LAMPORTS_PER_SOL));
}

/** Split total lamports into publisher (85%) + platform (remainder = 15%). */
export function splitLamports(totalLamports) {
  const total = Math.floor(Number(totalLamports) || 0);
  const publisher = Math.floor(total * PUBLISHER_PCT);
  const platform = total - publisher;
  return { publisher_lamports: publisher, platform_lamports: platform };
}

export function newReferencePubkey() {
  return Keypair.generate().publicKey.toBase58();
}

export function getConnection(cfg = getSolanaConfig()) {
  return new Connection(cfg.rpcUrl, "confirmed");
}

/**
 * Build an unsigned legacy Transaction for the buyer to sign via Phantom.
 * Two transfers + Solana Pay reference on the publisher transfer instruction.
 */
export function buildSplitTransferTransaction({
  payer,
  recipient,
  platformRecipient,
  publisherLamports,
  platformLamports,
  reference,
  recentBlockhash,
}) {
  const from = new PublicKey(payer);
  const toPub = new PublicKey(recipient);
  const treasury = new PublicKey(platformRecipient);
  const ref = new PublicKey(reference);

  const pubIx = SystemProgram.transfer({
    fromPubkey: from,
    toPubkey: toPub,
    lamports: publisherLamports,
  });
  // Solana Pay reference account (readonly, non-signer)
  pubIx.keys.push({ pubkey: ref, isSigner: false, isWritable: false });

  const feeIx = SystemProgram.transfer({
    fromPubkey: from,
    toPubkey: treasury,
    lamports: platformLamports,
  });

  const tx = new Transaction().add(pubIx, feeIx);
  tx.feePayer = from;
  tx.recentBlockhash = recentBlockhash;
  return tx;
}

/**
 * Verify an on-chain signature matches the expected dual-transfer purchase.
 * Returns { ok: true } or { ok: false, error }.
 */
export async function verifyPurchaseTransaction({
  signature,
  reference,
  recipient,
  platformRecipient,
  publisherLamports,
  platformLamports,
  connection,
}) {
  if (_verifyImpl) {
    return _verifyImpl({
      signature,
      reference,
      recipient,
      platformRecipient,
      publisherLamports,
      platformLamports,
    });
  }

  if (!signature || typeof signature !== "string" || signature.length < 64) {
    return { ok: false, error: "Invalid signature" };
  }

  const conn = connection || getConnection();
  let tx;
  try {
    tx = await conn.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
  } catch (err) {
    return { ok: false, error: `RPC error: ${err.message}` };
  }

  if (!tx) return { ok: false, error: "Transaction not found (not confirmed yet?)" };
  if (tx.meta?.err) return { ok: false, error: "Transaction failed on-chain" };

  const accountKeys = (tx.transaction?.message?.accountKeys || []).map((k) =>
    typeof k === "string" ? k : k.toBase58?.() || String(k)
  );

  if (!accountKeys.includes(reference)) {
    return { ok: false, error: "Reference pubkey missing from transaction" };
  }
  if (!accountKeys.includes(recipient)) {
    return { ok: false, error: "Publisher recipient missing from transaction" };
  }
  if (!accountKeys.includes(platformRecipient)) {
    return { ok: false, error: "Platform treasury missing from transaction" };
  }

  // Balance deltas from pre/post balances (index-aligned with accountKeys)
  const pre = tx.meta?.preBalances || [];
  const post = tx.meta?.postBalances || [];
  const recipientIdx = accountKeys.indexOf(recipient);
  const treasuryIdx = accountKeys.indexOf(platformRecipient);

  const recipientDelta = (post[recipientIdx] ?? 0) - (pre[recipientIdx] ?? 0);
  const treasuryDelta = (post[treasuryIdx] ?? 0) - (pre[treasuryIdx] ?? 0);

  if (recipientDelta < publisherLamports) {
    return {
      ok: false,
      error: `Publisher amount mismatch (got ${recipientDelta}, expected ≥ ${publisherLamports})`,
    };
  }
  if (treasuryDelta < platformLamports) {
    return {
      ok: false,
      error: `Platform amount mismatch (got ${treasuryDelta}, expected ≥ ${platformLamports})`,
    };
  }

  return { ok: true };
}

export { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL };

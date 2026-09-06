/**
 * Lightweight Solana Pay client helpers (Phantom-first).
 * Avoids the full wallet-adapter stack — detect Phantom via window.solana /
 * window.phantom.solana (Wallet Standard compatible providers expose the same).
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";

export function getProvider() {
  if (typeof window === "undefined") return null;
  const phantom = window.phantom?.solana;
  if (phantom?.isPhantom) return phantom;
  const sol = window.solana;
  if (sol?.isPhantom) return sol;
  // Other Wallet Standard wallets that inject window.solana
  if (sol?.publicKey || sol?.connect) return sol;
  return null;
}

export function clusterRpcUrl(cluster) {
  const c = cluster || "devnet";
  try {
    return clusterApiUrl(c);
  } catch {
    return clusterApiUrl("devnet");
  }
}

/**
 * Build + send the atomic 85/15 dual-transfer (publisher + treasury) with
 * Solana Pay reference account on the publisher instruction.
 */
export async function payWithPhantom({
  cluster,
  recipient,
  platformRecipient,
  publisherLamports,
  platformLamports,
  reference,
}) {
  const provider = getProvider();
  if (!provider) {
    const err = new Error("Phantom (or a Solana wallet) is not installed");
    err.code = "NO_WALLET";
    throw err;
  }

  if (!provider.publicKey) {
    await provider.connect();
  }
  const payer = provider.publicKey;
  if (!payer) throw new Error("Wallet did not return a public key");

  const connection = new Connection(clusterRpcUrl(cluster), "confirmed");
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const toPub = new PublicKey(recipient);
  const treasury = new PublicKey(platformRecipient);
  const ref = new PublicKey(reference);

  const pubIx = SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: toPub,
    lamports: Number(publisherLamports),
  });
  pubIx.keys.push({ pubkey: ref, isSigner: false, isWritable: false });

  const feeIx = SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: treasury,
    lamports: Number(platformLamports),
  });

  const tx = new Transaction().add(pubIx, feeIx);
  tx.feePayer = payer;
  tx.recentBlockhash = blockhash;

  let signature;
  if (typeof provider.signAndSendTransaction === "function") {
    const result = await provider.signAndSendTransaction(tx);
    signature = typeof result === "string" ? result : result?.signature;
  } else {
    const signed = await provider.signTransaction(tx);
    signature = await connection.sendRawTransaction(signed.serialize());
  }

  if (!signature) throw new Error("Wallet did not return a transaction signature");

  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  return { signature, payer: payer.toBase58() };
}

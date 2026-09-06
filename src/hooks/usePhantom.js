import { useCallback, useEffect, useState } from "react";
import { getProvider } from "../lib/solanaPay";

/**
 * Phantom-first wallet hook (Wallet Standard–compatible injected providers).
 * Deliberately tiny — no @solana/wallet-adapter-* dependency tree.
 */
export function usePhantom() {
  const [ready, setReady] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    const provider = getProvider();
    setReady(!!provider);
    setPublicKey(provider?.publicKey?.toBase58?.() || provider?.publicKey?.toString?.() || null);
  }, []);

  useEffect(() => {
    refresh();
    const provider = getProvider();
    if (!provider) return undefined;
    const onConnect = () => refresh();
    const onDisconnect = () => setPublicKey(null);
    const onAccountChanged = () => refresh();
    provider.on?.("connect", onConnect);
    provider.on?.("disconnect", onDisconnect);
    provider.on?.("accountChanged", onAccountChanged);
    return () => {
      provider.off?.("connect", onConnect);
      provider.off?.("disconnect", onDisconnect);
      provider.off?.("accountChanged", onAccountChanged);
    };
  }, [refresh]);

  const connect = useCallback(async () => {
    setError(null);
    const provider = getProvider();
    if (!provider) {
      setError("Install Phantom to pay with Solana");
      window.open("https://phantom.app/", "_blank", "noopener,noreferrer");
      return null;
    }
    setConnecting(true);
    try {
      const res = await provider.connect();
      const key = res?.publicKey?.toBase58?.() || provider.publicKey?.toBase58?.() || null;
      setPublicKey(key);
      return key;
    } catch (err) {
      setError(err?.message || "Wallet connect failed");
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await getProvider()?.disconnect?.();
    } catch {
      /* ignore */
    }
    setPublicKey(null);
  }, []);

  return { ready, publicKey, connecting, error, connect, disconnect, refresh };
}

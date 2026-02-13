import { useState, useEffect, useCallback } from "react";
import { fetchServers } from "../api/client";

export function useServers({ category, search, sort, page = 1, limit = 20 } = {}) {
  const [data, setData] = useState({ servers: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchServers({ category, search, sort, page, limit });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [category, search, sort, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, loading, error, reload: load };
}

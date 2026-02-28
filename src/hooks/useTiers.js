import { useState, useEffect } from "react";
import { fetchTiers } from "../api/client";

export function useTiers() {
  const [data, setData] = useState({ tiers: [], revenue_projections: [], tech_stack: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTiers()
      .then(setData)
      .catch((err) => setError(err.message || "Failed to load pricing data"))
      .finally(() => setLoading(false));
  }, []);

  return { ...data, loading, error };
}

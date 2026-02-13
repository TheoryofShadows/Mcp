import { useState, useEffect } from "react";
import { fetchTiers } from "../api/client";

export function useTiers() {
  const [data, setData] = useState({ tiers: [], revenue_projections: [], tech_stack: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTiers()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { ...data, loading };
}

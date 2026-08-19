// useBrandData.js
// Loads the brand profile for a given merchant token and exposes
// { data, loading, error, reload } to any component that needs it.

import { useState, useEffect, useCallback } from "react";
import { getBrandProfile } from "../services/brandApi";

const useBrandData = (merchantToken) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getBrandProfile(merchantToken);
      setData(profile);
    } catch (err) {
      setError(err.message || "Failed to load brand data.");
    } finally {
      setLoading(false);
    }
  }, [merchantToken]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
};

export default useBrandData;

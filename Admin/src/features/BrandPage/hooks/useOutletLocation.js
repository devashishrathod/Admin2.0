// useOutletLocation.js
// Loads outlet location/address data for a merchant on demand
// (e.g. only once the "Outlet Location" tab is opened) and exposes
// { data, loading, error, reload }.

import { useState, useEffect, useCallback } from "react";
import { getOutletLocation } from "../services/brandApi";

const useOutletLocation = (merchantToken, { enabled = true } = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const location = await getOutletLocation(merchantToken);
      setData(location);
    } catch (err) {
      setError(err.message || "Failed to load outlet location.");
    } finally {
      setLoading(false);
    }
  }, [merchantToken, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
};

export default useOutletLocation;

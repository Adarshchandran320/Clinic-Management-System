import { useState, useEffect, useCallback } from "react";

/**
 * useLookups hook: Loads multiple lookup resources concurrently (e.g. doctors, departments, patients)
 *
 * @param {object} lookupMap - Object mapping keys to resources or fetch functions
 *   e.g. { doctors: doctorResource, departments: departmentResource }
 * @param {object} options - { immediate: boolean }
 * @returns {object} { lookups: { [key]: Array }, loading: boolean, error: string|null, refetch: function }
 */
export function useLookups(lookupMap = {}, options = {}) {
  const { immediate = true } = options;
  const [lookups, setLookups] = useState({});
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const fetchLookups = useCallback(async () => {
    const keys = Object.keys(lookupMap);
    if (keys.length === 0) {
      setLookups({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const promises = keys.map(async (key) => {
        const target = lookupMap[key];
        if (!target) return { key, data: [] };

        if (typeof target.list === "function") {
          const res = await target.list();
          return { key, data: res.results || res.data || [] };
        } else if (typeof target === "function") {
          const res = await target();
          return { key, data: res.results || res.data || (Array.isArray(res) ? res : []) };
        }
        return { key, data: [] };
      });

      const settled = await Promise.allSettled(promises);
      const newLookups = {};
      let firstError = null;

      settled.forEach((result, idx) => {
        const key = keys[idx];
        if (result.status === "fulfilled") {
          newLookups[result.value.key] = result.value.data;
        } else {
          newLookups[key] = [];
          if (!firstError) {
            firstError = result.reason?.message || `Failed to load ${key}`;
          }
        }
      });

      setLookups(newLookups);
      if (firstError) setError(firstError);
    } catch (err) {
      setError(err?.message || "Failed to load lookups");
    } finally {
      setLoading(false);
    }
  }, [lookupMap]);

  useEffect(() => {
    if (immediate) {
      fetchLookups();
    }
  }, [fetchLookups, immediate]);

  return {
    lookups,
    loading,
    error,
    refetch: fetchLookups,
  };
}

export default useLookups;

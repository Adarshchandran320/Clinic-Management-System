import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useList hook: Manages paginated / unpaginated list state for a resource.
 *
 * @param {object} resource - Resource instance with .list(params) method
 * @param {object} initialParams - Initial query params (search, page, etc.)
 * @param {object} options - { immediate: boolean, onSuccess: function }
 */
export function useList(resource, initialParams = {}, options = {}) {
  const { immediate = true, onSuccess } = options;
  const [params, setParams] = useState(initialParams);
  const [data, setData] = useState([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const fetchList = useCallback(
    async (overrideParams) => {
      if (!resource || typeof resource.list !== "function") return;

      const activeParams = overrideParams !== undefined ? overrideParams : params;
      try {
        setLoading(true);
        setError(null);
        const res = await resource.list(activeParams);
        const results = res.results || res.data || [];
        setData(results);
        setCount(res.count ?? results.length);
        setNext(res.next || null);
        setPrevious(res.previous || null);

        if (typeof onSuccessRef.current === "function") {
          onSuccessRef.current(results, res);
        }
      } catch (err) {
        setError(
          err?.response?.data?.detail ||
            err?.response?.data?.error ||
            err.message ||
            "Failed to load records"
        );
        setData([]);
        setCount(0);
      } finally {
        setLoading(false);
      }
    },
    [resource, params]
  );

  useEffect(() => {
    if (immediate) {
      fetchList();
    }
  }, [fetchList, immediate]);

  const updateParams = useCallback((newParams) => {
    setParams((prev) => {
      const merged = typeof newParams === "function" ? newParams(prev) : { ...prev, ...newParams };
      return merged;
    });
  }, []);

  return {
    data,
    results: data,
    count,
    next,
    previous,
    loading,
    error,
    params,
    setParams: updateParams,
    refetch: fetchList,
  };
}

export default useList;

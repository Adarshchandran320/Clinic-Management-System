import { useState, useEffect, useCallback } from "react";
import axiosClient, { ACCESS_TOKEN_KEY } from "../api/axiosClient.js";

/**
 * useMe hook: Fetches current user profile from /api/auth/me/
 * Maps response to { staff_id, doctor_id, role, username, user, loading, error, refetch }
 * Gracefully handles users with no staff or doctor profile without crashing.
 */
export function useMe() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await axiosClient.get("/auth/me/");
      setProfile(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to load user profile");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const staff_id = profile?.staff?.id ?? profile?.staff?.StaffId ?? null;
  const doctor_id = profile?.doctor?.id ?? profile?.doctor?.DoctorId ?? null;
  const role = profile?.role ?? "";
  const username = profile?.username ?? "";

  return {
    user: profile,
    staff_id,
    doctor_id,
    role,
    username,
    staff: profile?.staff ?? null,
    doctor: profile?.doctor ?? null,
    loading,
    error,
    refetch: fetchMe,
  };
}

export default useMe;

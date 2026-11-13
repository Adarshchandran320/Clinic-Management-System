import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import authApi from "../api/authApi.js";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "../api/axiosClient.js";

const AuthContext = createContext(null);

// Decode JWT payload safely to recover user claims if page is refreshed
function decodeJwtPayload(token) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const ROLE_HOME_PATHS = {
  admin: "/admin",
  receptionist: "/receptionist",
  doctor: "/doctor",
  lab: "/lab",
  "lab technician": "/lab",
  labtechnician: "/lab",
  lab_technician: "/lab",
  pharmacist: "/pharmacist",
};

function normalizeRole(role) {
  if (!role) return "";
  const r = String(role).trim().toLowerCase();
  if (r === "lab technician" || r === "labtechnician" || r === "lab_technician") {
    return "lab";
  }
  return r;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const decoded = decodeJwtPayload(token);
    if (decoded && decoded.role) {
      return {
        id: decoded.user_id || decoded.id,
        username: decoded.username || "User",
        role: normalizeRole(decoded.role),
      };
    }
    return null;
  });

  const [theme, setTheme] = useState("light");

  // Apply Bootstrap 5 data-bs-theme attribute to document root
  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
  }, []);

  // Listen for 401 refresh failure events from axiosClient
  useEffect(() => {
    const handleForcedLogout = () => {
      logout();
    };
    window.addEventListener("auth:logout", handleForcedLogout);
    return () => window.removeEventListener("auth:logout", handleForcedLogout);
  }, [logout]);

  // POST /api/auth/login/ {username, password} -> {access, refresh, user:{id, username, role}}
  const login = async (username, password) => {
    const res = await authApi.login({ username, password });
    const { access, refresh, user: userData } = res.data || {};

    if (access) {
      localStorage.setItem(ACCESS_TOKEN_KEY, access);
    }
    if (refresh) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    }

    const decoded = decodeJwtPayload(access);
    const rawRole = userData?.role || decoded?.role;
    if (!rawRole) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      throw new Error("Login response did not include a role.");
    }
    const resolvedRole = normalizeRole(rawRole);

    const normalizedUser = {
      id: userData?.id || decoded?.user_id,
      username: userData?.username || username,
      role: resolvedRole,
    };

    setUser(normalizedUser);
    return normalizedUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user && localStorage.getItem(ACCESS_TOKEN_KEY)),
        login,
        logout,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export default AuthContext;

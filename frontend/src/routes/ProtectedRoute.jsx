import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth, ROLE_HOME_PATHS } from "../context/AuthContext.jsx";

// Blocks unauthenticated access and redirects users to their own role's dashboard if they try to visit another role's route
export default function ProtectedRoute({ allowedRole, children }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    const fallbackPath = ROLE_HOME_PATHS[user.role] || "/login";
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}

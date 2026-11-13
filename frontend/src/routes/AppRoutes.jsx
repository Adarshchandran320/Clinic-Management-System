import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth, ROLE_HOME_PATHS } from "../context/AuthContext.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import Login from "../pages/Login.jsx";

import adminModule from "../modules/admin/index.jsx";
import receptionistModule from "../modules/receptionist/index.jsx";
import doctorModule from "../modules/doctor/index.jsx";
import labModule from "../modules/lab/index.jsx";
import pharmacistModule from "../modules/pharmacist/index.jsx";

const ALL_MODULES = [
  adminModule,
  receptionistModule,
  doctorModule,
  labModule,
  pharmacistModule,
];

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated || !user?.role) {
    return <Navigate to="/login" replace />;
  }
  const dest = ROLE_HOME_PATHS[user.role] || "/pharmacist";
  return <Navigate to={dest} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RootRedirect />} />

      {ALL_MODULES.map((mod) => (
        <Route
          key={mod.role}
          path={mod.basePath}
          element={
            <ProtectedRoute allowedRole={mod.role}>
              <DashboardLayout moduleConfig={mod} />
            </ProtectedRoute>
          }
        >
          {mod.routes.map((r, idx) =>
            r.index ? (
              <Route key="index" index element={r.element} />
            ) : (
              <Route key={r.path || idx} path={r.path} element={r.element} />
            )
          )}
        </Route>
      ))}

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

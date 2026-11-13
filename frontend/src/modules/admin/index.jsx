import React from "react";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminUsersPage from "./pages/AdminUsersPage.jsx";
import AdminDepartmentsPage from "./pages/AdminDepartmentsPage.jsx";
import AdminStaffPage from "./pages/AdminStaffPage.jsx";
import AdminDoctorsPage from "./pages/AdminDoctorsPage.jsx";
import AdminLabTestsPage from "./pages/AdminLabTestsPage.jsx";
import AdminMedicinesPage from "./pages/AdminMedicinesPage.jsx";
import AdminDosagesPage from "./pages/AdminDosagesPage.jsx";
import AdminReorderRequestsPage from "./pages/AdminReorderRequestsPage.jsx";
import AdminAuditLogsPage from "./pages/AdminAuditLogsPage.jsx";

// Module contract: exports { role, basePath, title, navItems, routes }
export const adminModule = {
  role: "admin",
  basePath: "/admin",
  title: "Administrator",
  navItems: [
    { path: "", label: "Dashboard", icon: "bi-grid", end: true },
    { path: "users", label: "Users", icon: "bi-people" },
    { path: "departments", label: "Departments", icon: "bi-building" },
    { path: "staff", label: "Staff", icon: "bi-person-badge" },
    { path: "doctors", label: "Doctors", icon: "bi-heart-pulse" },
    { path: "lab-tests", label: "Lab Tests", icon: "bi-eyedropper" },
    { path: "medicines", label: "Medicines", icon: "bi-capsule" },
    { path: "dosages", label: "Dosages", icon: "bi-prescription2" },
    { path: "reorder-requests", label: "Reorder Requests", icon: "bi-cart-check" },
    { path: "audit-logs", label: "Audit Logs", icon: "bi-shield-check" },
  ],
  routes: [
    { index: true, element: <AdminDashboard /> },
    { path: "users", element: <AdminUsersPage /> },
    { path: "departments", element: <AdminDepartmentsPage /> },
    { path: "staff", element: <AdminStaffPage /> },
    { path: "doctors", element: <AdminDoctorsPage /> },
    { path: "lab-tests", element: <AdminLabTestsPage /> },
    { path: "medicines", element: <AdminMedicinesPage /> },
    { path: "dosages", element: <AdminDosagesPage /> },
    { path: "reorder-requests", element: <AdminReorderRequestsPage /> },
    { path: "audit-logs", element: <AdminAuditLogsPage /> },
  ],
};

export default adminModule;

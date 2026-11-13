import React from "react";
import PharmacistDashboard from "./pages/PharmacistDashboard.jsx";
import MedicinesPage from "./pages/MedicinesPage.jsx";
import StockPage from "./pages/StockPage.jsx";
import PrescriptionsQueuePage from "./pages/PrescriptionsQueuePage.jsx";
import PharmacistBillsPage from "./pages/PharmacistBillsPage.jsx";
import PharmacistReportsPage from "./pages/PharmacistReportsPage.jsx";

// Module contract: exports { role, basePath, title, navItems, routes }
export const pharmacistModule = {
  role: "pharmacist",
  basePath: "/pharmacist",
  title: "Pharmacist",
  navItems: [
    { path: "", label: "Dashboard", icon: "bi-grid", end: true },
    { path: "medicines", label: "Medicines", icon: "bi-capsule" },
    { path: "stock", label: "Inventory", icon: "bi-box-seam" },
    { path: "prescriptions", label: "Prescriptions", icon: "bi-cart3" },
    { path: "bills", label: "Bills", icon: "bi-receipt" },
    { path: "reports", label: "Reports", icon: "bi-bar-chart-line" },
  ],
  routes: [
    { index: true, element: <PharmacistDashboard /> },
    { path: "medicines", element: <MedicinesPage /> },
    { path: "stock", element: <StockPage /> },
    { path: "prescriptions", element: <PrescriptionsQueuePage /> },
    { path: "bills", element: <PharmacistBillsPage /> },
    { path: "reports", element: <PharmacistReportsPage /> },
  ],
};

export default pharmacistModule;

import React from "react";
import LabDashboard from "./pages/LabDashboard.jsx";
import LabOrdersPage from "./pages/LabOrdersPage.jsx";
import LabQueuesPage from "./pages/LabQueuesPage.jsx";
import ProcessTestPage from "./pages/ProcessTestPage.jsx";
import LabReportsPage from "./pages/LabReportsPage.jsx";
import LabBillingPage from "./pages/LabBillingPage.jsx";

// Lab Module exports { role, basePath, title, navItems, routes }
export const labModule = {
  role: "lab",
  basePath: "/lab",
  title: "Laboratory",
  navItems: [
    { path: "", label: "Dashboard", icon: "bi-grid", end: true },
    { path: "orders", label: "Orders", icon: "bi-eyedropper" },
    { path: "queues", label: "Queues", icon: "bi-list-check" },
    { path: "reports", label: "Reports", icon: "bi-file-earmark-medical" },
    { path: "billing", label: "Billing", icon: "bi-receipt" },
  ],
  routes: [
    { index: true, element: <LabDashboard /> },
    { path: "orders", element: <LabOrdersPage /> },
    { path: "queues", element: <LabQueuesPage /> },
    { path: "process/:id", element: <ProcessTestPage /> },
    { path: "reports", element: <LabReportsPage /> },
    { path: "billing", element: <LabBillingPage /> },
  ],
};

export default labModule;

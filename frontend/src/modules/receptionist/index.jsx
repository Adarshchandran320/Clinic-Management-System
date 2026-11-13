import React from "react";
import ReceptionistDashboard from "./pages/ReceptionistDashboard.jsx";
import PatientsPage from "./pages/PatientsPage.jsx";
import AppointmentsPage from "./pages/AppointmentsPage.jsx";
import QueueTokensPage from "./pages/QueueTokensPage.jsx";
import BillsPaymentsPage from "./pages/BillsPaymentsPage.jsx";

// Module contract: exports { role, basePath, title, navItems, routes }
export const receptionistModule = {
  role: "receptionist",
  basePath: "/receptionist",
  title: "Receptionist",
  navItems: [
    { path: "", label: "Dashboard", icon: "bi-grid", end: true },
    { path: "appointments", label: "Appointments", icon: "bi-calendar-event" },
    { path: "queue", label: "Queue Management", icon: "bi-list-ol" },
    { path: "patients", label: "Patients", icon: "bi-people" },
    { path: "payments", label: "Payments", icon: "bi-credit-card" },
  ],
  routes: [
    { index: true, element: <ReceptionistDashboard /> },
    { path: "appointments", element: <AppointmentsPage /> },
    { path: "queue", element: <QueueTokensPage /> },
    { path: "patients", element: <PatientsPage /> },
    { path: "payments", element: <BillsPaymentsPage /> },
  ],
};

export default receptionistModule;

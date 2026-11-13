import React from "react";
import DoctorDashboard from "./pages/DoctorDashboard.jsx";
import ConsultationsPage from "./pages/ConsultationsPage.jsx";
import DoctorPrescriptionsPage from "./pages/DoctorPrescriptionsPage.jsx";
import DoctorLabReportsPage from "./pages/DoctorLabReportsPage.jsx";

// Module contract: exports { role, basePath, title, navItems, routes }
export const doctorModule = {
  role: "doctor",
  basePath: "/doctor",
  title: "Doctor",
  navItems: [
    { path: "", label: "Dashboard", icon: "bi-grid", end: true },
    { path: "consultations", label: "Consultations", icon: "bi-calendar2-check" },
    { path: "prescriptions", label: "Prescriptions", icon: "bi-capsule" },
    { path: "lab-reports", label: "Lab Reports", icon: "bi-file-earmark-medical" },
  ],
  routes: [
    { index: true, element: <DoctorDashboard /> },
    { path: "consultations", element: <ConsultationsPage /> },
    { path: "prescriptions", element: <DoctorPrescriptionsPage /> },
    { path: "lab-reports", element: <DoctorLabReportsPage /> },
  ],
};

export default doctorModule;

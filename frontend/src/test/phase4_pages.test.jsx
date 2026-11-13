import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

// Pages under test
import AdminDashboard from "../modules/admin/pages/AdminDashboard.jsx";
import AdminMedicinesPage from "../modules/admin/pages/AdminMedicinesPage.jsx";
import LabDashboard from "../modules/lab/pages/LabDashboard.jsx";
import LabReportsPage from "../modules/lab/pages/LabReportsPage.jsx";
import LabBillingPage from "../modules/lab/pages/LabBillingPage.jsx";
import DoctorLabReportsPage from "../modules/doctor/pages/DoctorLabReportsPage.jsx";
import AppointmentsPage from "../modules/receptionist/pages/AppointmentsPage.jsx";

const BACKEND_BASE = "http://127.0.0.1:8000/api";

async function authenticate(username, password) {
  const res = await axios.post(`${BACKEND_BASE}/auth/login/`, {
    username,
    password,
  });
  const token = res.data.access;
  localStorage.setItem("access_token", token);
  return token;
}

describe("Phase 4b: End-to-End Vitest + Testing Library Page Tests (Real Backend)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // 1. Admin Pages Tests (AdminDashboard & AdminMedicinesPage)
  // ---------------------------------------------------------------------------
  it("renders Admin Dashboard with live stats from running backend", async () => {
    await authenticate("admin1", "admin123");

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    // Verify Administrative Command Center header
    expect(await screen.findByRole("heading", { name: /Administrative Command Center/i })).toBeInTheDocument();

    // Verify live stat cards rendered from backend database
    await waitFor(() => {
      expect(screen.getByText(/^Total Users$/i)).toBeInTheDocument();
      expect(screen.getByText(/^Departments$/i)).toBeInTheDocument();
      expect(screen.getByText(/^Doctors$/i)).toBeInTheDocument();
    });
  });

  it("renders Admin Medicines Page with real master medicine rows", async () => {
    await authenticate("admin1", "admin123");

    render(
      <MemoryRouter>
        <AdminMedicinesPage />
      </MemoryRouter>
    );

    // Verify Medicines Master Catalog heading
    expect(await screen.findByRole("heading", { name: /Medicines Master Catalog/i })).toBeInTheDocument();

    // Wait for real rows from running database to populate the table
    await waitFor(
      () => {
        const rows = screen.queryAllByRole("row");
        expect(rows.length).toBeGreaterThan(1); // Header row + live medicine rows
      },
      { timeout: 10000 }
    );
  });

  // ---------------------------------------------------------------------------
  // 2. Lab Pages Tests (LabDashboard, LabReportsPage, LabBillingPage)
  // ---------------------------------------------------------------------------
  it("renders Lab Dashboard with diagnostic activity counters", async () => {
    await authenticate("lab1", "lab123");

    render(
      <MemoryRouter>
        <LabDashboard />
      </MemoryRouter>
    );

    // Verify Laboratory Overview header
    expect(await screen.findByRole("heading", { name: /Laboratory Overview/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Total Orders/i)).toBeInTheDocument();
      expect(screen.getByText(/Pending Samples/i)).toBeInTheDocument();
    });
  });

  it("renders Lab Reports Page with real diagnostic reports", async () => {
    await authenticate("lab1", "lab123");

    render(
      <MemoryRouter>
        <LabReportsPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: /Diagnostic Laboratory Reports/i })).toBeInTheDocument();

    await waitFor(
      () => {
        const table = screen.getByRole("table");
        expect(table).toBeInTheDocument();
        const rows = screen.getAllByRole("row");
        expect(rows.length).toBeGreaterThan(1);
      },
      { timeout: 10000 }
    );
  });

  it("renders Lab Billing Page showing existing auto-created bill and status", async () => {
    await authenticate("lab1", "lab123");

    render(
      <MemoryRouter initialEntries={["/lab/billing"]}>
        <LabBillingPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: /Laboratory Billing & Invoicing/i })).toBeInTheDocument();

    // Verify Billing History table loads real rows from backend
    await waitFor(
      () => {
        expect(screen.getByText(/Laboratory Billing History/i)).toBeInTheDocument();
        const historyTable = screen.getByRole("table");
        expect(historyTable).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  // ---------------------------------------------------------------------------
  // 3. DoctorLabReportsPage Test
  // ---------------------------------------------------------------------------
  it("renders DoctorLabReportsPage with live lab findings and remarks", async () => {
    await authenticate("doctor1", "doctor123");

    render(
      <MemoryRouter>
        <DoctorLabReportsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Review finalized laboratory test findings/i)).toBeInTheDocument();

    // Verify real lab report rows rendered
    await waitFor(
      () => {
        const rows = screen.queryAllByRole("row");
        expect(rows.length).toBeGreaterThan(1);
      },
      { timeout: 10000 }
    );
  });

  // ---------------------------------------------------------------------------
  // 4. Receptionist Appointment Form Test
  // ---------------------------------------------------------------------------
  it("renders Receptionist Appointments page and opens Appointment booking form with real lookups", async () => {
    await authenticate("receptionist1", "receptionist123");

    render(
      <MemoryRouter>
        <AppointmentsPage />
      </MemoryRouter>
    );

    // Verify Appointments heading
    expect(await screen.findByRole("heading", { name: /Appointment Scheduling/i })).toBeInTheDocument();

    // Find and click the 'Add Appointment' button
    const createBtn = await screen.findByRole("button", { name: /Add Appointment/i });
    expect(createBtn).toBeInTheDocument();
    fireEvent.click(createBtn);

    // Modal opens: verify appointment modal header and select options
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Add New Appointment/i })).toBeInTheDocument();
      expect(screen.getByText(/-- Select Patient --/i)).toBeInTheDocument();
      expect(screen.getByText(/-- Select Doctor --/i)).toBeInTheDocument();
    });

    // Verify patient select contains live patient options from the backend
    await waitFor(
      () => {
        const patientOption = screen.getByText(/-- Select Patient --/i);
        const selectElem = patientOption.parentElement;
        expect(selectElem.options.length).toBeGreaterThan(1); // default option + real patient records
      },
      { timeout: 10000 }
    );
  });
});

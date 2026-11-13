import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import { AuthProvider } from "../context/AuthContext.jsx";
import DashboardLayout from "../layouts/DashboardLayout.jsx";

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

describe("Phase 5: Notification Bell Component Tests (Live Doctor Backend)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders NotificationBell as a logged-in doctor, displays unread badge, and opens dropdown with a real notification", async () => {
    // 1. Authenticate as doctor1
    const token = await authenticate("doctor1", "doctor123");
    expect(token).toBeTruthy();

    // 2. Ensure at least one unread notification exists for doctor1 on live backend
    const countRes = await axios.get(`${BACKEND_BASE}/notifications/unread-count/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (countRes.data.unread_count === 0) {
      // Create a test appointment as receptionist to generate a real notification for doctor1
      const recLogin = await axios.post(`${BACKEND_BASE}/auth/login/`, {
        username: "receptionist1",
        password: "receptionist123",
      });
      const recToken = recLogin.data.access;
      const [patRes, docRes] = await Promise.all([
        axios.get(`${BACKEND_BASE}/receptionist/patients/`, { headers: { Authorization: `Bearer ${recToken}` } }),
        axios.get(`${BACKEND_BASE}/doctor/doctors/`, { headers: { Authorization: `Bearer ${recToken}` } }),
      ]);
      const patients = patRes.data.results || patRes.data;
      const doctors = docRes.data.results || docRes.data;
      const doc = doctors.find((d) => d.name === "Arun" || d.Name === "Arun") || doctors[0];
      const pat = patients[0];
      await axios.post(
        `${BACKEND_BASE}/receptionist/appointments/`,
        {
          PatientId: pat.PatientId ?? pat.id,
          DoctorId: doc.DoctorId ?? doc.id,
          DepartmentId: doc.DepartmentId ?? doc.department ?? 1,
          AppointmentDateTime: new Date().toISOString(),
          AppointmentStatus: "Scheduled",
        },
        { headers: { Authorization: `Bearer ${recToken}` } }
      );
    }

    // 3. Render DashboardLayout containing NotificationBell wrapped in AuthProvider and MemoryRouter
    render(
      <MemoryRouter>
        <AuthProvider>
          <DashboardLayout
            moduleConfig={{
              role: "doctor",
              basePath: "/doctor",
              navItems: [{ label: "Appointments", path: "appointments", icon: "bi-calendar" }],
            }}
          />
        </AuthProvider>
      </MemoryRouter>
    );

    // 4. Verify the bell button is rendered
    const bellBtn = await screen.findByRole("button", { name: /notifications/i });
    expect(bellBtn).toBeInTheDocument();

    // 5. Wait for the unread badge to show unread count > 0
    await waitFor(() => {
      const badge = bellBtn.querySelector(".badge");
      expect(badge).toBeInTheDocument();
      expect(Number(badge.textContent.replace(/\D/g, ""))).toBeGreaterThan(0);
    });

    // 6. Click the bell to open the dropdown
    fireEvent.click(bellBtn);

    // 7. Verify the dropdown opens and shows the notification list with real notification item
    await waitFor(() => {
      expect(screen.getByText("Mark all read")).toBeInTheDocument();
      expect(screen.getByText(/New Appointment Scheduled/i)).toBeInTheDocument();
    });
  });
});

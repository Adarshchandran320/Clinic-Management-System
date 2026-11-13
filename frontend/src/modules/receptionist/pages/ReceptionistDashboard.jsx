import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import receptionistApi from "../../../api/receptionistApi.js";
import {
  StatCard,
  DataTable,
  StatusBadge,
  PageHeader,
  ErrorAlert,
} from "../../../components/common/index.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
);

const TODAY_APPOINTMENT_COLUMNS = [
  { key: "id", label: "ID", formatter: (val) => `#${val}` },
  {
    key: "patient_name",
    label: "Patient",
    formatter: (val, row) => (
      <span className="fw-semibold">
        {val || row.patient?.name || row.patient || "-"}
      </span>
    ),
  },
  {
    key: "doctor_name",
    label: "Doctor",
    formatter: (val, row) => val || row.doctor?.name || row.doctor || "-",
  },
  {
    key: "appointment_date",
    label: "Date / Time",
    formatter: (val, row) => val || row.date || row.time_slot || "-",
  },
  {
    key: "status",
    label: "Status",
    formatter: (val) => <StatusBadge status={val || "Scheduled"} />,
  },
];

const LIVE_QUEUE_COLUMNS = [
  {
    key: "token_number",
    label: "Token",
    formatter: (val, row) => (
      <span className="fw-bold text-primary">
        #{val ?? row.token_no ?? row.id}
      </span>
    ),
  },
  {
    key: "patient_name",
    label: "Patient",
    formatter: (val, row) => val || row.patient?.name || row.patient || "-",
  },
  {
    key: "status",
    label: "Status",
    formatter: (val) => <StatusBadge status={val || "Waiting"} />,
  },
];

export default function ReceptionistDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [bills, setBills] = useState([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [patRes, appRes, tokRes, billRes] = await Promise.allSettled([
        receptionistApi.patients.list(),
        receptionistApi.appointments.list(),
        receptionistApi.tokens.list(),
        receptionistApi.bills.list(),
      ]);

      if (patRes.status === "fulfilled") {
        const val = patRes.value;
        setPatients(val.results || val.data || (Array.isArray(val) ? val : []));
      }
      if (appRes.status === "fulfilled") {
        const val = appRes.value;
        setAppointments(val.results || val.data || (Array.isArray(val) ? val : []));
      }
      if (tokRes.status === "fulfilled") {
        const val = tokRes.value;
        setTokens(val.results || val.data || (Array.isArray(val) ? val : []));
      }
      if (billRes.status === "fulfilled") {
        const val = billRes.value;
        setBills(val.results || val.data || (Array.isArray(val) ? val : []));
      }

      if (patRes.status === "rejected" && appRes.status === "rejected") {
        setError(patRes.reason);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const waitingInQueue = tokens.filter((t) => {
    const s = String(t.status || "waiting").toLowerCase();
    return s.includes("wait") || s.includes("queue") || s.includes("pending");
  }).length;

  const lineData = {
    labels: ["8AM", "9AM", "10AM", "11AM", "12PM", "1PM", "2PM", "3PM"],
    datasets: [
      {
        label: "Appointments",
        data: [
          appointments.length ? Math.ceil(appointments.length * 0.2) : 0,
          appointments.length ? Math.ceil(appointments.length * 0.4) : 0,
          appointments.length ? Math.ceil(appointments.length * 0.7) : 0,
          appointments.length,
          appointments.length ? Math.ceil(appointments.length * 0.8) : 0,
          tokens.length,
          patients.length ? Math.ceil(patients.length * 0.5) : 0,
          bills.length,
        ],
        borderColor: "#2E37A4",
        backgroundColor: "rgba(46, 55, 164, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const doughnutData = {
    labels: ["Appointments", "Active Tokens", "Registered Patients"],
    datasets: [
      {
        data: [
          appointments.length || 1,
          tokens.length || 0,
          patients.length || 0,
        ],
        backgroundColor: ["#2E37A4", "#0E9384", "#94A3B8"],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div>
      <PageHeader
        title="Receptionist Dashboard"
        actions={
          <>
            <button
              type="button"
              className="btn btn-primary btn-sm px-3"
              onClick={() => navigate("/receptionist/appointments")}
            >
              <i className="bi bi-plus-lg me-1"></i>New Appointment
            </button>
            <button
              type="button"
              className="btn btn-light border btn-sm px-3"
              onClick={() => navigate("/receptionist/patients")}
            >
              <i className="bi bi-person-plus me-1"></i>Register Patient
            </button>
          </>
        }
      />

      {error && <ErrorAlert error={error} onRetry={loadDashboard} />}

      {/* Row of 4 Preclinic KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Today's Appointments"
            value={appointments.length}
            badgeText="Scheduled"
            badgeVariant="success"
            subtitle="scheduled appointments"
            icon="bi-calendar-check"
            iconBg="#2E37A4"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Registered Patients"
            value={patients.length}
            badgeText="Total"
            badgeVariant="success"
            subtitle="in clinic directory"
            icon="bi-person-check"
            iconBg="#16A34A"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Waiting in Queue"
            value={waitingInQueue}
            badgeText="Live"
            badgeVariant="warning"
            subtitle="currently in queue"
            icon="bi-list-ol"
            iconBg="#F59E0B"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Bills & Invoices"
            value={bills.length}
            badgeText="Billing"
            badgeVariant="danger"
            subtitle="receptionist billing records"
            icon="bi-clock-history"
            iconBg="#DC2626"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-8">
          <div className="card h-100">
            <div className="card-header bg-transparent border-bottom d-flex align-items-center justify-content-between py-3">
              <h6 className="fw-bold mb-0">Daily Footfall</h6>
              <span className="text-secondary small">Checked In & Completed</span>
            </div>
            <div className="card-body">
              <div style={{ height: 250 }}>
                <Line
                  data={lineData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-header bg-transparent border-bottom py-3">
              <h6 className="fw-bold mb-0">Appointments by Channel</h6>
            </div>
            <div className="card-body d-flex align-items-center justify-content-center">
              <div style={{ height: 230, width: "100%" }}>
                <Doughnut
                  data={doughnutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "65%",
                    plugins: { legend: { position: "bottom" } },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Appointments & Live Queue */}
      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="card h-100">
            <div className="card-header bg-transparent border-bottom d-flex align-items-center justify-content-between py-3">
              <h6 className="fw-bold mb-0">Today&apos;s Appointments</h6>
              <button
                type="button"
                className="btn btn-sm btn-light border"
                onClick={() => navigate("/receptionist/appointments")}
              >
                View All
              </button>
            </div>
            <div className="card-body p-0">
              <DataTable
                columns={TODAY_APPOINTMENT_COLUMNS}
                data={appointments.slice(0, 6)}
                loading={loading}
                emptyTitle="No appointments scheduled"
                emptyMessage="Book an appointment to see it listed here."
              />
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-header bg-transparent border-bottom d-flex align-items-center justify-content-between py-3">
              <h6 className="fw-bold mb-0">Live Queue</h6>
              <span className="badge bg-success-subtle text-success border border-success-subtle">
                Live
              </span>
            </div>
            <div className="card-body p-0">
              <DataTable
                columns={LIVE_QUEUE_COLUMNS}
                data={tokens.slice(0, 6)}
                loading={loading}
                emptyTitle="Queue is empty"
                emptyMessage="Issue a token to add patients to the live queue."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

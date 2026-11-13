import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import doctorApi from "../../../api/doctorApi.js";
import {
  StatCard,
  PageHeader,
  Loader,
  EmptyState,
  ErrorAlert,
} from "../../../components/common/index.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [consultations, setConsultations] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labPrescriptions, setLabPrescriptions] = useState([]);
  const [waitingQueue, setWaitingQueue] = useState([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [consRes, prescRes, labRes, queueRes] = await Promise.allSettled([
        doctorApi.consultations.list(),
        doctorApi.prescriptions.list(),
        doctorApi.labPrescriptions.list(),
        doctorApi.waitingQueue.list(),
      ]);

      if (consRes.status === "fulfilled") {
        const val = consRes.value;
        setConsultations(val.results || val.data || (Array.isArray(val) ? val : []));
      }
      if (prescRes.status === "fulfilled") {
        const val = prescRes.value;
        setPrescriptions(val.results || val.data || (Array.isArray(val) ? val : []));
      }
      if (labRes.status === "fulfilled") {
        const val = labRes.value;
        setLabPrescriptions(val.results || val.data || (Array.isArray(val) ? val : []));
      }
      if (queueRes.status === "fulfilled") {
        const val = queueRes.value;
        setWaitingQueue(val.results || val.data || (Array.isArray(val) ? val : []));
      }

      if (consRes.status === "rejected" && prescRes.status === "rejected") {
        setError(consRes.reason);
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

  const upcomingConsultation = consultations[0] || null;

  // Group consultations by month or status for chart
  const chartData = {
    labels: ["Waiting Queue", "Consultations", "Prescriptions", "Lab Orders"],
    datasets: [
      {
        label: "Total Records",
        data: [
          waitingQueue.length,
          consultations.length,
          prescriptions.length,
          labPrescriptions.length,
        ],
        backgroundColor: ["#E11D48", "#2E37A4", "#0E9384", "#F59E0B"],
        borderRadius: 6,
      },
    ],
  };

  return (
    <div>
      <PageHeader
        title="Doctor Dashboard"
        actions={
          <>
            <button
              type="button"
              className="btn btn-primary btn-sm px-3"
              onClick={() => navigate("/doctor/consultations")}
            >
              <i className="bi bi-plus-lg me-1"></i>New Consultation
            </button>
            <button
              type="button"
              className="btn btn-light border btn-sm px-3"
              onClick={() => navigate("/doctor/prescriptions")}
            >
              <i className="bi bi-capsule me-1"></i>Write Prescription
            </button>
            <button
              type="button"
              className="btn btn-light border btn-sm px-3"
              onClick={() => navigate("/doctor/lab-reports")}
            >
              <i className="bi bi-file-earmark-medical me-1"></i>Lab Reports
            </button>
          </>
        }
      />

      {error && <ErrorAlert error={error} onRetry={loadDashboard} />}

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-3">
          <StatCard
            title="My Waiting Queue"
            value={waitingQueue.length}
            badgeText={waitingQueue.length > 0 ? "Pending" : "Clear"}
            badgeVariant={waitingQueue.length > 0 ? "danger" : "secondary"}
            subtitle="Patients waiting for consultation"
            icon="bi-people-fill"
            iconBg="#E11D48"
          />
        </div>
        <div className="col-12 col-md-3">
          <StatCard
            title="Total Consultations"
            value={consultations.length}
            badgeText="Active"
            badgeVariant="success"
            subtitle="Recorded patient consultations"
            icon="bi-calendar2-check"
            iconBg="#2E37A4"
          />
        </div>
        <div className="col-12 col-md-3">
          <StatCard
            title="Prescriptions Issued"
            value={prescriptions.length}
            badgeText="Rx"
            badgeVariant="info"
            subtitle="Sent to pharmacy queue"
            icon="bi-capsule"
            iconBg="#0E9384"
          />
        </div>
        <div className="col-12 col-md-3">
          <StatCard
            title="Lab Test Orders"
            value={labPrescriptions.length}
            badgeText="Lab"
            badgeVariant="warning"
            subtitle="Diagnostic requests"
            icon="bi-eyedropper"
            iconBg="#F59E0B"
          />
        </div>
      </div>

      {/* Waiting Queue Table & Clinical Activity Overview */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-7">
          <div className="card h-100 shadow-sm border-0">
            <div className="card-header bg-transparent border-bottom d-flex align-items-center justify-content-between py-3">
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-danger rounded-pill px-2 py-1">LIVE</span>
                <h6 className="fw-bold mb-0">My Patient Waiting Queue</h6>
              </div>
              <span className="badge bg-light text-secondary border">
                {waitingQueue.length} {waitingQueue.length === 1 ? "Patient" : "Patients"} Waiting
              </span>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="p-4 text-center"><Loader /></div>
              ) : waitingQueue.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon="bi-check-circle"
                    title="Waiting queue is currently empty"
                    message="When the receptionist checks in patients and issues tokens, they will appear here in your waiting queue."
                  />
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th className="ps-3">Appt #</th>
                        <th>Patient</th>
                        <th>Appointment Time</th>
                        <th>Status</th>
                        <th className="text-end pe-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="small">
                      {waitingQueue.map((item) => {
                        const apptId = item.AppointmentId ?? item.id;
                        const patName = item.patient_name || item.PatientId?.Name || `Patient #${item.PatientId || item.patient}`;
                        const dt = item.appointment_time || item.appointment_date || item.AppointmentDateTime || "Today";
                        return (
                          <tr key={apptId}>
                            <td className="ps-3 fw-bold text-primary">#{apptId}</td>
                            <td className="fw-semibold">{patName}</td>
                            <td className="text-muted">{dt}</td>
                            <td>
                              <span className="badge bg-warning text-dark">
                                <i className="bi bi-hourglass-split me-1"></i>Waiting
                              </span>
                            </td>
                            <td className="text-end pe-3">
                              <button
                                type="button"
                                className="btn btn-sm btn-primary px-3 shadow-sm"
                                onClick={() => navigate(`/doctor/consultations?appointmentId=${apptId}`)}
                              >
                                <i className="bi bi-play-circle me-1"></i>Start Consultation
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="card h-100 shadow-sm border-0">
            <div className="card-header bg-transparent border-bottom d-flex align-items-center justify-content-between py-3">
              <h6 className="fw-bold mb-0">Clinical Activity Overview</h6>
              <span className="text-secondary small">Live Summary</span>
            </div>
            <div className="card-body">
              <div style={{ height: 260 }}>
                <Bar
                  data={chartData}
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
      </div>
    </div>
  );
}

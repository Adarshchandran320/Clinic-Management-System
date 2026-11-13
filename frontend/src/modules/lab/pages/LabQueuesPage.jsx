import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import labApi from "../../../api/labApi.js";
import StatusBadge from "../../../components/common/StatusBadge.jsx";
import Loader from "../../../components/common/Loader.jsx";
import EmptyState from "../../../components/common/EmptyState.jsx";

export default function LabQueuesPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [activeLane, setActiveLane] = useState("all");

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await labApi.labPrescriptions.list();
      setOrders(res.results || res.data || (Array.isArray(res) ? res : []));
    } catch (err) {
      setError(err?.message || "Failed to load laboratory queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Status progression action
  const handleMoveToNext = async (order) => {
    const id = order.LabPrescriptionId ?? order.id;
    const currentStatus = String(order.Status || order.status || "Pending").toLowerCase();

    if (currentStatus.includes("complete")) {
      navigate(`/lab/billing?orderId=${id}`);
      return;
    }

    if (currentStatus.includes("progress")) {
      // In Progress -> process test readings to complete
      navigate(`/lab/process/${id}`);
      return;
    }

    // Pending / Sample collected -> Move to In Progress
    try {
      setUpdatingId(id);
      await labApi.labPrescriptions.patch(id, { Status: "In Progress" });
      await loadOrders();
    } catch (err) {
      alert(err?.response?.data?.detail || err?.message || "Failed to update order status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingList = orders.filter((o) => {
    const s = String(o.Status || o.status || "Pending").toLowerCase();
    return !s.includes("complete") && !s.includes("progress");
  });

  const inProgressList = orders.filter((o) =>
    String(o.Status || o.status || "").toLowerCase().includes("progress")
  );

  const completedList = orders.filter((o) =>
    String(o.Status || o.status || "").toLowerCase().includes("complete")
  );

  const renderOrderCard = (ord, laneType) => {
    const id = ord.LabPrescriptionId ?? ord.id;
    const testName =
      ord.LabTest?.TestName || ord.test_name || `Test #${ord.LabTestId || ord.test || "-"}`;
    const patName =
      ord.patient_name || ord.Patient?.Name || `Patient #${ord.PatientId || "-"}`;
    const docName =
      ord.doctor_name || ord.Doctor?.Name || `Dr. #${ord.DoctorId || "-"}`;
    const sample =
      ord.SampleType || ord.sample_type || ord.LabTest?.SampleType || "Blood Specimen";
    const status = ord.Status || ord.status || "Pending";
    const isBusy = updatingId === id;

    return (
      <div key={id} className="card border shadow-sm mb-3 rounded-3">
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle me-2">
                Order #{id}
              </span>
              <span className="badge bg-light text-dark border">{sample}</span>
            </div>
            <StatusBadge status={status} />
          </div>

          <h6 className="fw-bold mb-1 text-dark">{testName}</h6>
          <div className="small text-muted mb-2">
            <div>
              <i className="bi bi-person me-1"></i> Patient:{" "}
              <span className="fw-semibold text-dark">{patName}</span>
            </div>
            <div>
              <i className="bi bi-person-badge me-1"></i> Doctor: {docName}
            </div>
          </div>

          <div className="border-top pt-2 mt-2 d-flex justify-content-between align-items-center">
            <span className="small text-muted">{ord.LabTestDate || "Prescribed Today"}</span>
            <div>
              {laneType === "pending" && (
                <button
                  className="btn btn-sm btn-primary"
                  disabled={isBusy}
                  onClick={() => handleMoveToNext(ord)}
                >
                  {isBusy ? (
                    <span className="spinner-border spinner-border-sm me-1"></span>
                  ) : (
                    <i className="bi bi-arrow-right-circle me-1"></i>
                  )}
                  Move to In Progress
                </button>
              )}

              {laneType === "in_progress" && (
                <button
                  className="btn btn-sm btn-success"
                  disabled={isBusy}
                  onClick={() => handleMoveToNext(ord)}
                >
                  <i className="bi bi-play-circle me-1"></i>
                  Process & Complete
                </button>
              )}

              {laneType === "completed" && (
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => navigate(`/lab/billing?orderId=${id}`)}
                >
                  <i className="bi bi-receipt me-1"></i>
                  Billing
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid py-2">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold mb-1">Laboratory Workflow Queues</h4>
          <span className="text-muted small">
            Track and advance test orders through the specimen collection, analyzer processing, and completed queues.
          </span>
        </div>
        <button className="btn btn-sm btn-outline-secondary" onClick={loadOrders}>
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger py-2 small mb-3">
          <i className="bi bi-exclamation-triangle-fill me-1"></i> {error}
        </div>
      )}

      {loading ? (
        <Loader text="Loading queue lanes..." />
      ) : (
        <div className="row g-3">
          {/* Lane 1: Pending */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm rounded-3 bg-light h-100">
              <div className="card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center">
                <span className="fw-bold text-warning">
                  <i className="bi bi-hourglass-split me-1"></i> Pending Samples
                </span>
                <span className="badge bg-warning rounded-pill">{pendingList.length}</span>
              </div>
              <div className="card-body p-2" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                {pendingList.length === 0 ? (
                  <div className="p-4 text-center text-muted small">No pending sample orders.</div>
                ) : (
                  pendingList.map((ord) => renderOrderCard(ord, "pending"))
                )}
              </div>
            </div>
          </div>

          {/* Lane 2: In Progress */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm rounded-3 bg-light h-100">
              <div className="card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center">
                <span className="fw-bold text-info">
                  <i className="bi bi-gear-wide-connected me-1"></i> In Progress
                </span>
                <span className="badge bg-info rounded-pill">{inProgressList.length}</span>
              </div>
              <div className="card-body p-2" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                {inProgressList.length === 0 ? (
                  <div className="p-4 text-center text-muted small">No tests currently in progress.</div>
                ) : (
                  inProgressList.map((ord) => renderOrderCard(ord, "in_progress"))
                )}
              </div>
            </div>
          </div>

          {/* Lane 3: Completed */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm rounded-3 bg-light h-100">
              <div className="card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center">
                <span className="fw-bold text-success">
                  <i className="bi bi-check-circle me-1"></i> Completed Tests
                </span>
                <span className="badge bg-success rounded-pill">{completedList.length}</span>
              </div>
              <div className="card-body p-2" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                {completedList.length === 0 ? (
                  <div className="p-4 text-center text-muted small">No completed tests yet.</div>
                ) : (
                  completedList.map((ord) => renderOrderCard(ord, "completed"))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

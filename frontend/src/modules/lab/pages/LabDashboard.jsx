import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import labApi from "../../../api/labApi.js";
import StatusBadge from "../../../components/common/StatusBadge.jsx";
import Loader from "../../../components/common/Loader.jsx";
import EmptyState from "../../../components/common/EmptyState.jsx";

export default function LabDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [orders, setOrders] = useState([]);
  const [reports, setReports] = useState([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordRes, repRes] = await Promise.allSettled([
        labApi.labPrescriptions.list(),
        labApi.labReports.list(),
      ]);

      if (ordRes.status === "fulfilled") {
        const val = ordRes.value;
        setOrders(val.results || val.data || (Array.isArray(val) ? val : []));
      }
      if (repRes.status === "fulfilled") {
        const val = repRes.value;
        setReports(val.results || val.data || (Array.isArray(val) ? val : []));
      }
    } catch (err) {
      setError(err?.message || "Failed to load laboratory dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <Loader text="Loading Lab Dashboard..." />;

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => {
    const s = String(o.Status || o.status || "Pending").toLowerCase();
    return s.includes("pend") || s.includes("sample");
  }).length;
  const inProgressOrders = orders.filter((o) => {
    const s = String(o.Status || o.status || "").toLowerCase();
    return s.includes("progress");
  }).length;
  const completedOrders = orders.filter((o) => {
    const s = String(o.Status || o.status || "").toLowerCase();
    return s.includes("complete");
  }).length;
  const totalReports = reports.length;

  const recentOrders = orders.slice(0, 6);

  return (
    <div className="container-fluid py-2">
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Laboratory Overview</h4>
          <span className="text-muted small">
            Real-time test orders, specimen processing queue, and completed clinical diagnostic reports.
          </span>
        </div>
        <div className="d-flex gap-2">
          <Link to="/lab/queues" className="btn btn-sm btn-outline-primary">
            <i className="bi bi-list-check me-1"></i> Processing Queue
          </Link>
          <button className="btn btn-sm btn-light border" onClick={loadData}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 small mb-3">
          <i className="bi bi-exclamation-triangle-fill me-1"></i> {error}
        </div>
      )}

      {/* 5 KPI Metric Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl">
          <div className="card border-0 shadow-sm rounded-3 h-100 bg-white">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small text-uppercase fw-semibold">Total Orders</span>
                <h3 className="fw-bold mb-0 mt-1 text-dark">{totalOrders}</h3>
              </div>
              <div className="rounded-circle p-3 bg-primary-subtle text-primary">
                <i className="bi bi-eyedropper fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl">
          <div className="card border-0 shadow-sm rounded-3 h-100 bg-white">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small text-uppercase fw-semibold">Pending Samples</span>
                <h3 className="fw-bold mb-0 mt-1 text-warning">{pendingOrders}</h3>
              </div>
              <div className="rounded-circle p-3 bg-warning-subtle text-warning">
                <i className="bi bi-hourglass-split fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl">
          <div className="card border-0 shadow-sm rounded-3 h-100 bg-white">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small text-uppercase fw-semibold">In Progress</span>
                <h3 className="fw-bold mb-0 mt-1 text-info">{inProgressOrders}</h3>
              </div>
              <div className="rounded-circle p-3 bg-info-subtle text-info">
                <i className="bi bi-gear-wide-connected fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl">
          <div className="card border-0 shadow-sm rounded-3 h-100 bg-white">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small text-uppercase fw-semibold">Completed</span>
                <h3 className="fw-bold mb-0 mt-1 text-success">{completedOrders}</h3>
              </div>
              <div className="rounded-circle p-3 bg-success-subtle text-success">
                <i className="bi bi-check-circle fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl">
          <div className="card border-0 shadow-sm rounded-3 h-100 bg-white">
            <div className="card-body p-3 d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small text-uppercase fw-semibold">Reports Saved</span>
                <h3 className="fw-bold mb-0 mt-1 text-primary">{totalReports}</h3>
              </div>
              <div className="rounded-circle p-3 bg-indigo-subtle text-indigo">
                <i className="bi bi-file-earmark-medical fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Table Panel */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h6 className="fw-bold mb-0">Recent Diagnostic Lab Orders</h6>
          <Link to="/lab/orders" className="btn btn-sm btn-link text-decoration-none">
            View All Orders &rarr;
          </Link>
        </div>
        <div className="table-responsive">
          {recentOrders.length === 0 ? (
            <EmptyState message="No laboratory orders available." />
          ) : (
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-uppercase text-muted">
                <tr>
                  <th>Order #</th>
                  <th>Patient</th>
                  <th>Test Name</th>
                  <th>Sample Type</th>
                  <th>Status</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((ord) => {
                  const id = ord.LabPrescriptionId ?? ord.id;
                  const testName = ord.LabTest?.TestName || ord.test_name || `Test #${ord.LabTestId || ord.test || "-"}`;
                  const patName = ord.patient_name || ord.Patient?.Name || `Patient #${ord.PatientId || "-"}`;
                  const sample = ord.SampleType || ord.sample_type || ord.LabTest?.SampleType || "Blood";
                  const status = ord.Status || ord.status || "Pending";

                  return (
                    <tr key={id}>
                      <td className="fw-bold text-primary">#{id}</td>
                      <td>
                        <span className="fw-semibold">{patName}</span>
                      </td>
                      <td>{testName}</td>
                      <td>
                        <span className="badge bg-light text-dark border">{sample}</span>
                      </td>
                      <td>
                        <StatusBadge status={status} />
                      </td>
                      <td className="text-end">
                        {status !== "Completed" ? (
                          <button
                            className="btn btn-sm btn-primary py-1 px-2"
                            onClick={() => navigate(`/lab/process/${id}`)}
                          >
                            <i className="bi bi-play-circle me-1"></i> Process Test
                          </button>
                        ) : (
                          <Link to="/lab/reports" className="btn btn-sm btn-outline-secondary py-1 px-2">
                            <i className="bi bi-file-earmark-text me-1"></i> View Report
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

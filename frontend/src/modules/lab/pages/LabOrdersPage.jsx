import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import labApi from "../../../api/labApi.js";
import StatusBadge from "../../../components/common/StatusBadge.jsx";
import Loader from "../../../components/common/Loader.jsx";
import EmptyState from "../../../components/common/EmptyState.jsx";

export default function LabOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await labApi.labPrescriptions.list();
      setOrders(res.results || res.data || (Array.isArray(res) ? res : []));
    } catch (err) {
      setError(err?.message || "Failed to load laboratory orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const s = String(o.Status || o.status || "Pending").toLowerCase();

      // Status filter
      if (statusFilter === "pending") {
        if (!s.includes("pend") && !s.includes("sample")) return false;
      } else if (statusFilter === "in_progress") {
        if (!s.includes("progress")) return false;
      } else if (statusFilter === "completed") {
        if (!s.includes("complete")) return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const pat = String(o.patient_name || o.Patient?.Name || "").toLowerCase();
        const test = String(o.LabTest?.TestName || o.test_name || "").toLowerCase();
        const doc = String(o.doctor_name || o.Doctor?.Name || "").toLowerCase();
        const id = String(o.LabPrescriptionId ?? o.id ?? "");
        return pat.includes(q) || test.includes(q) || doc.includes(q) || id.includes(q);
      }

      return true;
    });
  }, [orders, statusFilter, search]);

  return (
    <div className="container-fluid py-2">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-1">Diagnostic Test Orders</h4>
          <span className="text-muted small">
            View, filter, and process all laboratory test orders prescribed by clinic doctors.
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

      {/* Filter Toolbar */}
      <div className="card border-0 shadow-sm rounded-3 mb-3">
        <div className="card-body p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          {/* Status Tabs */}
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`btn ${statusFilter === "all" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setStatusFilter("all")}
            >
              All Orders ({orders.length})
            </button>
            <button
              type="button"
              className={`btn ${statusFilter === "pending" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setStatusFilter("pending")}
            >
              Pending (
              {
                orders.filter((o) => {
                  const s = String(o.Status || o.status || "Pending").toLowerCase();
                  return s.includes("pend") || s.includes("sample");
                }).length
              }
              )
            </button>
            <button
              type="button"
              className={`btn ${statusFilter === "in_progress" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setStatusFilter("in_progress")}
            >
              In Progress (
              {
                orders.filter((o) =>
                  String(o.Status || o.status || "").toLowerCase().includes("progress")
                ).length
              }
              )
            </button>
            <button
              type="button"
              className={`btn ${statusFilter === "completed" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setStatusFilter("completed")}
            >
              Completed (
              {
                orders.filter((o) =>
                  String(o.Status || o.status || "").toLowerCase().includes("complete")
                ).length
              }
              )
            </button>
          </div>

          {/* Search box */}
          <div className="input-group input-group-sm" style={{ width: "260px" }}>
            <span className="input-group-text bg-light border-end-0">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search by patient, test, doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="btn btn-outline-secondary border-start-0"
                type="button"
                onClick={() => setSearch("")}
              >
                &times;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="table-responsive">
          {loading ? (
            <Loader text="Loading orders..." />
          ) : filteredOrders.length === 0 ? (
            <EmptyState message="No laboratory test orders match the criteria." />
          ) : (
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-uppercase text-muted">
                <tr>
                  <th>Order #</th>
                  <th>Patient</th>
                  <th>Prescribed By</th>
                  <th>Test Name</th>
                  <th>Sample Specimen</th>
                  <th>Order Date</th>
                  <th>Status</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => {
                  const id = ord.LabPrescriptionId ?? ord.id;
                  const testName =
                    ord.LabTest?.TestName ||
                    ord.test_name ||
                    `Test #${ord.LabTestId || ord.test || "-"}`;
                  const patName =
                    ord.patient_name ||
                    ord.Patient?.Name ||
                    `Patient #${ord.PatientId || "-"}`;
                  const docName =
                    ord.doctor_name ||
                    ord.Doctor?.Name ||
                    `Dr. #${ord.DoctorId || "-"}`;
                  const sample =
                    ord.SampleType ||
                    ord.sample_type ||
                    ord.LabTest?.SampleType ||
                    "Blood";
                  const dt = ord.LabTestDate || ord.date || "";
                  const status = ord.Status || ord.status || "Pending";

                  return (
                    <tr key={id}>
                      <td className="fw-bold text-primary">#{id}</td>
                      <td>
                        <span className="fw-semibold">{patName}</span>
                      </td>
                      <td>{docName}</td>
                      <td>
                        <span className="fw-semibold text-dark">{testName}</span>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">{sample}</span>
                      </td>
                      <td className="small text-muted">{dt || "-"}</td>
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
                          <button
                            className="btn btn-sm btn-outline-success py-1 px-2"
                            onClick={() => navigate("/lab/reports")}
                          >
                            <i className="bi bi-check2-circle me-1"></i> View Report
                          </button>
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

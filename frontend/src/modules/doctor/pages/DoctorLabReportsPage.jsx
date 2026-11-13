import React, { useState, useEffect, useCallback } from "react";
import doctorApi from "../../../api/doctorApi.js";
import {
  PageHeader,
  Loader,
  EmptyState,
  ErrorAlert,
} from "../../../components/common/index.js";

export default function DoctorLabReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await doctorApi.labReports.list();
      setReports(res.results || res.data || (Array.isArray(res) ? res : []));
    } catch (err) {
      setError(err?.message || "Failed to load diagnostic laboratory reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filtered = reports.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const pat = String(r.patient_name || "").toLowerCase();
    const test = String(r.test_name || "").toLowerCase();
    const reading = String(r.ActualReading || "").toLowerCase();
    const remarks = String(r.remarks || "").toLowerCase();
    const id = String(r.ReportId ?? r.id ?? "");
    const orderId = String(r.order_id || r.LabPrescriptionId || "");
    return (
      pat.includes(q) ||
      test.includes(q) ||
      reading.includes(q) ||
      remarks.includes(q) ||
      id.includes(q) ||
      orderId.includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Diagnostic Laboratory Reports"
        subtitle="Review finalized laboratory test findings, observations, and values for your patients"
        actions={
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={loadReports}
          >
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
        }
      />

      {error && <ErrorAlert error={error} onRetry={loadReports} />}

      {/* Search Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search by patient, test name, readings, or report #..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-7 text-md-end text-muted small">
              Showing {filtered.length} of {reports.length} report{reports.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="table-responsive">
          {loading ? (
            <div className="p-4 text-center">
              <Loader text="Loading laboratory reports..." />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon="bi-file-earmark-medical"
                title="No laboratory reports available"
                message={
                  search
                    ? "No laboratory reports match your search query."
                    : "When the laboratory technician completes diagnostics and records findings, they will appear here."
                }
              />
            </div>
          ) : (
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-uppercase text-muted">
                <tr>
                  <th style={{ width: "90px" }}>Report #</th>
                  <th style={{ width: "90px" }}>Order #</th>
                  <th>Patient</th>
                  <th>Test Name</th>
                  <th>Actual Reading Summary</th>
                  <th>Remarks</th>
                  <th>Date</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const id = r.ReportId ?? r.id;
                  const orderId = r.order_id || r.LabPrescriptionId || "-";
                  const dateStr = r.created_at || r.report_date || "-";

                  return (
                    <tr key={id}>
                      <td className="fw-bold text-primary">#{id}</td>
                      <td>
                        <span className="badge bg-light text-secondary border">
                          #{orderId}
                        </span>
                      </td>
                      <td>
                        <span className="fw-semibold text-dark">
                          {r.patient_name || `Patient #${r.patient_id || "-"}`}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle">
                          {r.test_name || "Diagnostic Test"}
                        </span>
                      </td>
                      <td>
                        <div
                          className="text-truncate small font-monospace"
                          style={{ maxWidth: "240px" }}
                          title={r.ActualReading}
                        >
                          {r.ActualReading || "-"}
                        </div>
                      </td>
                      <td>
                        <div
                          className="text-truncate small text-muted"
                          style={{ maxWidth: "200px" }}
                          title={r.remarks}
                        >
                          {r.remarks || "-"}
                        </div>
                      </td>
                      <td className="small text-muted">{dateStr}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => setSelectedReport(r)}
                        >
                          <i className="bi bi-eye me-1"></i>View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="bi bi-file-earmark-medical-fill text-primary me-2"></i>
                  Lab Report #{selectedReport.ReportId ?? selectedReport.id}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedReport(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3 mb-4">
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded-3">
                      <span className="text-muted small d-block mb-1">Patient</span>
                      <h6 className="fw-bold mb-0 text-dark">
                        {selectedReport.patient_name || `Patient #${selectedReport.patient_id || "-"}`}
                      </h6>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded-3">
                      <span className="text-muted small d-block mb-1">Test Name</span>
                      <h6 className="fw-bold mb-0 text-primary">
                        {selectedReport.test_name || "Diagnostic Test"}
                      </h6>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded-3">
                      <span className="text-muted small d-block mb-1">Lab Order #</span>
                      <span className="fw-semibold text-dark">
                        #{selectedReport.order_id || selectedReport.LabPrescriptionId || "-"}
                      </span>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded-3">
                      <span className="text-muted small d-block mb-1">Report Date</span>
                      <span className="fw-semibold text-dark">
                        {selectedReport.created_at || selectedReport.report_date || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-bold small text-uppercase text-muted">
                    Measured Clinical Readings / Values
                  </label>
                  <div className="p-3 bg-body-tertiary rounded-3 border font-monospace small">
                    {selectedReport.ActualReading || "No specific reading details recorded."}
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label fw-bold small text-uppercase text-muted">
                    Laboratory Technician Remarks & Interpretations
                  </label>
                  <div className="p-3 bg-light rounded-3 border-start border-4 border-primary">
                    <p className="mb-0 text-dark">
                      {selectedReport.remarks || "No technician remarks provided."}
                    </p>
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm px-4"
                  onClick={() => setSelectedReport(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

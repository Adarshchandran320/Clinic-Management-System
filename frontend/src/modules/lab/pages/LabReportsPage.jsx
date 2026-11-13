import React, { useState, useEffect, useCallback } from "react";
import labApi from "../../../api/labApi.js";
import Loader from "../../../components/common/Loader.jsx";
import EmptyState from "../../../components/common/EmptyState.jsx";

export default function LabReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [viewingReport, setViewingReport] = useState(null);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await labApi.labReports.list();
      setReports(res.results || res.data || (Array.isArray(res) ? res : []));
    } catch (err) {
      setError(err?.message || "Failed to load laboratory reports.");
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
    const reading = String(r.ActualReading || "").toLowerCase();
    const rem = String(r.remarks || "").toLowerCase();
    const id = String(r.ReportId ?? r.id ?? "");
    const ordId = String(r.LabPrescriptionId ?? r.prescription ?? "");
    return reading.includes(q) || rem.includes(q) || id.includes(q) || ordId.includes(q);
  });

  return (
    <div className="container-fluid py-2">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-1">Diagnostic Laboratory Reports</h4>
          <span className="text-muted small">
            Archive of finalized and signed laboratory test findings.
          </span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="input-group input-group-sm" style={{ width: "240px" }}>
            <span className="input-group-text bg-light border-end-0">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={loadReports}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 small mb-3">
          <i className="bi bi-exclamation-triangle-fill me-1"></i> {error}
        </div>
      )}

      {/* Reports Table */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="table-responsive">
          {loading ? (
            <Loader text="Loading reports..." />
          ) : filtered.length === 0 ? (
            <EmptyState message="No laboratory reports recorded yet." />
          ) : (
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-uppercase text-muted">
                <tr>
                  <th>Report #</th>
                  <th>Order #</th>
                  <th>Actual Reading Summary</th>
                  <th>Remarks</th>
                  <th>Report Date</th>
                  <th>Technician</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const id = r.ReportId ?? r.id;
                  const ordId = r.LabPrescriptionId ?? r.prescription ?? "-";
                  const dt = r.ReportDate || r.date || "";
                  const tech = r.technician_name || (r.LabTechnician ? `Staff #${r.LabTechnician}` : "Lab Technician");

                  return (
                    <tr key={id}>
                      <td className="fw-bold text-primary">#{id}</td>
                      <td>
                        <span className="badge bg-light text-dark border">Order #{ordId}</span>
                      </td>
                      <td style={{ maxWidth: "280px" }}>
                        <span
                          className="d-inline-block text-truncate small fw-semibold text-dark"
                          style={{ maxWidth: "270px" }}
                          title={r.ActualReading}
                        >
                          {r.ActualReading || "-"}
                        </span>
                      </td>
                      <td style={{ maxWidth: "200px" }}>
                        <span
                          className="d-inline-block text-truncate small text-muted"
                          style={{ maxWidth: "190px" }}
                          title={r.remarks}
                        >
                          {r.remarks || "-"}
                        </span>
                      </td>
                      <td className="small text-muted">
                        {dt ? new Date(dt).toLocaleString() : "-"}
                      </td>
                      <td className="small">{tech}</td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-primary py-1 px-2"
                          onClick={() => setViewingReport(r)}
                        >
                          <i className="bi bi-eye me-1"></i> View Report
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

      {/* Read-Only View Modal */}
      {viewingReport && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom bg-light">
                <div>
                  <h5 className="modal-title fw-bold mb-0">
                    <i className="bi bi-file-earmark-medical me-2 text-primary"></i>
                    Diagnostic Laboratory Report #{viewingReport.ReportId ?? viewingReport.id}
                  </h5>
                  <small className="text-muted">
                    Order #{viewingReport.LabPrescriptionId ?? viewingReport.prescription} | Finalized Report
                  </small>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewingReport(null)}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="row g-2 small">
                    <div className="col-6">
                      <span className="text-muted">Report ID:</span>{" "}
                      <span className="fw-bold">#{viewingReport.ReportId ?? viewingReport.id}</span>
                    </div>
                    <div className="col-6">
                      <span className="text-muted">Prescription Order:</span>{" "}
                      <span className="fw-bold">
                        #{viewingReport.LabPrescriptionId ?? viewingReport.prescription}
                      </span>
                    </div>
                    <div className="col-6">
                      <span className="text-muted">Date & Time:</span>{" "}
                      <span className="fw-semibold">
                        {viewingReport.ReportDate
                          ? new Date(viewingReport.ReportDate).toLocaleString()
                          : "Today"}
                      </span>
                    </div>
                    <div className="col-6">
                      <span className="text-muted">Lab Technician:</span>{" "}
                      <span className="fw-semibold">
                        {viewingReport.technician_name ||
                          (viewingReport.LabTechnician
                            ? `Staff #${viewingReport.LabTechnician}`
                            : "Authorized Technician")}
                      </span>
                    </div>
                  </div>
                </div>

                <h6 className="fw-bold text-uppercase text-muted small mb-2">
                  Measured Analyzer Findings
                </h6>
                <div className="p-3 rounded border bg-white mb-3 font-monospace small">
                  {viewingReport.ActualReading}
                </div>

                <h6 className="fw-bold text-uppercase text-muted small mb-2">
                  Technician Clinical Remarks
                </h6>
                <div className="p-3 rounded border bg-light small mb-3">
                  {viewingReport.remarks || "No additional remarks."}
                </div>

                <div className="alert alert-info py-2 px-3 small d-flex align-items-center mb-0">
                  <i className="bi bi-shield-check me-2 fs-5"></i>
                  <div>
                    This diagnostic report has been validated and authorized under ISO/NABL clinical laboratory standards.
                  </div>
                </div>
              </div>

              <div className="modal-footer border-top bg-light">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => window.print()}
                >
                  <i className="bi bi-printer me-1"></i> Print Report
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setViewingReport(null)}
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

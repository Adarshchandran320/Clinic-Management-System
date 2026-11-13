import React, { useEffect, useMemo, useState } from "react";
import adminApi from "../../../api/adminApi.js";
import Loader from "../../../components/common/Loader.jsx";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [tableFilter, setTableFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.auditLogs.list();
      const list = Array.isArray(data) ? data : data?.results || [];
      // Sort newest first
      list.sort((a, b) => {
        const da = new Date(a.action_time || a.Timestamp || 0);
        const db = new Date(b.action_time || b.Timestamp || 0);
        return db - da;
      });
      setLogs(list);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      setError("Failed to load system audit trail. Please check your permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const actionTypes = useMemo(() => {
    const set = new Set();
    logs.forEach((l) => {
      if (l.ActionType) set.add(l.ActionType);
      else if (l.action) set.add(l.action);
    });
    return Array.from(set).sort();
  }, [logs]);

  const affectedTables = useMemo(() => {
    const set = new Set();
    logs.forEach((l) => {
      if (l.TableAffected) set.add(l.TableAffected);
      else if (l.table_name) set.add(l.table_name);
    });
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const act = log.ActionType || log.action || "";
      const tbl = log.TableAffected || log.table_name || "";
      const user = log.Username || log.username || "";
      const details = log.Details || log.details || "";
      const recordId = String(log.RecordId ?? log.record_id ?? "");

      if (actionFilter !== "ALL" && act !== actionFilter) {
        return false;
      }
      if (tableFilter !== "ALL" && tbl !== tableFilter) {
        return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches =
          act.toLowerCase().includes(q) ||
          tbl.toLowerCase().includes(q) ||
          user.toLowerCase().includes(q) ||
          details.toLowerCase().includes(q) ||
          recordId.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [logs, actionFilter, tableFilter, searchTerm]);

  const renderActionBadge = (action) => {
    const act = String(action || "").toUpperCase();
    let bg = "bg-secondary";
    if (act.includes("CREATE")) bg = "bg-success";
    else if (act.includes("UPDATE")) bg = "bg-primary";
    else if (act.includes("DELETE")) bg = "bg-danger";
    else if (act.includes("LOGIN")) bg = "bg-info";
    else if (act.includes("DEACTIVATE")) bg = "bg-warning text-dark";

    return <span className={`badge ${bg} px-2 py-1`}>{act || "ACTION"}</span>;
  };

  return (
    <div className="container-fluid p-0">
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h4 className="mb-0 fw-bold">System Audit Logs</h4>
          <p className="text-muted small mb-0 mt-1">
            Immutable clinical trail of security events, administrative updates, and record mutations
          </p>
        </div>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={fetchLogs}
          disabled={loading}
        >
          <i className={`bi bi-arrow-clockwise me-1 ${loading ? "spin" : ""}`}></i> Refresh Trail
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search operator, record ID, details..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    className="btn btn-outline-secondary border-start-0"
                    type="button"
                    onClick={() => setSearchTerm("")}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="col-6 col-md-3">
              <select
                className="form-select"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="ALL">All Actions ({logs.length})</option>
                {actionTypes.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-6 col-md-3">
              <select
                className="form-select"
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
              >
                <option value="ALL">All Tables / Entities</option>
                {affectedTables.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-2 text-md-end text-muted small">
              Showing <strong>{filteredLogs.length}</strong> of {logs.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Audit Table */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {loading ? (
            <div className="py-5 text-center">
              <Loader message="Retrieving secure audit events..." />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-danger">
              <i className="bi bi-exclamation-triangle fs-3 d-block mb-2"></i>
              {error}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-4 text-center text-muted">
              <i className="bi bi-journal-x fs-3 d-block mb-2"></i>
              No audit log entries matched your filter criteria.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase text-muted">
                  <tr>
                    <th style={{ width: "80px" }}>Log ID</th>
                    <th>Timestamp</th>
                    <th>Operator</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Record ID</th>
                    <th>Details</th>
                    <th className="text-end pe-3">Inspect</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const id = log.AuditId ?? log.id;
                    const time = log.action_time || log.Timestamp;
                    const dateStr = time ? new Date(time).toLocaleString() : "-";
                    const operator = log.Username || log.username || "System";
                    const action = log.ActionType || log.action;
                    const table = log.TableAffected || log.table_name || "-";
                    const record = log.RecordId ?? log.record_id ?? "-";
                    const details = log.Details || log.details || "-";

                    return (
                      <tr key={id}>
                        <td className="font-monospace small text-muted">#{id}</td>
                        <td className="small text-nowrap">{dateStr}</td>
                        <td>
                          <span className="fw-semibold text-primary">{operator}</span>
                        </td>
                        <td>{renderActionBadge(action)}</td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {table}
                          </span>
                        </td>
                        <td className="font-monospace small">#{record}</td>
                        <td className="small text-truncate" style={{ maxWidth: "300px" }} title={details}>
                          {details}
                        </td>
                        <td className="text-end pe-3">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setSelectedLog(log)}
                            title="View log details"
                          >
                            <i className="bi bi-eye"></i>
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

      {/* Log Details Modal */}
      {selectedLog && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">
                  Audit Event #{selectedLog.AuditId ?? selectedLog.id}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedLog(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div>{renderActionBadge(selectedLog.ActionType || selectedLog.action)}</div>
                  <span className="text-muted small">
                    {new Date(
                      selectedLog.action_time || selectedLog.Timestamp || Date.now()
                    ).toLocaleString()}
                  </span>
                </div>

                <ul className="list-group list-group-flush mb-3 small">
                  <li className="list-group-item d-flex justify-content-between px-0">
                    <span className="text-muted">Operator Username:</span>
                    <span className="fw-bold">{selectedLog.Username || selectedLog.username || "System"}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between px-0">
                    <span className="text-muted">Target Table:</span>
                    <span className="font-monospace fw-semibold">{selectedLog.TableAffected || selectedLog.table_name || "-"}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between px-0">
                    <span className="text-muted">Target Record ID:</span>
                    <span className="font-monospace">#{selectedLog.RecordId ?? selectedLog.record_id ?? "-"}</span>
                  </li>
                </ul>

                <div>
                  <label className="form-label text-muted small fw-bold">Event Details & Payload:</label>
                  <div className="p-3 bg-light rounded border font-monospace small" style={{ whiteSpace: "pre-wrap" }}>
                    {selectedLog.Details || selectedLog.details || "No additional metadata recorded."}
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedLog(null)}
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

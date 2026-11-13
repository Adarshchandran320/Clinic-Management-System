import React, { useState, useEffect, useCallback } from "react";
import labApi from "../../../api/labApi.js";
import {
  PageHeader,
  DataTable,
  StatusBadge,
} from "../../../components/common/index.js";

// Single column-config array for Lab Prescriptions (/api/lab-prescriptions/)
const LAB_PRESCRIPTION_COLUMNS = [
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
    label: "Ordered By",
    formatter: (val, row) => val || row.doctor?.name || row.doctor || "-",
  },
  {
    key: "test_name",
    label: "Lab Test",
    formatter: (val, row) => (
      <span className="fw-medium">{val || row.test || row.name || "-"}</span>
    ),
  },
  {
    key: "notes",
    label: "Instructions / Notes",
    formatter: (val, row) => val || row.description || "-",
  },
  {
    key: "created_at",
    label: "Ordered Date",
    formatter: (val, row) => val || row.date || "-",
  },
  {
    key: "status",
    label: "Status",
    formatter: (val, row) => (
      <StatusBadge status={val || (row.is_completed ? "Completed" : "Pending")} />
    ),
  },
];

export default function LabPrescriptionsPage() {
  const [labOrders, setLabOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLabPrescriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await labApi.labPrescriptions.list();
      setLabOrders(res.results || res.data || (Array.isArray(res) ? res : []));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLabPrescriptions();
  }, [loadLabPrescriptions]);

  const filtered = labOrders.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const test = String(item.test_name || item.test || "").toLowerCase();
    const pat = String(item.patient_name || item.patient || "").toLowerCase();
    return test.includes(q) || pat.includes(q);
  });

  return (
    <div>
      <PageHeader
        title="Laboratory Prescriptions"
        subtitle="Incoming diagnostic test prescriptions ordered by clinic doctors"
        actions={
          <button
            type="button"
            className="btn btn-light border btn-sm px-3"
            onClick={loadLabPrescriptions}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>Refresh
          </button>
        }
      />

      <div className="card">
        <div className="card-header bg-transparent border-bottom py-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-sm-6 col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-transparent">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Filter by test name or patient..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          <DataTable
            columns={LAB_PRESCRIPTION_COLUMNS}
            data={filtered}
            loading={loading}
            error={error}
            onRetry={loadLabPrescriptions}
            emptyTitle="No lab prescriptions found"
            emptyMessage="Lab test orders created during doctor consultations will appear here."
          />
        </div>
      </div>
    </div>
  );
}

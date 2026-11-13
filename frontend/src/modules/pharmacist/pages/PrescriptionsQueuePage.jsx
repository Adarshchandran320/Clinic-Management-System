import React, { useState, useEffect, useCallback } from "react";
import pharmacistApi from "../../../api/pharmacistApi.js";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  ConfirmModal,
} from "../../../components/common/index.js";
import PrescriptionDrawer from "../components/PrescriptionDrawer.jsx";

const PRESCRIPTION_COLUMNS = (onView, onDispense) => [
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
    label: "Prescribed By",
    formatter: (val, row) => val || row.doctor?.name || row.doctor || "-",
  },
  {
    key: "created_at",
    label: "Date",
    formatter: (val, row) => val || row.date || "-",
  },
  {
    key: "status",
    label: "Status",
    formatter: (val, row) => (
      <StatusBadge status={val || (row.is_dispensed ? "Dispensed" : "Pending")} />
    ),
  },
  {
    key: "actions",
    label: "",
    className: "text-end",
    formatter: (_, row) => {
      const status = String(
        row.status || (row.is_dispensed ? "Dispensed" : "Pending")
      ).toLowerCase();
      const isPending = !status.includes("dispens") && !row.is_dispensed;
      return (
        <div className="d-inline-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-light border"
            onClick={() => onView(row)}
          >
            View
          </button>
          {isPending && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => onDispense(row)}
            >
              Dispense
            </button>
          )}
        </div>
      );
    },
  },
];

export default function PrescriptionsQueuePage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState("");

  // Drawer state
  const [drawerItem, setDrawerItem] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState(null);

  // Dispense modal state
  const [dispenseTarget, setDispenseTarget] = useState(null);
  const [dispensing, setDispensing] = useState(false);
  const [dispenseError, setDispenseError] = useState(null);

  const loadPrescriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await pharmacistApi.getPrescriptions();
      setPrescriptions(list);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const handleViewDetails = async (row) => {
    setDrawerItem(row);
    setDrawerError(null);
    setDrawerLoading(true);
    try {
      const full = await pharmacistApi.getPrescriptionById(row.id);
      setDrawerItem(full);
    } catch (err) {
      setDrawerError(err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleConfirmDispense = async () => {
    if (!dispenseTarget) return;
    setDispensing(true);
    setDispenseError(null);
    try {
      await pharmacistApi.dispensePrescription(dispenseTarget.id);
      setToast(
        `Prescription #${dispenseTarget.id} dispensed and bill created successfully.`
      );
      setDispenseTarget(null);
      loadPrescriptions();
    } catch (err) {
      // Server validation errors (e.g., insufficient stock) are displayed in ConfirmModal's ErrorAlert
      setDispenseError(err);
    } finally {
      setDispensing(false);
    }
  };

  const filteredList = prescriptions.filter((p) => {
    if (statusFilter === "all") return true;
    const raw = String(
      p.status || (p.is_dispensed ? "Dispensed" : "Pending")
    ).toLowerCase();
    return raw.includes(statusFilter);
  });

  return (
    <div>
      <PageHeader
        title="Prescriptions Queue"
        subtitle="Incoming prescriptions for dispensing and automated billing"
      />

      {toast && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="bi bi-check-circle-fill me-2"></i>
          {toast}
          <button
            type="button"
            className="btn-close"
            onClick={() => setToast("")}
          ></button>
        </div>
      )}

      <div className="card">
        <div className="card-header bg-transparent border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2 py-3">
          <div className="btn-group btn-group-sm" role="group" aria-label="Status filter">
            <button
              type="button"
              className={`btn ${
                statusFilter === "all" ? "btn-primary" : "btn-light border"
              }`}
              onClick={() => setStatusFilter("all")}
            >
              All ({prescriptions.length})
            </button>
            <button
              type="button"
              className={`btn ${
                statusFilter === "pending" ? "btn-primary" : "btn-light border"
              }`}
              onClick={() => setStatusFilter("pending")}
            >
              Pending
            </button>
            <button
              type="button"
              className={`btn ${
                statusFilter === "dispens" ? "btn-primary" : "btn-light border"
              }`}
              onClick={() => setStatusFilter("dispens")}
            >
              Dispensed
            </button>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-light border"
            onClick={loadPrescriptions}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>Refresh
          </button>
        </div>

        <div className="card-body p-0">
          <DataTable
            columns={PRESCRIPTION_COLUMNS(handleViewDetails, (row) => {
              setDispenseError(null);
              setDispenseTarget(row);
            })}
            data={filteredList}
            loading={loading}
            error={error}
            onRetry={loadPrescriptions}
            emptyTitle="No prescriptions in queue"
            emptyMessage="No prescriptions match the selected status filter."
          />
        </div>
      </div>

      {/* Detail Drawer */}
      <PrescriptionDrawer
        show={Boolean(drawerItem)}
        prescription={drawerItem}
        loading={drawerLoading}
        error={drawerError}
        onClose={() => setDrawerItem(null)}
        onDispenseRequest={(presc) => {
          setDrawerItem(null);
          setDispenseError(null);
          setDispenseTarget(presc);
        }}
      />

      {/* Dispense Confirmation Modal (only way a bill is created) */}
      <ConfirmModal
        show={Boolean(dispenseTarget)}
        title="Confirm Dispense & Billing"
        message={`Are you sure you want to dispense Prescription #${dispenseTarget?.id}? This action will deduct stock and generate a pharmacy bill.`}
        confirmText="Dispense & Create Bill"
        loading={dispensing}
        error={dispenseError}
        onConfirm={handleConfirmDispense}
        onCancel={() => setDispenseTarget(null)}
      />
    </div>
  );
}

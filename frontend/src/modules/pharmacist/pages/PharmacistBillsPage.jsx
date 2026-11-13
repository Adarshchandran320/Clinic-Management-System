import React, { useState, useEffect, useCallback } from "react";
import pharmacistApi from "../../../api/pharmacistApi.js";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  Loader,
  ErrorAlert,
} from "../../../components/common/index.js";

// Read-only Pharmacy Bills table config (bills are created strictly via dispense endpoint)
const BILL_COLUMNS = (onView) => [
  { key: "id", label: "Bill #", formatter: (val) => `#${val}` },
  {
    key: "prescription",
    label: "Prescription",
    formatter: (val, row) => val || row.prescription_id || "-",
  },
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
    key: "total_amount",
    label: "Total Amount",
    formatter: (val, row) => {
      const amt = val ?? row.amount ?? row.total;
      return amt !== undefined && amt !== null ? `$${Number(amt).toFixed(2)}` : "-";
    },
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
      <StatusBadge status={val || (row.is_paid ? "Paid" : "Dispensed")} />
    ),
  },
  {
    key: "actions",
    label: "",
    className: "text-end",
    formatter: (_, row) => (
      <button
        type="button"
        className="btn btn-sm btn-light border"
        onClick={() => onView(row)}
      >
        View Details
      </button>
    ),
  },
];

export default function PharmacistBillsPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedBill, setSelectedBill] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [billItems, setBillItems] = useState([]);

  const loadBills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await pharmacistApi.getBills();
      setBills(list);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const handleSelectBill = async (bill) => {
    setSelectedBill(bill);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const [detailRes, itemsRes] = await Promise.allSettled([
        pharmacistApi.getBillById(bill.id),
        pharmacistApi.getBillItems({ bill: bill.id }),
      ]);
      if (detailRes.status === "fulfilled") {
        setSelectedBill(detailRes.value);
      }
      if (itemsRes.status === "fulfilled") {
        setBillItems(itemsRes.value);
      }
    } catch (err) {
      setDetailError(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const resolvedItems =
    selectedBill?.items || selectedBill?.bill_items || billItems || [];

  return (
    <div>
      <PageHeader
        title="Pharmacy Bills"
        subtitle="Read-only record of bills generated from dispensed prescriptions"
      />

      <div className="card">
        <div className="card-body p-0">
          <DataTable
            columns={BILL_COLUMNS(handleSelectBill)}
            data={bills}
            loading={loading}
            error={error}
            onRetry={loadBills}
            emptyTitle="No pharmacy bills yet"
            emptyMessage="Bills are automatically generated when prescriptions are dispensed."
          />
        </div>
      </div>

      {/* Bill Detail Modal */}
      {selectedBill && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Bill #{selectedBill.id}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedBill(null)}
                ></button>
              </div>
              <div className="modal-body">
                {detailLoading ? (
                  <Loader message="Loading bill line items..." />
                ) : detailError ? (
                  <ErrorAlert error={detailError} />
                ) : (
                  <>
                    <div className="row g-3 mb-3 small">
                      <div className="col-sm-4">
                        <div className="text-secondary">Patient</div>
                        <div className="fw-semibold">
                          {selectedBill.patient_name ||
                            selectedBill.patient?.name ||
                            selectedBill.patient ||
                            "-"}
                        </div>
                      </div>
                      <div className="col-sm-4">
                        <div className="text-secondary">Date</div>
                        <div className="fw-semibold">
                          {selectedBill.created_at || selectedBill.date || "-"}
                        </div>
                      </div>
                      <div className="col-sm-4">
                        <div className="text-secondary">Total Amount</div>
                        <div className="fw-bold fs-6 text-primary">
                          $
                          {Number(
                            selectedBill.total_amount ??
                              selectedBill.amount ??
                              selectedBill.total ??
                              0
                          ).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <h6 className="fw-bold mb-2">Bill Line Items</h6>
                    <div className="table-responsive border rounded-2">
                      <table className="table table-sm align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Medicine</th>
                            <th className="text-end">Quantity</th>
                            <th className="text-end">Unit Price</th>
                            <th className="text-end">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resolvedItems.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="text-center text-secondary py-3">
                                No individual bill items returned.
                              </td>
                            </tr>
                          ) : (
                            resolvedItems.map((it, idx) => (
                              <tr key={it.id || idx}>
                                <td className="fw-medium">
                                  {it.medicine_name ||
                                    it.medicine?.name ||
                                    it.medicine ||
                                    "-"}
                                </td>
                                <td className="text-end">{it.quantity ?? 1}</td>
                                <td className="text-end">
                                  $
                                  {Number(it.unit_price ?? it.price ?? 0).toFixed(2)}
                                </td>
                                <td className="text-end fw-semibold">
                                  $
                                  {Number(
                                    it.subtotal ??
                                      it.total_price ??
                                      (it.quantity || 1) * (it.unit_price || 0)
                                  ).toFixed(2)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-light border"
                  onClick={() => setSelectedBill(null)}
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

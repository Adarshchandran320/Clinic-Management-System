import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import labApi from "../../../api/labApi.js";
import receptionistApi from "../../../api/receptionistApi.js";
import StatusBadge from "../../../components/common/StatusBadge.jsx";
import Loader from "../../../components/common/Loader.jsx";
import EmptyState from "../../../components/common/EmptyState.jsx";

export default function LabBillingPage() {
  const [searchParams] = useSearchParams();
  const initialOrderId = searchParams.get("orderId") || "";

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [bills, setBills] = useState([]);
  const [labTests, setLabTests] = useState([]);

  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId);
  const [billing, setBilling] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordRes, billRes, testRes] = await Promise.allSettled([
        labApi.labPrescriptions.list(),
        receptionistApi.bills.list(),
        labApi.labTests.list(),
      ]);

      if (ordRes.status === "fulfilled") {
        const val = ordRes.value;
        setOrders(val.results || val.data || (Array.isArray(val) ? val : []));
      }
      if (billRes.status === "fulfilled") {
        const val = billRes.value;
        setBills(val.results || val.data || (Array.isArray(val) ? val : []));
      }
      if (testRes.status === "fulfilled") {
        const val = testRes.value;
        setLabTests(val.results || val.data || (Array.isArray(val) ? val : []));
      }
    } catch (err) {
      setError(err?.message || "Failed to load laboratory billing ledger.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Map of lab tests by LabtestId
  const testMap = useMemo(() => {
    const map = {};
    labTests.forEach((t) => {
      const id = t.LabtestId ?? t.id;
      map[id] = t;
    });
    return map;
  }, [labTests]);

  // Selected Order details
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find(
      (o) => String(o.LabPrescriptionId ?? o.id) === String(selectedOrderId)
    );
  }, [selectedOrderId, orders]);

  // Existing bill for selected order
  const existingBillForSelected = useMemo(() => {
    if (!selectedOrderId) return null;
    const targetType = `lab #${selectedOrderId}`.toLowerCase();
    return bills.find((b) => String(b.BillType || "").toLowerCase() === targetType);
  }, [selectedOrderId, bills]);

  // Filter lab bills for history
  const labBillsHistory = useMemo(() => {
    return bills.filter((b) =>
      String(b.BillType || "").toLowerCase().startsWith("lab #")
    );
  }, [bills]);

  // Calculate test cost
  const testCost = useMemo(() => {
    if (!selectedOrder) return 0;
    const testId = selectedOrder.LabTestId ?? selectedOrder.LabTest?.LabtestId;
    if (testId && testMap[testId]) {
      return parseFloat(testMap[testId].TestCost) || 0;
    }
    if (selectedOrder.LabTest?.TestCost) {
      return parseFloat(selectedOrder.LabTest.TestCost) || 0;
    }
    return 350.0; // fallback standard test cost
  }, [selectedOrder, testMap]);

  // Handle generate bill
  const handleGenerateBill = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setError(null);
    setSuccessMsg("");

    const orderId = selectedOrder.LabPrescriptionId ?? selectedOrder.id;
    const billType = `Lab #${orderId}`;

    // Frontend duplicate check
    if (existingBillForSelected) {
      setError(`A bill (${existingBillForSelected.BillId}) has already been issued for Order #${orderId}. Duplicate billing is blocked.`);
      return;
    }

    try {
      setBilling(true);
      const payload = {
        PatientId: Number(selectedOrder.PatientId ?? selectedOrder.patient),
        BillDate: new Date().toISOString().slice(0, 10),
        Amount: testCost,
        BillStatus: "Pending",
        BillType: billType,
      };

      const created = await receptionistApi.bills.create(payload);
      setSuccessMsg(`Successfully generated Bill #${created.BillId ?? created.id} for Order #${orderId} (₹${testCost}).`);
      await loadData();
    } catch (err) {
      setError(
        err?.response?.data?.BillType ||
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to create lab bill."
      );
    } finally {
      setBilling(false);
    }
  };

  return (
    <div className="container-fluid py-2">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold mb-1">Laboratory Billing & Invoicing</h4>
          <span className="text-muted small">
            Issue diagnostic test invoices with automated one-bill-per-order duplicate protection.
          </span>
        </div>
        <button className="btn btn-sm btn-outline-secondary" onClick={loadData}>
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 small d-flex align-items-center mb-3">
          <i className="bi bi-exclamation-octagon-fill me-2 fs-5"></i>
          <div>{error}</div>
        </div>
      )}

      {searchParams.get("created") === "true" && !successMsg && (
        <div className="alert alert-success py-2 px-3 small d-flex align-items-center mb-3">
          <i className="bi bi-check-circle-fill me-2 fs-5"></i>
          <div>Lab report findings recorded and invoice was automatically generated for this order.</div>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success py-2 px-3 small d-flex align-items-center mb-3">
          <i className="bi bi-check-circle-fill me-2 fs-5"></i>
          <div>{successMsg}</div>
        </div>
      )}

      <div className="row g-3 mb-4">
        {/* Left Column: Create Lab Bill Card */}
        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm rounded-3 bg-white h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h6 className="fw-bold mb-0">
                <i className="bi bi-receipt me-2 text-primary"></i>
                Create Diagnostic Invoice
              </h6>
            </div>
            <form onSubmit={handleGenerateBill} className="card-body p-3">
              <div className="mb-3">
                <label className="form-label small fw-bold">
                  Select Completed Lab Order <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select form-select-sm"
                  value={selectedOrderId}
                  onChange={(e) => {
                    setSelectedOrderId(e.target.value);
                    setError(null);
                    setSuccessMsg("");
                  }}
                  required
                >
                  <option value="">-- Choose Order to Bill --</option>
                  {orders.map((o) => {
                    const id = o.LabPrescriptionId ?? o.id;
                    const pat = o.patient_name || o.Patient?.Name || `Patient #${o.PatientId || "-"}`;
                    const test = o.LabTest?.TestName || o.test_name || "Diagnostic Test";
                    const isBilled = bills.some(
                      (b) => String(b.BillType || "").toLowerCase() === `lab #${id}`.toLowerCase()
                    );
                    return (
                      <option key={id} value={id}>
                        Order #{id} - {pat} ({test}) {isBilled ? "[ALREADY BILLED]" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedOrder && (
                <div className="p-3 bg-light rounded border mb-3 small">
                  <div className="mb-1">
                    <span className="text-muted">Patient:</span>{" "}
                    <span className="fw-semibold">
                      {selectedOrder.patient_name || selectedOrder.Patient?.Name || `Patient #${selectedOrder.PatientId}`}
                    </span>
                  </div>
                  <div className="mb-1">
                    <span className="text-muted">Test Prescribed:</span>{" "}
                    <span className="fw-semibold">
                      {selectedOrder.LabTest?.TestName || selectedOrder.test_name || "Diagnostic Test"}
                    </span>
                  </div>
                  <div className="mb-1">
                    <span className="text-muted">Bill Type Code:</span>{" "}
                    <span className="badge bg-secondary font-monospace">
                      Lab #{selectedOrder.LabPrescriptionId ?? selectedOrder.id}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-dark">Invoice Amount:</span>
                    <span className="fw-bold fs-6 text-success">₹{testCost.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Auto-created or Existing Bill Display */}
              {existingBillForSelected ? (
                <div className="card border border-success-subtle bg-success-subtle p-3 rounded-3 mb-2">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold text-success-emphasis">
                      <i className="bi bi-check2-circle me-1"></i> Invoice Generated
                    </span>
                    <StatusBadge status={existingBillForSelected.BillStatus || existingBillForSelected.status || "Pending"} />
                  </div>
                  <div className="small text-dark mb-2">
                    Bill <strong>#{existingBillForSelected.BillId ?? existingBillForSelected.id}</strong> for <strong>₹{existingBillForSelected.Amount ?? existingBillForSelected.amount ?? testCost.toFixed(2)}</strong> was automatically generated upon saving the test report.
                  </div>
                  <div className="text-muted small">
                    Status: <strong className="text-dark">{existingBillForSelected.BillStatus || existingBillForSelected.status || "Pending"}</strong>. This invoice is actively routed to the Receptionist ledger for payment collection.
                  </div>
                </div>
              ) : (
                <button
                  type="submit"
                  className="btn btn-primary btn-sm w-100 py-2 fw-semibold"
                  disabled={!selectedOrder || billing}
                >
                  {billing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Generating Invoice...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-1"></i>
                      Issue Bill for Order #{selectedOrderId || "..."}
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Lab Billing History Table */}
        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm rounded-3 bg-white h-100">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">
                <i className="bi bi-clock-history me-2 text-primary"></i>
                Laboratory Billing History
              </h6>
              <span className="badge bg-light text-dark border">
                {labBillsHistory.length} Invoices
              </span>
            </div>
            <div className="table-responsive">
              {loading ? (
                <Loader text="Loading billing history..." />
              ) : labBillsHistory.length === 0 ? (
                <EmptyState message="No laboratory bills have been created yet." />
              ) : (
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light small text-uppercase text-muted">
                    <tr>
                      <th>Bill #</th>
                      <th>Reference</th>
                      <th>Patient</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labBillsHistory.map((b) => {
                      const id = b.BillId ?? b.id;
                      const pat = b.patient_name || `Patient #${b.PatientId || "-"}`;
                      const amt = b.Amount ?? b.amount ?? b.total_amount;
                      const dt = b.BillDate || b.bill_date || "";
                      const status = b.BillStatus || b.status || (b.is_paid ? "Paid" : "Pending");

                      return (
                        <tr key={id}>
                          <td className="fw-bold text-primary">#{id}</td>
                          <td>
                            <span className="badge bg-light text-dark border font-monospace">
                              {b.BillType}
                            </span>
                          </td>
                          <td className="fw-semibold">{pat}</td>
                          <td className="fw-bold text-success">₹{amt}</td>
                          <td className="small text-muted">{dt}</td>
                          <td>
                            <StatusBadge status={status} />
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
      </div>
    </div>
  );
}

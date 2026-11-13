import React from "react";
import Loader from "../../../components/common/Loader.jsx";
import ErrorAlert from "../../../components/common/ErrorAlert.jsx";
import StatusBadge from "../../../components/common/StatusBadge.jsx";

// Offcanvas drawer showing prescription details and medicine line items
export default function PrescriptionDrawer({
  show,
  prescription,
  loading,
  error,
  onClose,
  onDispenseRequest,
}) {
  if (!show) return null;

  const items =
    prescription?.items ||
    prescription?.prescription_items ||
    prescription?.medicines ||
    [];

  const status = prescription?.status || (prescription?.is_dispensed ? "Dispensed" : "Pending");
  const isDispensed =
    String(status).toLowerCase().includes("dispens") || Boolean(prescription?.is_dispensed);

  return (
    <>
      <div
        className="offcanvas offcanvas-end show"
        tabIndex="-1"
        style={{ visibility: "visible", width: 480, zIndex: 1045 }}
      >
        <div className="offcanvas-header border-bottom">
          <div>
            <h5 className="offcanvas-title fw-bold mb-0">
              Prescription #{prescription?.id ?? ""}
            </h5>
            <span className="text-secondary small">Prescription Details & Items</span>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            aria-label="Close"
          ></button>
        </div>

        <div className="offcanvas-body d-flex flex-column">
          {loading ? (
            <Loader message="Loading prescription details..." />
          ) : error ? (
            <ErrorAlert error={error} />
          ) : !prescription ? (
            <p className="text-secondary">No prescription selected.</p>
          ) : (
            <>
              <div className="card mb-3">
                <div className="card-body p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-secondary small">Status</span>
                    <StatusBadge status={status} />
                  </div>
                  <div className="row g-2 small">
                    <div className="col-6">
                      <div className="text-secondary">Patient</div>
                      <div className="fw-semibold">
                        {prescription.patient_name ||
                          prescription.patient?.name ||
                          prescription.patient ||
                          "-"}
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="text-secondary">Prescribed By</div>
                      <div className="fw-semibold">
                        {prescription.doctor_name ||
                          prescription.doctor?.name ||
                          prescription.doctor ||
                          "-"}
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="text-secondary">Date</div>
                      <div className="fw-medium">
                        {prescription.created_at || prescription.date || "-"}
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="text-secondary">Notes</div>
                      <div className="fw-medium">{prescription.notes || "-"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <h6 className="fw-bold mb-2">Prescribed Medicines</h6>
              {items.length === 0 ? (
                <div className="alert alert-light border small text-secondary">
                  No line items listed on this prescription record.
                </div>
              ) : (
                <div className="table-responsive border rounded-2 mb-3">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Medicine</th>
                        <th>Dosage</th>
                        <th>Duration</th>
                        <th className="text-end">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="fw-medium">
                            {item.medicine_name ||
                              item.medicine?.name ||
                              item.medicine ||
                              "-"}
                          </td>
                          <td>{item.dosage || item.frequency || "-"}</td>
                          <td>{item.duration || "-"}</td>
                          <td className="text-end">{item.quantity ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-auto pt-3 border-top d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-light border" onClick={onClose}>
                  Close
                </button>
                {!isDispensed && onDispenseRequest && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onDispenseRequest(prescription)}
                  >
                    <i className="bi bi-check2-circle me-1"></i>Dispense & Generate Bill
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <div
        className="offcanvas-backdrop fade show"
        style={{ zIndex: 1040 }}
        onClick={onClose}
      ></div>
    </>
  );
}

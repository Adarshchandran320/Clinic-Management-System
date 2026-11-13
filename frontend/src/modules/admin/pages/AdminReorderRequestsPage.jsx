import React, { useEffect, useState } from "react";
import adminApi from "../../../api/adminApi.js";
import Loader from "../../../components/common/Loader.jsx";

export default function AdminReorderRequestsPage() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    adminApi.medicines
      .list()
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data : data?.results || [];
        setMedicines(list);
      })
      .catch((err) => {
        console.warn("Could not load medicines preview", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const lowStockItems = medicines.filter(
    (m) => Number(m.Quantity ?? m.QuantityOnHand ?? 0) < 10
  );

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h4 className="mb-0 fw-bold">Stock Reorder Requests</h4>
            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
              Workflow Under Development
            </span>
          </div>
          <p className="text-muted small mb-0 mt-1">
            Standard Operating Procedure & Authorization Flow for Pharmacy Restock
          </p>
        </div>
      </div>

      {/* Main Notice Card */}
      <div className="card shadow-sm border-0 mb-4 bg-light">
        <div className="card-body p-4">
          <div className="d-flex align-items-start gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center bg-primary text-white flex-shrink-0"
              style={{ width: "52px", height: "52px", fontSize: "1.5rem" }}
            >
              <i className="bi bi-clock-history"></i>
            </div>
            <div>
              <h5 className="fw-bold text-dark mb-1">
                Automated Reorder Request Module is Not Available Yet
              </h5>
              <p className="text-secondary mb-2">
                The interactive multi-tier approval system for pharmacy purchase orders
                is scheduled for general deployment alongside Phase 4 (Pharmacist Procurement Engine).
                In the interim, all restock requests are logged directly via the pharmacy register
                and authorized through manual administrative requisition slips.
              </p>
              <div className="d-flex flex-wrap gap-2 pt-1">
                <span className="badge bg-white text-secondary border">
                  <i className="bi bi-shield-check me-1 text-success"></i> Two-factor Admin Signoff
                </span>
                <span className="badge bg-white text-secondary border">
                  <i className="bi bi-calculator me-1 text-primary"></i> Budget Cap Enforcement
                </span>
                <span className="badge bg-white text-secondary border">
                  <i className="bi bi-truck me-1 text-info"></i> Vendor Batch Tracing
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Architecture Grid */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card h-100 shadow-sm border-0 border-top border-4 border-primary">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="badge bg-primary-subtle text-primary fw-bold">Step 1</span>
                <i className="bi bi-bell text-primary fs-5"></i>
              </div>
              <h6 className="fw-bold mb-1">Threshold Alert</h6>
              <p className="text-muted small mb-0">
                Automated inventory sensors flag medicines whose{" "}
                <code>QuantityOnHand</code> falls below the calibrated{" "}
                <code>ReorderLevel</code> (default: &lt;10 units).
              </p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="card h-100 shadow-sm border-0 border-top border-4 border-info">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="badge bg-info-subtle text-info fw-bold">Step 2</span>
                <i className="bi bi-file-earmark-text text-info fs-5"></i>
              </div>
              <h6 className="fw-bold mb-1">Pharmacist Requisition</h6>
              <p className="text-muted small mb-0">
                The Lead Pharmacist drafts a bulk restock requisition specifying quantity,
                supplier quotes, and manufacturer specifications.
              </p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="card h-100 shadow-sm border-0 border-top border-4 border-warning">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="badge bg-warning-subtle text-warning-emphasis fw-bold">Step 3</span>
                <i className="bi bi-award text-warning fs-5"></i>
              </div>
              <h6 className="fw-bold mb-1">Admin Approval</h6>
              <p className="text-muted small mb-0">
                The Hospital Administrator reviews unit pricing, validates fiscal allocations,
                and digitally signs the formal Purchase Order (PO).
              </p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="card h-100 shadow-sm border-0 border-top border-4 border-success">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="badge bg-success-subtle text-success fw-bold">Step 4</span>
                <i className="bi bi-box-seam text-success fs-5"></i>
              </div>
              <h6 className="fw-bold mb-1">Inventory Ingestion</h6>
              <p className="text-muted small mb-0">
                Upon delivery, stock is verified against invoice, batch codes are logged,
                and physical units are credited to <code>PharmacyStock</code>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Pipeline Preview Table */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between">
          <div>
            <h6 className="mb-0 fw-bold">Active Low-Stock Watchlist</h6>
            <small className="text-muted">
              Live items currently eligible for reorder requisition generation
            </small>
          </div>
          <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
            {lowStockItems.length} items below safety threshold
          </span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="py-5 text-center">
              <Loader message="Checking live stock levels..." />
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="p-4 text-center text-muted">
              <i className="bi bi-check-circle text-success fs-3 d-block mb-2"></i>
              All catalog medicines are currently above minimum threshold.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase text-muted">
                  <tr>
                    <th>Medicine</th>
                    <th>Category</th>
                    <th>Manufacturer</th>
                    <th>Cost / MRP</th>
                    <th>Current Stock</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((med) => {
                    const qty = Number(med.Quantity ?? med.QuantityOnHand ?? 0);
                    return (
                      <tr key={med.MedicineId ?? med.id}>
                        <td>
                          <div className="fw-semibold text-primary">{med.MedicineName}</div>
                          {med.GenericName && (
                            <div className="small text-muted">{med.GenericName}</div>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-secondary-subtle text-secondary">
                            {med.Category || "General"}
                          </span>
                        </td>
                        <td>{med.Manufacturer || "-"}</td>
                        <td>
                          <span className="small text-muted">Cost: ₹{Number(med.CostValue || 0).toFixed(2)}</span>
                          <span className="d-block fw-semibold text-dark">
                            MRP: ₹{Number(med.MRP || 0).toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              qty === 0
                                ? "bg-danger text-white"
                                : "bg-warning-subtle text-warning-emphasis border border-warning-subtle"
                            }`}
                          >
                            {qty === 0 ? "Depleted (0)" : `${qty} units left`}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            disabled
                            title="Reorder system will be activated in Phase 4"
                          >
                            <i className="bi bi-hourglass-split me-1"></i> Reorder
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
    </div>
  );
}

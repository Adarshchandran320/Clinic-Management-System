import React, { useState, useEffect } from "react";
import ErrorAlert from "../../../components/common/ErrorAlert.jsx";

export default function StockModal({
  show,
  initialData = null,
  medicines = [],
  onSave,
  onClose,
}) {
  const isEdit = Boolean(initialData?.id);
  const [formData, setFormData] = useState({
    medicine: "",
    batch_number: "",
    quantity: "",
    reorder_level: "",
    expiry_date: "",
    supplier: "",
    unit_price: "",
  });
  const [validated, setValidated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        medicine: initialData.medicine_id ?? initialData.medicine ?? "",
        batch_number: initialData.batch_number ?? initialData.batch_no ?? "",
        quantity: initialData.quantity ?? initialData.available_qty ?? "",
        reorder_level: initialData.reorder_level ?? initialData.min_stock ?? "",
        expiry_date: initialData.expiry_date ?? "",
        supplier: initialData.supplier ?? "",
        unit_price: initialData.unit_price ?? initialData.price ?? "",
      });
    } else {
      setFormData({
        medicine: "",
        batch_number: "",
        quantity: "",
        reorder_level: "20",
        expiry_date: "",
        supplier: "",
        unit_price: "",
      });
    }
    setValidated(false);
    setError(null);
  }, [initialData, show]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.medicine || formData.quantity === "") {
      setValidated(true);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        quantity: Number(formData.quantity),
        reorder_level: formData.reorder_level !== "" ? Number(formData.reorder_level) : 0,
        unit_price: formData.unit_price !== "" ? Number(formData.unit_price) : undefined,
      };
      await onSave(payload, initialData?.id);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content border-0 shadow">
          <div className="modal-header border-bottom">
            <h5 className="modal-title fw-bold">
              {isEdit ? "Edit Stock Entry" : "Add New Stock"}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
            ></button>
          </div>

          <form
            noValidate
            className={validated ? "was-validated" : ""}
            onSubmit={handleSubmit}
          >
            <div className="modal-body">
              {error && <ErrorAlert error={error} onClose={() => setError(null)} />}

              <div className="mb-3">
                <label className="form-label small fw-medium">Medicine *</label>
                {medicines.length > 0 ? (
                  <select
                    name="medicine"
                    className="form-select"
                    value={formData.medicine}
                    onChange={handleChange}
                    required
                    disabled={saving}
                  >
                    <option value="">Select medicine...</option>
                    {medicines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.medicine_name || `Medicine #${m.id}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="medicine"
                    className="form-control"
                    placeholder="Medicine ID or Name"
                    value={formData.medicine}
                    onChange={handleChange}
                    required
                    disabled={saving}
                  />
                )}
                <div className="invalid-feedback">Medicine is required.</div>
              </div>

              <div className="row g-3">
                <div className="col-sm-6">
                  <label className="form-label small fw-medium">Batch Number</label>
                  <input
                    type="text"
                    name="batch_number"
                    className="form-control"
                    placeholder="e.g. BATCH-2026"
                    value={formData.batch_number}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form-label small fw-medium">Available Qty *</label>
                  <input
                    type="number"
                    name="quantity"
                    min="0"
                    className="form-control"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                    disabled={saving}
                  />
                  <div className="invalid-feedback">Quantity is required.</div>
                </div>
                <div className="col-sm-6">
                  <label className="form-label small fw-medium">Reorder Level</label>
                  <input
                    type="number"
                    name="reorder_level"
                    min="0"
                    className="form-control"
                    placeholder="20"
                    value={formData.reorder_level}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form-label small fw-medium">Expiry Date</label>
                  <input
                    type="date"
                    name="expiry_date"
                    className="form-control"
                    value={formData.expiry_date}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form-label small fw-medium">Supplier</label>
                  <input
                    type="text"
                    name="supplier"
                    className="form-control"
                    placeholder="Supplier name"
                    value={formData.supplier}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form-label small fw-medium">Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="unit_price"
                    className="form-control"
                    placeholder="0.00"
                    value={formData.unit_price}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer border-top">
              <button
                type="button"
                className="btn btn-light border"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Saving...
                  </>
                ) : isEdit ? (
                  "Update Stock"
                ) : (
                  "Add Stock"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

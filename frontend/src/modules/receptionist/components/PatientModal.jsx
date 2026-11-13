import React, { useState, useEffect } from "react";
import ErrorAlert from "../../../components/common/ErrorAlert.jsx";

export default function PatientModal({
  show,
  initialData = null,
  onSave,
  onClose,
}) {
  const isEdit = Boolean(initialData?.id);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "Male",
    phone: "",
    email: "",
    address: "",
    blood_group: "",
  });
  const [validated, setValidated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || initialData.full_name || "",
        age: initialData.age ?? "",
        gender: initialData.gender || "Male",
        phone: initialData.phone || initialData.contact_number || "",
        email: initialData.email || "",
        address: initialData.address || "",
        blood_group: initialData.blood_group || "",
      });
    } else {
      setFormData({
        name: "",
        age: "",
        gender: "Male",
        phone: "",
        email: "",
        address: "",
        blood_group: "",
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

    if (!formData.name.trim() || !formData.phone.trim()) {
      setValidated(true);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        age: formData.age !== "" ? Number(formData.age) : undefined,
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
              {isEdit ? "Edit Patient" : "Register New Patient"}
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

              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-medium">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    placeholder="Patient full name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={saving}
                  />
                  <div className="invalid-feedback">Full name is required.</div>
                </div>

                <div className="col-sm-4">
                  <label className="form-label small fw-medium">Age</label>
                  <input
                    type="number"
                    name="age"
                    min="0"
                    className="form-control"
                    placeholder="Age"
                    value={formData.age}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>

                <div className="col-sm-4">
                  <label className="form-label small fw-medium">Gender</label>
                  <select
                    name="gender"
                    className="form-select"
                    value={formData.gender}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="col-sm-4">
                  <label className="form-label small fw-medium">Blood Group</label>
                  <input
                    type="text"
                    name="blood_group"
                    className="form-control"
                    placeholder="e.g. O+"
                    value={formData.blood_group}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>

                <div className="col-sm-6">
                  <label className="form-label small fw-medium">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    className="form-control"
                    placeholder="Contact phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    disabled={saving}
                  />
                  <div className="invalid-feedback">Phone number is required.</div>
                </div>

                <div className="col-sm-6">
                  <label className="form-label small fw-medium">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    placeholder="Optional email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-medium">Address</label>
                  <textarea
                    name="address"
                    rows="2"
                    className="form-control"
                    placeholder="Residential address"
                    value={formData.address}
                    onChange={handleChange}
                    disabled={saving}
                  ></textarea>
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
                  "Update Patient"
                ) : (
                  "Register Patient"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

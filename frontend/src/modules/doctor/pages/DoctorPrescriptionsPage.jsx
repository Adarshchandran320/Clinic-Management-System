import React, { useState, useEffect, useCallback } from "react";
import doctorApi from "../../../api/doctorApi.js";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  ErrorAlert,
} from "../../../components/common/index.js";

const DOCTOR_PRESCRIPTION_COLUMNS = [
  { key: "id", label: "ID", formatter: (val) => `#${val}` },
  {
    key: "consultation",
    label: "Consultation",
    formatter: (val, row) => val || row.consultation_id || "-",
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
    key: "notes",
    label: "Notes",
    formatter: (val) => val || "-",
  },
  {
    key: "status",
    label: "Status",
    formatter: (val, row) => (
      <StatusBadge status={val || (row.is_dispensed ? "Dispensed" : "Pending")} />
    ),
  },
];

export default function DoctorPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState("");

  // Form state with dynamic medicine rows and optional lab test
  const [consultationId, setConsultationId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([
    { medicine: "", dosage: "", duration: "", quantity: "1" },
  ]);
  const [includeLabTest, setIncludeLabTest] = useState(false);
  const [labTestName, setLabTestName] = useState("");
  const [labNotes, setLabNotes] = useState("");

  const [validated, setValidated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prescRes, consRes] = await Promise.allSettled([
        doctorApi.prescriptions.list(),
        doctorApi.consultations.list(),
      ]);
      if (prescRes.status === "fulfilled") {
        const val = prescRes.value;
        setPrescriptions(val.results || val.data || (Array.isArray(val) ? val : []));
      } else {
        throw prescRes.reason;
      }
      if (consRes.status === "fulfilled") {
        const val = consRes.value;
        setConsultations(val.results || val.data || (Array.isArray(val) ? val : []));
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      { medicine: "", dosage: "", duration: "", quantity: "1" },
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const validItems = items.filter((i) => i.medicine.trim() !== "");
    if ((!consultationId && !patientId) || validItems.length === 0) {
      setValidated(true);
      return;
    }

    setSaving(true);
    try {
      const prescPayload = {
        notes: notes.trim(),
        items: validItems.map((it) => ({
          medicine: it.medicine.trim(),
          dosage: it.dosage.trim(),
          duration: it.duration.trim(),
          quantity: Number(it.quantity) || 1,
        })),
      };
      if (consultationId) prescPayload.consultation = consultationId;
      if (patientId) prescPayload.patient = patientId;

      const createdPrescription = await doctorApi.prescriptions.create(prescPayload);
      const prescriptionId = createdPrescription?.id || createdPrescription?.PrescriptionId;

      // Also post individual prescription items if backend expects separate /api/prescription-items/ calls
      if (prescriptionId && !createdPrescription?.items) {
        for (const it of validItems) {
          await doctorApi.prescriptionItems.create({
            prescription: prescriptionId,
            medicine: it.medicine.trim(),
            dosage: it.dosage.trim(),
            duration: it.duration.trim(),
            quantity: Number(it.quantity) || 1,
          });
        }
      }

      // Optional lab test order via /api/lab-prescriptions/
      if (includeLabTest && labTestName.trim()) {
        await doctorApi.labPrescriptions.create({
          consultation: consultationId || undefined,
          patient: patientId || undefined,
          test_name: labTestName.trim(),
          notes: labNotes.trim(),
        });
      }

      setToast("Prescription created and sent to pharmacy queue.");
      setConsultationId("");
      setPatientId("");
      setNotes("");
      setItems([{ medicine: "", dosage: "", duration: "", quantity: "1" }]);
      setIncludeLabTest(false);
      setLabTestName("");
      setLabNotes("");
      setValidated(false);
      loadData();
    } catch (err) {
      setFormError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Prescriptions & Lab Orders"
        subtitle="Create prescriptions with medicine line items and optional diagnostic lab tests"
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

      {/* Create Prescription Card */}
      <div className="card mb-4">
        <div className="card-header bg-transparent border-bottom py-3">
          <h6 className="fw-bold mb-0">Write New Prescription</h6>
        </div>
        <div className="card-body">
          {formError && (
            <ErrorAlert error={formError} onClose={() => setFormError(null)} />
          )}

          <form
            noValidate
            className={validated ? "was-validated" : ""}
            onSubmit={handleSubmit}
          >
            <div className="row g-3 mb-3">
              <div className="col-sm-4">
                <label className="form-label small fw-medium">Consultation *</label>
                {consultations.length > 0 ? (
                  <select
                    className="form-select"
                    value={consultationId}
                    onChange={(e) => setConsultationId(e.target.value)}
                    required={!patientId}
                    disabled={saving}
                  >
                    <option value="">Select consultation...</option>
                    {consultations.map((c) => (
                      <option key={c.id} value={c.id}>
                        Consultation #{c.id} - {c.patient_name || c.diagnosis || ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Consultation ID"
                    value={consultationId}
                    onChange={(e) => setConsultationId(e.target.value)}
                    required={!patientId}
                    disabled={saving}
                  />
                )}
              </div>

              <div className="col-sm-4">
                <label className="form-label small fw-medium">
                  Patient ID (if no consultation selected)
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Patient ID"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  required={!consultationId}
                  disabled={saving}
                />
              </div>

              <div className="col-sm-4">
                <label className="form-label small fw-medium">General Notes</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Dietary or usage instructions"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Dynamic Medicine Rows */}
            <div className="d-flex align-items-center justify-content-between mb-2">
              <label className="form-label small fw-bold mb-0">
                Medicine Line Items *
              </label>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={addItemRow}
                disabled={saving}
              >
                <i className="bi bi-plus-lg me-1"></i>Add Medicine Row
              </button>
            </div>

            {items.map((item, idx) => (
              <div className="row g-2 align-items-center mb-2" key={idx}>
                <div className="col-12 col-md-4">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Medicine ID or Name *"
                    value={item.medicine}
                    onChange={(e) =>
                      handleItemChange(idx, "medicine", e.target.value)
                    }
                    required
                    disabled={saving}
                  />
                </div>
                <div className="col-6 col-md-3">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Dosage (e.g. 1-0-1)"
                    value={item.dosage}
                    onChange={(e) => handleItemChange(idx, "dosage", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="col-6 col-md-2">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Duration (e.g. 5 days)"
                    value={item.duration}
                    onChange={(e) =>
                      handleItemChange(idx, "duration", e.target.value)
                    }
                    disabled={saving}
                  />
                </div>
                <div className="col-8 col-md-2">
                  <input
                    type="number"
                    min="1"
                    className="form-control form-control-sm"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(idx, "quantity", e.target.value)
                    }
                    required
                    disabled={saving}
                  />
                </div>
                <div className="col-4 col-md-1 text-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removeItemRow(idx)}
                    disabled={items.length <= 1 || saving}
                    aria-label="Remove medicine row"
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            ))}

            {/* Optional Lab Test Section */}
            <div className="form-check mt-3 mb-2">
              <input
                id="include-lab-check"
                type="checkbox"
                className="form-check-input"
                checked={includeLabTest}
                onChange={(e) => setIncludeLabTest(e.target.checked)}
                disabled={saving}
              />
              <label
                htmlFor="include-lab-check"
                className="form-check-label small fw-medium"
              >
                Include Optional Lab Test Order
              </label>
            </div>

            {includeLabTest && (
              <div className="row g-2 p-3 bg-light border rounded-2 mb-3">
                <div className="col-sm-6">
                  <label className="form-label small fw-medium">Lab Test Name *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Complete Blood Count (CBC)"
                    value={labTestName}
                    onChange={(e) => setLabTestName(e.target.value)}
                    required={includeLabTest}
                    disabled={saving}
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form-label small fw-medium">Lab Instructions</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Fasting sample required"
                    value={labNotes}
                    onChange={(e) => setLabNotes(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
            )}

            <div className="mt-3 text-end">
              <button type="submit" className="btn btn-primary px-4" disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Submitting...
                  </>
                ) : (
                  "Submit Prescription"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Existing Prescriptions List */}
      <div className="card">
        <div className="card-header bg-transparent border-bottom py-3">
          <h6 className="fw-bold mb-0">Issued Prescriptions</h6>
        </div>
        <div className="card-body p-0">
          <DataTable
            columns={DOCTOR_PRESCRIPTION_COLUMNS}
            data={prescriptions}
            loading={loading}
            error={error}
            onRetry={loadData}
            emptyTitle="No prescriptions issued yet"
            emptyMessage="Prescriptions created above will appear in this list."
          />
        </div>
      </div>
    </div>
  );
}

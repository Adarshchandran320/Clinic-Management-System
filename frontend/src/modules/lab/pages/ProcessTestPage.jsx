import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import labApi from "../../../api/labApi.js";
import useMe from "../../../hooks/useMe.js";
import {
  getTestSchema,
  getStandardTestMeta,
  validateTestReadings,
  getPresetReadings,
  compileActualReading,
} from "../testSchemas.js";
import Loader from "../../../components/common/Loader.jsx";

export default function ProcessTestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { staff_id, username } = useMe();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [order, setOrder] = useState(null);

  // Form states
  const [readings, setReadings] = useState({});
  const [customActualReading, setCustomActualReading] = useState("");
  const [remarks, setRemarks] = useState(
    "All measured parameters are within healthy biological reference intervals."
  );

  // Load Order details
  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await labApi.labPrescriptions.get(id);
      setOrder(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load lab prescription details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const testName = useMemo(() => {
    if (!order) return "";
    return order.LabTest?.TestName || order.test_name || "Diagnostic Lab Test";
  }, [order]);

  const meta = useMemo(() => {
    return getStandardTestMeta(testName);
  }, [testName]);

  const schema = useMemo(() => {
    return getTestSchema(testName);
  }, [testName]);

  const sampleType = order?.SampleType || order?.sample_type || meta.sampleType;
  const normalRange = order?.LabTest?.NormalName || meta.normalValue;

  // Handle parameter value change
  const handleParamChange = (paramId, val) => {
    setValidationError(null);
    setReadings((prev) => {
      const next = { ...prev, [paramId]: val };
      return next;
    });
  };

  // Fill Preset values
  const handleApplyPreset = (type) => {
    if (!schema) return;
    setValidationError(null);
    const { readings: presetVals, remarks: presetRemarks } = getPresetReadings(schema, type);
    setReadings(presetVals);
    setRemarks(presetRemarks);
  };

  // Clear inputs
  const handleClear = () => {
    setValidationError(null);
    setReadings({});
    setCustomActualReading("");
    setRemarks("");
  };

  // Compiled reading summary
  const compiledReading = useMemo(() => {
    if (schema) {
      return compileActualReading(schema, readings);
    }
    return customActualReading;
  }, [schema, readings, customActualReading]);

  // Submit test report
  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError(null);
    setError(null);

    // Validate structured readings if schema exists
    if (schema) {
      const valRes = validateTestReadings(schema, readings);
      if (!valRes.valid) {
        setValidationError(valRes.error);
        return;
      }
    } else if (!customActualReading.trim()) {
      setValidationError("Please enter the measured actual reading for this test.");
      return;
    }

    try {
      setSaving(true);
      const actualText = compiledReading.trim();

      const reportPayload = {
        LabPrescriptionId: Number(id),
        LabTechnician: staff_id || undefined,
        ActualReading: actualText,
        remarks: (remarks || "Routine test report completed.").trim(),
      };

      // Create LabReport
      await labApi.labReports.create(reportPayload);

      // Ensure prescription order is set to Completed
      try {
        await labApi.labPrescriptions.patch(id, { Status: "Completed" });
      } catch {
        // Ignored if auto-completed by backend
      }

      // Navigate to Billing creation for this order
      navigate(`/lab/billing?orderId=${id}&created=true`);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to save lab report."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader text="Loading test order details..." />;

  const patName = order?.patient_name || order?.Patient?.Name || `Patient #${order?.PatientId || "-"}`;
  const docName = order?.doctor_name || order?.Doctor?.Name || `Dr. #${order?.DoctorId || "-"}`;

  return (
    <div className="container-fluid py-2">
      {/* Top Breadcrumb & Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb small mb-1">
              <li className="breadcrumb-item">
                <Link to="/lab">Laboratory</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/lab/orders">Orders</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Process Test #{id}
              </li>
            </ol>
          </nav>
          <h4 className="fw-bold mb-0">Specimen Analysis & Diagnostic Processing</h4>
        </div>
        <Link to="/lab/queues" className="btn btn-sm btn-outline-secondary">
          &larr; Back to Queues
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 small d-flex align-items-center mb-3">
          <i className="bi bi-exclamation-octagon-fill me-2 fs-5"></i>
          <div>{error}</div>
        </div>
      )}

      {validationError && (
        <div className="alert alert-warning py-2 px-3 small d-flex align-items-center mb-3">
          <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
          <div className="fw-semibold">{validationError}</div>
        </div>
      )}

      <div className="row g-3">
        {/* Left Column: Prefilled Order & Clinical Summary */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-3 bg-white mb-3">
            <div className="card-header bg-primary text-white py-2">
              <h6 className="fw-bold mb-0">Order Information</h6>
            </div>
            <div className="card-body p-3">
              <div className="mb-2 pb-2 border-bottom">
                <span className="text-muted small">Prescription Order:</span>
                <div className="fw-bold text-primary fs-6">Order #{id}</div>
              </div>

              <div className="mb-2 pb-2 border-bottom">
                <span className="text-muted small">Patient Name:</span>
                <div className="fw-bold">{patName}</div>
              </div>

              <div className="mb-2 pb-2 border-bottom">
                <span className="text-muted small">Prescribed By:</span>
                <div className="fw-semibold text-dark">{docName}</div>
              </div>

              <div className="mb-2 pb-2 border-bottom">
                <span className="text-muted small">Diagnostic Test:</span>
                <div className="fw-bold text-dark">{testName}</div>
              </div>

              <div className="mb-2 pb-2 border-bottom">
                <span className="text-muted small">Specimen Sample Type:</span>
                <div>
                  <span className="badge bg-light text-dark border">{sampleType}</span>
                </div>
              </div>

              <div className="mb-2">
                <span className="text-muted small">Standard Biological Reference Range:</span>
                <div className="small fw-semibold text-secondary mt-1">{normalRange}</div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-3 bg-white">
            <div className="card-body p-3">
              <span className="text-muted small">Technician In Charge:</span>
              <div className="fw-bold text-dark mt-1">
                <i className="bi bi-person-badge me-1 text-primary"></i>
                {username} {staff_id ? `(Staff #${staff_id})` : ""}
              </div>
              <small className="text-muted d-block mt-2">
                All saved readings will be permanently logged and attached to the patient clinical record.
              </small>
            </div>
          </div>
        </div>

        {/* Right Column: Processing & Analyzer Readings Form */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-3 bg-white">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="fw-bold mb-0">
                  {schema ? schema.title : "Analyzer Measured Readings"}
                </h6>
                <small className="text-muted">
                  Enter component values from laboratory clinical analyzers.
                </small>
              </div>

              {schema && (
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success"
                    onClick={() => handleApplyPreset("normal")}
                    title="Fill typical normal reference values"
                  >
                    <i className="bi bi-check-lg me-1"></i> Normal Preset
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-warning"
                    onClick={() => handleApplyPreset("high")}
                    title="Fill elevated/abnormal sample values"
                  >
                    <i className="bi bi-arrow-up-right me-1"></i> Abnormal Preset
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={handleClear}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="card-body p-4">
              {schema ? (
                <div className="mb-4">
                  <div className="table-responsive">
                    <table className="table table-bordered align-middle">
                      <thead className="table-light small text-muted text-uppercase">
                        <tr>
                          <th>Parameter</th>
                          <th>Reference Range</th>
                          <th style={{ width: "220px" }}>Analyzer Reading</th>
                          <th>Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schema.params.map((p) => {
                          const val = readings[p.id] !== undefined ? readings[p.id] : "";
                          return (
                            <tr key={p.id}>
                              <td className="fw-semibold text-dark">{p.name}</td>
                              <td className="small text-muted">{p.ref}</td>
                              <td>
                                <input
                                  type={p.isText ? "text" : "number"}
                                  step="any"
                                  className="form-control form-control-sm"
                                  placeholder={p.isText ? p.ref : `e.g. ${p.normalVal}`}
                                  value={val}
                                  onChange={(e) => handleParamChange(p.id, e.target.value)}
                                  required
                                />
                              </td>
                              <td>
                                <span className="badge bg-secondary-subtle text-secondary border">
                                  {p.unit}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="form-label fw-bold small">
                    Actual Measured Reading <span className="text-danger">*</span>
                  </label>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="Enter diagnostic readings and findings..."
                    value={customActualReading}
                    onChange={(e) => setCustomActualReading(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Compiled Summary Preview */}
              <div className="mb-3">
                <label className="form-label small fw-bold text-muted text-uppercase">
                  Compiled Actual Reading Summary:
                </label>
                <div
                  className="p-2 rounded bg-light border font-monospace small"
                  style={{ minHeight: "42px" }}
                >
                  {compiledReading || (
                    <span className="text-muted fst-italic">
                      Readings will compile here automatically as parameters are entered...
                    </span>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div className="mb-4">
                <label className="form-label small fw-bold">
                  Technician Clinical Remarks & Observations <span className="text-danger">*</span>
                </label>
                <textarea
                  rows={2}
                  className="form-control form-control-sm"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. All parameters within biological reference range."
                  required
                />
              </div>

              {/* Submit Buttons */}
              <div className="d-flex justify-content-between align-items-center border-top pt-3">
                <Link to="/lab/queues" className="btn btn-secondary btn-sm">
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm px-4 fw-semibold"
                  disabled={saving || !compiledReading}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving Report & Completing...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle me-1"></i> Save Report & Proceed to Billing
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

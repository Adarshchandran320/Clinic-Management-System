import React, { useState, useEffect, useMemo, useCallback } from "react";
import ConfirmModal from "./ConfirmModal.jsx";
import Loader from "./Loader.jsx";
import EmptyState from "./EmptyState.jsx";

/**
 * Parses DRF 400/4xx response payload into a field-error map and a general message.
 */
function parseBackendErrors(err) {
  const fieldErrors = {};
  let generalError = null;

  if (err?.response?.data) {
    const data = err.response.data;

    if (typeof data === "string") {
      generalError = data;
    } else if (Array.isArray(data)) {
      generalError = data.join(" ");
    } else if (typeof data === "object") {
      const fieldSummaries = [];
      Object.entries(data).forEach(([key, val]) => {
        const text = Array.isArray(val) ? val.join(" ") : String(val);
        fieldErrors[key] = text;
        fieldErrors[key.toLowerCase()] = text;

        if (key === "detail" || key === "error" || key === "non_field_errors") {
          generalError = text;
        } else {
          fieldSummaries.push(`${key}: ${text}`);
        }
      });

      if (!generalError && fieldSummaries.length > 0) {
        generalError = fieldSummaries.join(" | ");
      }
    }
  } else {
    generalError = err?.message || "An unexpected error occurred.";
  }

  return { fieldErrors, generalError };
}

/**
 * Config-driven ResourceManager component for DRF resources.
 * Supports:
 * - Real-time listing with DRF pagination & search
 * - Create / Edit modal with field-level 400 error display
 * - Delete confirmation modal
 * - Client-side validate hook
 * - Custom action buttons
 */
export default function ResourceManager({
  title = "Records",
  itemTitle = "Record",
  resource,
  columns = [],
  fields = [],
  validate,
  initialParams = {},
  searchPlaceholder = "Search...",
  idField = "id",
  canCreate = true,
  canEdit = true,
  canDelete = true,
  actions = [],
  filterComponent,
  transformPayload,
  populateForm,
  onSuccess,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [search, setSearch] = useState("");
  const [params, setParams] = useState(initialParams);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [modalGeneralError, setModalGeneralError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch records
  const fetchList = useCallback(async () => {
    if (!resource || typeof resource.list !== "function") return;
    try {
      setLoading(true);
      setListError(null);
      const query = { ...params };
      if (search.trim()) {
        query.search = search.trim();
      }
      const res = await resource.list(query);
      const list = res.results || res.data || [];
      setItems(list);
    } catch (err) {
      setListError(err?.response?.data?.detail || err?.message || "Failed to load records");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [resource, params, search]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Open Create Modal
  const handleOpenCreate = () => {
    const initial = {};
    fields.forEach((f) => {
      initial[f.name] = f.defaultValue !== undefined ? f.defaultValue : "";
    });
    setFormData(initial);
    setFieldErrors({});
    setModalGeneralError(null);
    setEditingItem(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    let populated = {};
    if (typeof populateForm === "function") {
      populated = populateForm(item);
    } else {
      fields.forEach((f) => {
        const val = item[f.name] !== undefined ? item[f.name] : item[f.name.toLowerCase()];
        populated[f.name] = val !== undefined && val !== null ? val : "";
      });
    }
    setFormData(populated);
    setFieldErrors({});
    setModalGeneralError(null);
    setEditingItem(item);
    setModalOpen(true);
  };

  // Field change
  const handleFieldChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-level error on edit
    if (fieldErrors[name] || fieldErrors[name.toLowerCase()]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        delete copy[name.toLowerCase()];
        return copy;
      });
    }
  };

  // Submit form
  const handleSave = async (e) => {
    if (e) e.preventDefault();

    // Client-side validation hook
    if (typeof validate === "function") {
      const clientErrors = validate(formData);
      if (clientErrors && Object.keys(clientErrors).length > 0) {
        setFieldErrors(clientErrors);
        setModalGeneralError("Please fix the validation errors below.");
        return;
      }
    }

    let payload = { ...formData };
    if (typeof transformPayload === "function") {
      payload = transformPayload(payload, Boolean(editingItem));
    }

    try {
      setSaving(true);
      setFieldErrors({});
      setModalGeneralError(null);

      const targetId = editingItem
        ? editingItem[idField] ?? editingItem.id ?? editingItem.pk
        : null;

      let saved;
      if (editingItem && targetId !== undefined && targetId !== null) {
        saved = await resource.update(targetId, payload);
      } else {
        saved = await resource.create(payload);
      }

      setModalOpen(false);
      fetchList();
      if (typeof onSuccess === "function") {
        onSuccess(saved, Boolean(editingItem));
      }
    } catch (err) {
      const { fieldErrors: bFieldErrors, generalError } = parseBackendErrors(err);
      setFieldErrors(bFieldErrors);
      setModalGeneralError(generalError || "Failed to save record. See errors below.");
    } finally {
      setSaving(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (item) => {
    setDeletingItem(item);
    setDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    const targetId = deletingItem[idField] ?? deletingItem.id ?? deletingItem.pk;
    if (targetId === undefined || targetId === null) return;

    try {
      setDeleting(true);
      await resource.remove(targetId);
      setDeleteModalOpen(false);
      setDeletingItem(null);
      fetchList();
      if (typeof onSuccess === "function") {
        onSuccess({ id: targetId }, false);
      }
    } catch (err) {
      alert(err?.response?.data?.detail || err?.message || "Failed to delete record.");
    } finally {
      setDeleting(false);
    }
  };

  // Client filtered items if search is provided
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((row) =>
      Object.values(row).some((val) =>
        val !== null && val !== undefined && String(val).toLowerCase().includes(q)
      )
    );
  }, [items, search]);

  return (
    <div className="resource-manager container-fluid py-2">
      {/* Top Header & Toolbar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-0">{title}</h4>
          <small className="text-muted">Total: {filteredItems.length} records</small>
        </div>

        <div className="d-flex align-items-center gap-2">
          {filterComponent}

          <div className="input-group input-group-sm" style={{ width: "240px" }}>
            <span className="input-group-text bg-light border-end-0">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="btn btn-outline-secondary border-start-0"
                type="button"
                onClick={() => setSearch("")}
              >
                &times;
              </button>
            )}
          </div>

          <button className="btn btn-sm btn-outline-secondary" onClick={fetchList} title="Refresh">
            <i className="bi bi-arrow-clockwise"></i>
          </button>

          {canCreate && (
            <button className="btn btn-sm btn-primary d-flex align-items-center gap-1" onClick={handleOpenCreate}>
              <i className="bi bi-plus-lg"></i>
              <span>Add {itemTitle}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main List Area */}
      {loading ? (
        <Loader text={`Loading ${title.toLowerCase()}...`} />
      ) : listError ? (
        <div className="alert alert-danger d-flex align-items-center justify-content-between">
          <div>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {listError}
          </div>
          <button className="btn btn-sm btn-outline-danger" onClick={fetchList}>
            Retry
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="bi-inbox"
          title={`No ${title.toLowerCase()} found`}
          description={search ? "Try adjusting your search criteria." : `Click 'Add ${itemTitle}' to create one.`}
          actionLabel={canCreate && !search ? `Add ${itemTitle}` : undefined}
          onAction={canCreate && !search ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  {columns.map((col, idx) => (
                    <th key={col.key || idx} style={col.width ? { width: col.width } : undefined}>
                      {col.label}
                    </th>
                  ))}
                  {(canEdit || canDelete || actions.length > 0) && (
                    <th className="text-end" style={{ width: "130px" }}>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((row, rIdx) => {
                  const keyVal = row[idField] ?? row.id ?? rIdx;
                  return (
                    <tr key={keyVal}>
                      {columns.map((col, cIdx) => (
                        <td key={col.key || cIdx}>
                          {typeof col.render === "function"
                            ? col.render(row)
                            : row[col.key] !== undefined && row[col.key] !== null
                            ? String(row[col.key])
                            : "-"}
                        </td>
                      ))}
                      {(canEdit || canDelete || actions.length > 0) && (
                        <td className="text-end text-nowrap">
                          {actions.map((act, aIdx) => (
                            <button
                              key={aIdx}
                              className={`btn btn-sm ${act.btnClass || "btn-outline-secondary"} me-1`}
                              title={act.label}
                              onClick={() => act.onClick(row)}
                            >
                              {act.icon && <i className={`bi ${act.icon}`}></i>}
                              {act.text && <span className="ms-1">{act.text}</span>}
                            </button>
                          ))}

                          {canEdit && (
                            <button
                              className="btn btn-sm btn-outline-primary me-1"
                              title="Edit"
                              onClick={() => handleOpenEdit(row)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                          )}

                          {canDelete && (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              title="Delete"
                              onClick={() => handleOpenDelete(row)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <form onSubmit={handleSave}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    {editingItem ? `Edit ${itemTitle}` : `Add New ${itemTitle}`}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setModalOpen(false)}
                    disabled={saving}
                  ></button>
                </div>

                <div className="modal-body">
                  {/* General error banner */}
                  {modalGeneralError && (
                    <div className="alert alert-danger py-2 px-3 d-flex align-items-center mb-3">
                      <i className="bi bi-exclamation-octagon-fill me-2 fs-5"></i>
                      <div className="small fw-semibold">{modalGeneralError}</div>
                    </div>
                  )}

                  <div className="row g-3">
                    {fields.map((f) => {
                      const fieldErr =
                        fieldErrors[f.name] ||
                        fieldErrors[f.name.toLowerCase()] ||
                        fieldErrors[f.name.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "")];

                      const isInvalid = Boolean(fieldErr);
                      const colClass = f.colClass || "col-12 col-md-6";
                      const val = formData[f.name] !== undefined ? formData[f.name] : "";

                      return (
                        <div key={f.name} className={colClass}>
                          <label className="form-label small fw-bold mb-1">
                            {f.label} {f.required && <span className="text-danger">*</span>}
                          </label>

                          {f.type === "select" ? (
                            <select
                              className={`form-select form-select-sm ${isInvalid ? "is-invalid" : ""}`}
                              value={val}
                              disabled={f.disabled || saving}
                              onChange={(e) => handleFieldChange(f.name, e.target.value)}
                            >
                              <option value="">{f.placeholder || `-- Select ${f.label} --`}</option>
                              {(f.options || []).map((opt) => {
                                const optVal = typeof opt === "object" ? opt.value : opt;
                                const optLabel = typeof opt === "object" ? opt.label : opt;
                                return (
                                  <option key={optVal} value={optVal}>
                                    {optLabel}
                                  </option>
                                );
                              })}
                            </select>
                          ) : f.type === "textarea" ? (
                            <textarea
                              className={`form-control form-control-sm ${isInvalid ? "is-invalid" : ""}`}
                              rows={f.rows || 3}
                              placeholder={f.placeholder || ""}
                              value={val}
                              disabled={f.disabled || saving}
                              readOnly={f.readOnly}
                              onChange={(e) => handleFieldChange(f.name, e.target.value)}
                            />
                          ) : f.type === "checkbox" ? (
                            <div className="form-check mt-1">
                              <input
                                className={`form-check-input ${isInvalid ? "is-invalid" : ""}`}
                                type="checkbox"
                                checked={Boolean(val)}
                                disabled={f.disabled || saving}
                                onChange={(e) => handleFieldChange(f.name, e.target.checked)}
                              />
                              <label className="form-check-label small text-muted">
                                {f.checkboxLabel || f.label}
                              </label>
                            </div>
                          ) : (
                            <input
                              type={f.type || "text"}
                              className={`form-control form-control-sm ${isInvalid ? "is-invalid" : ""}`}
                              placeholder={f.placeholder || ""}
                              value={val}
                              step={f.step}
                              min={f.min}
                              max={f.max}
                              disabled={f.disabled || saving}
                              readOnly={f.readOnly}
                              onChange={(e) => handleFieldChange(f.name, e.target.value)}
                            />
                          )}

                          {/* Field-level backend 400 error display */}
                          {fieldErr && (
                            <div className="invalid-feedback d-block fw-semibold" style={{ fontSize: "0.8rem" }}>
                              {fieldErr}
                            </div>
                          )}

                          {f.help && !fieldErr && (
                            <div className="form-text text-muted" style={{ fontSize: "0.75rem" }}>
                              {f.help}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="modal-footer d-flex justify-content-between align-items-center">
                  <div className="me-2 text-truncate" style={{ maxWidth: "450px" }}>
                    {modalGeneralError && (
                      <span className="text-danger small fw-semibold" title={modalGeneralError}>
                        <i className="bi bi-exclamation-triangle-fill me-1"></i>
                        {modalGeneralError}
                      </span>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setModalOpen(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
                      {saving ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-1"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Saving...
                        </>
                      ) : (
                        "Save Record"
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        show={deleteModalOpen}
        title={`Delete ${itemTitle}`}
        message={`Are you sure you want to permanently delete this ${itemTitle.toLowerCase()} record? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeletingItem(null);
        }}
      />
    </div>
  );
}

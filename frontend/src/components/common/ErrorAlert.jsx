import React from "react";

// Extracts and displays DRF error messages (detail, non_field_errors, or field-level arrays/strings)
export function extractErrorMessage(error) {
  if (!error) return null;
  if (typeof error === "string") return error;

  const data = error.response?.data || error.data || error;

  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;
  if (data?.message) return data.message;
  if (Array.isArray(data?.non_field_errors)) {
    return data.non_field_errors.join(", ");
  }

  if (typeof data === "object" && data !== null && ! error.message?.includes("Network Error")) {
    const fieldMessages = [];
    for (const [key, val] of Object.entries(data)) {
      if (key === "status" || key === "headers" || key === "config" || key === "request") continue;
      if (Array.isArray(val)) {
        fieldMessages.push(`${key}: ${val.join(", ")}`);
      } else if (typeof val === "string") {
        fieldMessages.push(`${key}: ${val}`);
      }
    }
    if (fieldMessages.length > 0) return fieldMessages.join(" | ");
  }

  return error.message || "An unexpected error occurred while communicating with the server.";
}

export default function ErrorAlert({ error, onClose, onRetry }) {
  const message = extractErrorMessage(error);
  if (!message) return null;

  return (
    <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3 mb-3" role="alert">
      <div className="d-flex align-items-center gap-2">
        <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
        <div>{message}</div>
      </div>
      <div className="d-flex align-items-center gap-2 flex-shrink-0">
        {onRetry && (
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
            <i className="bi bi-arrow-clockwise me-1"></i>Retry
          </button>
        )}
        {onClose && (
          <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
        )}
      </div>
    </div>
  );
}

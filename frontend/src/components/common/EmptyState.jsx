import React from "react";

export default function EmptyState({
  icon = "bi-inbox",
  title = "No records found",
  message = "There are no items to display at the moment.",
  action,
}) {
  return (
    <div className="text-center py-5 px-3">
      <div className="mb-3">
        <i className={`bi ${icon} fs-1 text-secondary opacity-50`}></i>
      </div>
      <h6 className="fw-semibold mb-1">{title}</h6>
      <p className="text-secondary small mb-3">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

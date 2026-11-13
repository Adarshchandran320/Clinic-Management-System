import React from "react";

// Page title on the left with action buttons on the right
export default function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div>
        <h4 className="fw-bold mb-0">{title}</h4>
        {subtitle && <p className="text-secondary small mb-0 mt-1">{subtitle}</p>}
      </div>
      <div className="d-flex flex-wrap align-items-center gap-2">
        {actions}
        {children}
      </div>
    </div>
  );
}

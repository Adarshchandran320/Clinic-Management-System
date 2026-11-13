import React from "react";

// Preclinic KPI Stat Card (row of 4 KPI cards: icon, big number, colored % badge)
export default function StatCard({
  title,
  value,
  badgeText,
  badgeVariant = "success",
  subtitle = "in last 7 Days",
  icon = "bi-calendar2-check",
  iconBg = "#2E37A4",
}) {
  const badgeClasses = {
    success: "bg-success text-white",
    danger: "bg-danger text-white",
    warning: "bg-warning text-dark",
    info: "bg-primary text-white",
  };

  return (
    <div className="card h-100 border-0 shadow-sm">
      <div className="card-body p-3 p-md-4">
        <div className="d-flex align-items-start justify-content-between mb-2">
          <div>
            <div className="text-secondary small fw-medium mb-1">{title}</div>
            <div className="d-flex align-items-center gap-2">
              <h3 className="fw-bold mb-0">{value ?? 0}</h3>
              {badgeText && (
                <span
                  className={`badge rounded-1 px-2 py-1 fw-semibold ${
                    badgeClasses[badgeVariant] || badgeClasses.success
                  }`}
                >
                  {badgeText}
                </span>
              )}
            </div>
          </div>
          <div
            className="kpi-icon-circle text-white shadow-sm"
            style={{ backgroundColor: iconBg }}
          >
            <i className={`bi ${icon}`}></i>
          </div>
        </div>
        {subtitle && <div className="text-secondary small mt-2">{subtitle}</div>}
      </div>
    </div>
  );
}

import React from "react";

// Colored status badges: Pending = amber, Dispensed/Completed/Active = green, Out of Stock/Cancelled = red
export default function StatusBadge({ status }) {
  if (!status && status !== 0) return <span className="text-secondary">-</span>;

  const raw = String(status).trim();
  const normalized = raw.toLowerCase();

  let badgeClass = "bg-secondary text-white";

  if (
    normalized.includes("pending") ||
    normalized.includes("wait") ||
    normalized.includes("queue") ||
    normalized.includes("low") ||
    normalized.includes("unpaid") ||
    normalized.includes("scheduled") ||
    normalized.includes("ongoing")
  ) {
    badgeClass = "bg-warning text-dark";
  } else if (
    normalized.includes("dispens") ||
    normalized.includes("complet") ||
    normalized.includes("paid") ||
    normalized.includes("active") ||
    normalized.includes("in stock") ||
    normalized.includes("available") ||
    normalized.includes("checked in") ||
    normalized.includes("confirmed")
  ) {
    badgeClass = "bg-success text-white";
  } else if (
    normalized.includes("out") ||
    normalized.includes("cancel") ||
    normalized.includes("expir") ||
    normalized.includes("reject") ||
    normalized.includes("critical") ||
    normalized.includes("failed")
  ) {
    badgeClass = "bg-danger text-white";
  } else if (normalized.includes("reschedul") || normalized.includes("info")) {
    badgeClass = "bg-primary text-white";
  }

  return (
    <span className={`badge rounded-1 px-2 py-1 fw-medium ${badgeClass}`}>
      {raw}
    </span>
  );
}

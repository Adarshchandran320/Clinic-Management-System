import React from "react";
import Loader from "./Loader.jsx";
import EmptyState from "./EmptyState.jsx";
import ErrorAlert from "./ErrorAlert.jsx";

// Renders a responsive Bootstrap table from a single column-config array: [{ key, label, formatter }]
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  error = null,
  onRetry = null,
  emptyTitle = "No records found",
  emptyMessage = "No matching data was returned from the server.",
  rowKey = "id",
}) {
  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="p-3">
        <ErrorAlert error={error} onRetry={onRetry} />
      </div>
    );
  }

  const rows = Array.isArray(data) ? data : [];

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  // Resolve nested or fallback keys easily
  const getValue = (row, key) => {
    if (!row || !key) return undefined;
    if (key.includes(".")) {
      return key.split(".").reduce((acc, part) => acc && acc[part], row);
    }
    return row[key];
  };

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            {columns.map((col, idx) => (
              <th key={col.key || idx} className={col.headerClassName || ""}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => {
            const keyVal = row[rowKey] ?? row.id ?? row.pk ?? rIdx;
            return (
              <tr key={keyVal}>
                {columns.map((col, cIdx) => {
                  const rawValue = getValue(row, col.key);
                  return (
                    <td key={col.key || cIdx} className={col.className || ""}>
                      {col.formatter
                        ? col.formatter(rawValue, row, rIdx)
                        : rawValue !== undefined && rawValue !== null && rawValue !== ""
                        ? String(rawValue)
                        : "-"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

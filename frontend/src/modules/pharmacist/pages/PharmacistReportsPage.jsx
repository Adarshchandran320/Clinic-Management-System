import React, { useState, useEffect, useCallback } from "react";
import pharmacistApi from "../../../api/pharmacistApi.js";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  ErrorAlert,
} from "../../../components/common/index.js";

const REVENUE_COLUMNS = [
  {
    key: "date",
    label: "Date / Period",
    formatter: (val, row) => val || row.day || row.period || "-",
  },
  {
    key: "bills_count",
    label: "Bills Count",
    formatter: (val, row) => val ?? row.total_bills ?? row.count ?? "-",
  },
  {
    key: "total_revenue",
    label: "Revenue",
    formatter: (val, row) => {
      const rev = val ?? row.revenue ?? row.amount ?? 0;
      return <span className="fw-semibold">${Number(rev).toFixed(2)}</span>;
    },
  },
];

const REORDER_COLUMNS = [
  {
    key: "medicine_name",
    label: "Medicine",
    formatter: (val, row) => (
      <span className="fw-semibold">{val || row.name || row.medicine || "-"}</span>
    ),
  },
  {
    key: "category",
    label: "Category",
    formatter: (val) => val || "-",
  },
  {
    key: "quantity",
    label: "Available Qty",
    formatter: (val, row) => val ?? row.available_qty ?? 0,
  },
  {
    key: "reorder_level",
    label: "Reorder Level",
    formatter: (val, row) => val ?? row.min_stock ?? "-",
  },
  {
    key: "status",
    label: "Status",
    formatter: (val, row) => {
      const qty = Number(row.quantity ?? row.available_qty ?? 0);
      return <StatusBadge status={val || (qty <= 0 ? "Out of Stock" : "Low Stock")} />;
    },
  },
];

export default function PharmacistReportsPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [revenuePayload, setRevenuePayload] = useState(null);
  const [revLoading, setRevLoading] = useState(true);
  const [revError, setRevError] = useState(null);

  const [reorderList, setReorderList] = useState([]);
  const [reorderLoading, setReorderLoading] = useState(true);
  const [reorderError, setReorderError] = useState(null);

  const fetchRevenue = useCallback(async (from = "", to = "") => {
    setRevLoading(true);
    setRevError(null);
    try {
      const data = await pharmacistApi.getRevenueReport(from, to);
      setRevenuePayload(data);
    } catch (err) {
      setRevError(err);
    } finally {
      setRevLoading(false);
    }
  }, []);

  const fetchReorder = useCallback(async () => {
    setReorderLoading(true);
    setReorderError(null);
    try {
      const list = await pharmacistApi.getReorderReport();
      setReorderList(list);
    } catch (err) {
      setReorderError(err);
    } finally {
      setReorderLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenue();
    fetchReorder();
  }, [fetchRevenue, fetchReorder]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchRevenue(fromDate, toDate);
  };

  const revenueRows = Array.isArray(revenuePayload)
    ? revenuePayload
    : revenuePayload?.daily ||
      revenuePayload?.results ||
      revenuePayload?.items ||
      (revenuePayload && typeof revenuePayload === "object" ? [revenuePayload] : []);

  return (
    <div>
      <PageHeader
        title="Pharmacy Reports"
        subtitle="Revenue breakdown by date range and low-stock reorder alerts"
      />

      {/* Revenue Report Section */}
      <div className="card mb-4">
        <div className="card-header bg-transparent border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3 py-3">
          <h6 className="fw-bold mb-0">Revenue Report</h6>
          <form
            className="d-flex flex-wrap align-items-center gap-2"
            onSubmit={handleFilterSubmit}
          >
            <div className="d-flex align-items-center gap-1 small">
              <label className="text-secondary">From:</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="d-flex align-items-center gap-1 small">
              <label className="text-secondary">To:</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-sm btn-primary" disabled={revLoading}>
              Apply Filter
            </button>
          </form>
        </div>

        <div className="card-body p-0">
          {revError ? (
            <div className="p-3">
              <ErrorAlert
                error={revError}
                onRetry={() => fetchRevenue(fromDate, toDate)}
              />
            </div>
          ) : (
            <DataTable
              columns={REVENUE_COLUMNS}
              data={revenueRows}
              loading={revLoading}
              emptyTitle="No revenue records for selected range"
              emptyMessage="Adjust the date filter or dispense prescriptions to generate revenue data."
            />
          )}
        </div>
      </div>

      {/* Reorder Report Section */}
      <div className="card">
        <div className="card-header bg-transparent border-bottom d-flex align-items-center justify-content-between py-3">
          <h6 className="fw-bold mb-0">Reorder & Low Stock Report</h6>
          <button
            type="button"
            className="btn btn-sm btn-light border"
            onClick={fetchReorder}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>Refresh
          </button>
        </div>
        <div className="card-body p-0">
          <DataTable
            columns={REORDER_COLUMNS}
            data={reorderList}
            loading={reorderLoading}
            error={reorderError}
            onRetry={fetchReorder}
            emptyTitle="No items require reordering"
            emptyMessage="All inventory items are above their reorder levels."
          />
        </div>
      </div>
    </div>
  );
}

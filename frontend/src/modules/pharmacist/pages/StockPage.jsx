import React, { useState, useEffect, useCallback } from "react";
import pharmacistApi from "../../../api/pharmacistApi.js";
import {
  PageHeader,
  DataTable,
  StatusBadge,
} from "../../../components/common/index.js";
import StockModal from "../components/StockModal.jsx";

// Single column-config array for Stock inventory
const STOCK_COLUMNS = (onEdit) => [
  { key: "id", label: "ID" },
  {
    key: "medicine_name",
    label: "Medicine",
    formatter: (val, row) => (
      <span className="fw-semibold">
        {val || row.medicine?.name || row.name || `Medicine #${row.medicine}`}
      </span>
    ),
  },
  {
    key: "batch_number",
    label: "Batch No",
    formatter: (val, row) => val || row.batch_no || "-",
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
    key: "expiry_date",
    label: "Expiry Date",
    formatter: (val) => val || "-",
  },
  {
    key: "status",
    label: "Status",
    formatter: (val, row) => {
      const qty = Number(row.quantity ?? row.available_qty ?? 0);
      const reorder = Number(row.reorder_level ?? row.min_stock ?? 10);
      const computed =
        val || (qty <= 0 ? "Out of Stock" : qty <= reorder ? "Low Stock" : "In Stock");
      return <StatusBadge status={computed} />;
    },
  },
  {
    key: "actions",
    label: "",
    className: "text-end",
    formatter: (_, row) => (
      <button
        type="button"
        className="btn btn-sm btn-light border"
        onClick={() => onEdit(row)}
      >
        <i className="bi bi-pencil me-1"></i>Edit
      </button>
    ),
  },
];

export default function StockPage() {
  const [stockList, setStockList] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stockData, medData] = await Promise.allSettled([
        pharmacistApi.getStock(),
        pharmacistApi.getMedicines(),
      ]);
      if (stockData.status === "fulfilled") {
        setStockList(stockData.value);
      } else {
        throw stockData.reason;
      }
      if (medData.status === "fulfilled") {
        setMedicines(medData.value);
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

  const handleSaveStock = async (payload, id) => {
    if (id) {
      await pharmacistApi.updateStock(id, payload);
      setToast("Stock entry updated successfully.");
    } else {
      await pharmacistApi.createStock(payload);
      setToast("New stock entry added successfully.");
    }
    setModalOpen(false);
    setEditingItem(null);
    loadData();
  };

  return (
    <div>
      <PageHeader
        title="Inventory & Stock Management"
        subtitle="Manage medicine batches, quantities, and reorder thresholds"
        actions={
          <button
            type="button"
            className="btn btn-primary btn-sm px-3"
            onClick={() => {
              setEditingItem(null);
              setModalOpen(true);
            }}
          >
            <i className="bi bi-plus-lg me-1"></i>Add Stock
          </button>
        }
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

      <div className="card">
        <div className="card-body p-0">
          <DataTable
            columns={STOCK_COLUMNS((row) => {
              setEditingItem(row);
              setModalOpen(true);
            })}
            data={stockList}
            loading={loading}
            error={error}
            onRetry={loadData}
            emptyTitle="No stock records found"
            emptyMessage="Click 'Add Stock' to register your first medicine batch."
          />
        </div>
      </div>

      <StockModal
        show={modalOpen}
        initialData={editingItem}
        medicines={medicines}
        onSave={handleSaveStock}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
      />
    </div>
  );
}

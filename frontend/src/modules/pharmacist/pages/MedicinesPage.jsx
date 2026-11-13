import React, { useState, useEffect, useCallback } from "react";
import pharmacistApi from "../../../api/pharmacistApi.js";
import {
  PageHeader,
  DataTable,
  StatusBadge,
} from "../../../components/common/index.js";

// Single column-config array for Medicines catalog
const MEDICINE_COLUMNS = [
  { key: "id", label: "ID" },
  {
    key: "name",
    label: "Medicine Name",
    formatter: (val, row) => (
      <span className="fw-semibold">{val || row.medicine_name || "-"}</span>
    ),
  },
  {
    key: "category",
    label: "Category",
    formatter: (val, row) => val || row.dosage_form || "-",
  },
  {
    key: "manufacturer",
    label: "Manufacturer / Generic",
    formatter: (val, row) => val || row.generic_name || "-",
  },
  {
    key: "unit_price",
    label: "Price",
    formatter: (val, row) => {
      const price = val ?? row.price;
      return price !== undefined && price !== null ? `$${Number(price).toFixed(2)}` : "-";
    },
  },
  {
    key: "status",
    label: "Status",
    formatter: (val, row) => (
      <StatusBadge
        status={
          val ||
          (row.in_stock === false || row.quantity === 0 ? "Out of Stock" : "Available")
        }
      />
    ),
  },
];

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMedicines = useCallback(async (searchTerm = "") => {
    setLoading(true);
    setError(null);
    try {
      const params = searchTerm ? { search: searchTerm } : {};
      const list = await pharmacistApi.getMedicines(params);
      setMedicines(list);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedicines();
  }, [loadMedicines]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadMedicines(search.trim());
  };

  // Client-side filter fallback in case backend ignores ?search=
  const filteredMedicines = medicines.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = String(m.name || m.medicine_name || "").toLowerCase();
    const cat = String(m.category || m.generic_name || "").toLowerCase();
    return name.includes(q) || cat.includes(q);
  });

  return (
    <div>
      <PageHeader
        title="Medicines Catalog"
        subtitle="Read-only searchable directory of clinic medicines"
      />

      <div className="card">
        <div className="card-header bg-transparent border-bottom py-3">
          <form className="row g-2 align-items-center" onSubmit={handleSearchSubmit}>
            <div className="col-12 col-sm-6 col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-transparent">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search medicine by name or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="card-body p-0">
          <DataTable
            columns={MEDICINE_COLUMNS}
            data={filteredMedicines}
            loading={loading}
            error={error}
            onRetry={() => loadMedicines(search)}
            emptyTitle="No medicines found"
            emptyMessage="No medicines matched your search criteria."
          />
        </div>
      </div>
    </div>
  );
}

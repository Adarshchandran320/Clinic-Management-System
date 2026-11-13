import React from "react";
import adminApi from "../../../api/adminApi.js";
import ResourceManager from "../../../components/common/ResourceManager.jsx";
import StatusBadge from "../../../components/common/StatusBadge.jsx";

export default function AdminMedicinesPage() {
  const columns = [
    {
      key: "MedicineId",
      label: "Med ID",
      formatter: (val, row) => `#${val ?? row.id ?? "-"}`,
    },
    {
      key: "MedicineName",
      label: "Medicine Name",
      formatter: (val, row) => (
        <div>
          <div className="fw-semibold text-primary">{val || "-"}</div>
          {row.GenericName && (
            <div className="small text-muted fst-italic">{row.GenericName}</div>
          )}
        </div>
      ),
    },
    {
      key: "Category",
      label: "Category",
      formatter: (val) => (
        <span className="badge bg-secondary-subtle text-secondary border">
          {val || "General"}
        </span>
      ),
    },
    {
      key: "Manufacturer",
      label: "Manufacturer",
      formatter: (val) => val || "-",
    },
    {
      key: "CostValue",
      label: "Cost Price",
      formatter: (val) => `₹${Number(val || 0).toFixed(2)}`,
    },
    {
      key: "MRP",
      label: "MRP",
      formatter: (val) => (
        <span className="fw-semibold text-dark">
          ₹${Number(val || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: "Quantity",
      label: "Stock Qty",
      formatter: (val, row) => {
        const qty = Number(val ?? row.QuantityOnHand ?? 0);
        if (qty === 0) {
          return (
            <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
              Out of stock (0)
            </span>
          );
        }
        if (qty < 10) {
          return (
            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
              Low: {qty} units
            </span>
          );
        }
        return (
          <span className="badge bg-success-subtle text-success border border-success-subtle">
            {qty} units
          </span>
        );
      },
    },
    {
      key: "isActive",
      label: "Status",
      formatter: (val) => (
        <StatusBadge status={val !== false ? "Active" : "Inactive"} />
      ),
    },
  ];

  const fields = [
    {
      name: "MedicineName",
      label: "Medicine Brand Name",
      type: "text",
      required: true,
      placeholder: "e.g. Paracetamol 500mg, Amoxicillin 250mg",
      colClass: "col-12 col-md-6",
    },
    {
      name: "GenericName",
      label: "Generic Chemical Name",
      type: "text",
      placeholder: "e.g. Acetaminophen",
      colClass: "col-12 col-md-6",
    },
    {
      name: "Category",
      label: "Dosage Form / Category",
      type: "select",
      options: [
        { value: "Tablet", label: "Tablet" },
        { value: "Capsule", label: "Capsule" },
        { value: "Syrup", label: "Syrup / Liquid" },
        { value: "Injection", label: "Injection" },
        { value: "Ointment", label: "Ointment / Cream" },
        { value: "Drops", label: "Eye / Ear Drops" },
        { value: "Inhaler", label: "Inhaler" },
        { value: "Other", label: "Other Form" },
      ],
      colClass: "col-12 col-md-6",
    },
    {
      name: "Manufacturer",
      label: "Manufacturer / Pharma Co.",
      type: "text",
      required: true,
      placeholder: "e.g. Sun Pharma, Cipla, GSK",
      colClass: "col-12 col-md-6",
    },
    {
      name: "CostValue",
      label: "Cost Price (₹)",
      type: "number",
      required: true,
      step: "0.01",
      min: "0",
      placeholder: "e.g. 15.00",
      help: "Purchase cost per unit.",
      colClass: "col-12 col-md-6",
    },
    {
      name: "MRP",
      label: "Maximum Retail Price (₹)",
      type: "number",
      required: true,
      step: "0.01",
      min: "0",
      placeholder: "e.g. 25.00",
      help: "Selling price. Must be at least the cost price.",
      colClass: "col-12 col-md-6",
    },
    {
      name: "isActive",
      label: "Active Formulary",
      type: "checkbox",
      defaultValue: true,
      checkboxLabel: "Active in Clinic Formulary",
      colClass: "col-12",
    },
  ];

  const validate = (data) => {
    const errors = {};
    if (!String(data.MedicineName || "").trim()) {
      errors.MedicineName = "Medicine name is required.";
    }
    if (!String(data.Manufacturer || "").trim()) {
      errors.Manufacturer = "Manufacturer is required.";
    }

    const cost = Number(data.CostValue);
    const mrp = Number(data.MRP);

    if (isNaN(cost) || cost < 0) {
      errors.CostValue = "Cost price must be a non-negative number.";
    }

    if (isNaN(mrp) || mrp < 0) {
      errors.MRP = "MRP must be a non-negative number.";
    } else if (!isNaN(cost) && mrp < cost) {
      errors.MRP = `MRP (₹${mrp.toFixed(2)}) must be at least the cost price (₹${cost.toFixed(2)}).`;
    }

    return errors;
  };

  const transformPayload = (data) => ({
    MedicineName: String(data.MedicineName || "").trim(),
    GenericName: String(data.GenericName || "").trim(),
    Category: String(data.Category || "Tablet").trim(),
    Manufacturer: String(data.Manufacturer || "").trim(),
    CostValue: Number(data.CostValue).toFixed(2),
    MRP: Number(data.MRP).toFixed(2),
    isActive: data.isActive !== false,
  });

  const populateForm = (item) => ({
    MedicineName: item.MedicineName || "",
    GenericName: item.GenericName || "",
    Category: item.Category || "Tablet",
    Manufacturer: item.Manufacturer || "",
    CostValue: item.CostValue != null ? String(item.CostValue) : "",
    MRP: item.MRP != null ? String(item.MRP) : "",
    isActive: item.isActive !== false,
  });

  return (
    <ResourceManager
      title="Medicines Master Catalog"
      itemTitle="Medicine"
      resource={adminApi.medicines}
      idField="MedicineId"
      columns={columns}
      fields={fields}
      validate={validate}
      transformPayload={transformPayload}
      populateForm={populateForm}
      searchPlaceholder="Search medicines by name, generic name, or manufacturer..."
    />
  );
}

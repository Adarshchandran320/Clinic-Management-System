import React from "react";
import adminApi from "../../../api/adminApi.js";
import ResourceManager from "../../../components/common/ResourceManager.jsx";
import StatusBadge from "../../../components/common/StatusBadge.jsx";

export default function AdminDepartmentsPage() {
  const columns = [
    {
      key: "DepartmentId",
      label: "ID",
      formatter: (val, row) => `#${val ?? row.id ?? "-"}`,
    },
    {
      key: "DepartmentName",
      label: "Department Name",
      formatter: (val) => (
        <span className="fw-semibold text-primary">{val || "-"}</span>
      ),
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
      name: "DepartmentName",
      label: "Department Name",
      type: "text",
      required: true,
      placeholder: "e.g. Cardiology, Radiology, Pediatrics",
      colClass: "col-12",
    },
    {
      name: "isActive",
      label: "Status",
      type: "checkbox",
      defaultValue: true,
      checkboxLabel: "Active Department",
      colClass: "col-12",
    },
  ];

  const validate = (data) => {
    const errors = {};
    const name = String(data.DepartmentName || "").trim();
    if (!name) {
      errors.DepartmentName = "Department name is required.";
    } else if (name.length < 2) {
      errors.DepartmentName = "Department name must be at least 2 characters.";
    }
    return errors;
  };

  const transformPayload = (data) => ({
    DepartmentName: String(data.DepartmentName || "").trim(),
    isActive: data.isActive !== false,
  });

  const populateForm = (item) => ({
    DepartmentName: item.DepartmentName || "",
    isActive: item.isActive !== false,
  });

  return (
    <ResourceManager
      title="Departments"
      itemTitle="Department"
      resource={adminApi.departments}
      idField="DepartmentId"
      columns={columns}
      fields={fields}
      validate={validate}
      transformPayload={transformPayload}
      populateForm={populateForm}
      searchPlaceholder="Search departments by name..."
    />
  );
}

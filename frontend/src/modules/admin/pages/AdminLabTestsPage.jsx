import React, { useMemo } from "react";
import adminApi from "../../../api/adminApi.js";
import ResourceManager from "../../../components/common/ResourceManager.jsx";
import StatusBadge from "../../../components/common/StatusBadge.jsx";
import useLookups from "../../../hooks/useLookups.js";

export default function AdminLabTestsPage() {
  const { lookups } = useLookups({
    departments: adminApi.departments,
  });

  const departmentOptions = useMemo(() => {
    return (lookups.departments || []).map((d) => ({
      value: d.DepartmentId ?? d.id,
      label: d.DepartmentName ?? d.name,
    }));
  }, [lookups.departments]);

  const columns = [
    {
      key: "LabtestId",
      label: "Test ID",
      formatter: (val, row) => `#${val ?? row.id ?? row.LabTestId ?? "-"}`,
    },
    {
      key: "TestName",
      label: "Test Name",
      formatter: (val) => (
        <span className="fw-semibold text-primary">{val || "-"}</span>
      ),
    },
    {
      key: "NormalName",
      label: "Reference / Normal Range",
      formatter: (val) => (
        <span className="badge bg-light text-dark border font-monospace">
          {val || "Standard"}
        </span>
      ),
    },
    {
      key: "TestCost",
      label: "Price (Cost)",
      formatter: (val) => (
        <span className="fw-bold text-success">
          ₹{Number(val || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: "DepartmentId",
      label: "Department",
      formatter: (val, row) => {
        const dName =
          row.DepartmentName ||
          row.department ||
          (typeof val === "object" ? val?.DepartmentName : null) ||
          "-";
        return <span className="small text-muted">{dName}</span>;
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
      name: "TestName",
      label: "Diagnostic Test Name",
      type: "text",
      required: true,
      placeholder: "e.g. Complete Blood Count (CBC)",
      colClass: "col-12 col-md-6",
    },
    {
      name: "NormalName",
      label: "Normal Reference Range / Value",
      type: "text",
      required: true,
      placeholder: "e.g. 70-100 mg/dL, Normal, Negative",
      help: "Expected reference range for healthy adults.",
      colClass: "col-12 col-md-6",
    },
    {
      name: "TestCost",
      label: "Test Fee (₹)",
      type: "number",
      required: true,
      step: "0.01",
      min: "0.01",
      placeholder: "e.g. 350.00",
      help: "Must be strictly greater than 0.",
      colClass: "col-12 col-md-6",
    },
    {
      name: "DepartmentId",
      label: "Department",
      type: "select",
      options: departmentOptions,
      colClass: "col-12 col-md-6",
    },
    {
      name: "isActive",
      label: "Status",
      type: "checkbox",
      defaultValue: true,
      checkboxLabel: "Active Test Offered",
      colClass: "col-12",
    },
  ];

  const validate = (data) => {
    const errors = {};
    if (!String(data.TestName || "").trim()) {
      errors.TestName = "Test name is required.";
    }
    if (!String(data.NormalName || "").trim()) {
      errors.NormalName = "Normal reference range is required.";
    }

    const cost = Number(data.TestCost);
    if (isNaN(cost) || cost <= 0) {
      errors.TestCost = "Test cost must be greater than 0.";
    }

    return errors;
  };

  const transformPayload = (data) => {
    const payload = {
      TestName: String(data.TestName || "").trim(),
      NormalName: String(data.NormalName || "Normal").trim(),
      TestCost: Number(data.TestCost).toFixed(2),
      isActive: data.isActive !== false,
    };
    if (data.DepartmentId) {
      payload.DepartmentId = Number(data.DepartmentId);
    }
    return payload;
  };

  const populateForm = (item) => ({
    TestName: item.TestName || "",
    NormalName: item.NormalName || "",
    TestCost: item.TestCost != null ? String(item.TestCost) : "",
    DepartmentId: item.DepartmentId?.DepartmentId ?? item.DepartmentId ?? "",
    isActive: item.isActive !== false,
  });

  return (
    <ResourceManager
      title="Laboratory Diagnostic Tests"
      itemTitle="Diagnostic Test"
      resource={adminApi.labTests}
      idField="LabtestId"
      columns={columns}
      fields={fields}
      validate={validate}
      transformPayload={transformPayload}
      populateForm={populateForm}
      searchPlaceholder="Search tests by name or reference range..."
    />
  );
}

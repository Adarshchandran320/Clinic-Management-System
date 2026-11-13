import React from "react";
import adminApi from "../../../api/adminApi.js";
import ResourceManager from "../../../components/common/ResourceManager.jsx";

export default function AdminDosagesPage() {
  const columns = [
    {
      key: "DosageId",
      label: "Dosage ID",
      formatter: (val, row) => `#${val ?? row.id ?? "-"}`,
    },
    {
      key: "DosageValue",
      label: "Dosage Value",
      formatter: (val) => (
        <span className="fw-semibold text-primary">{val || "-"}</span>
      ),
    },
    {
      key: "Instructions",
      label: "Administration Instructions",
      formatter: (val) => val || <span className="text-muted">None specified</span>,
    },
  ];

  const fields = [
    {
      name: "DosageValue",
      label: "Dosage Value / Strength",
      type: "text",
      required: true,
      placeholder: "e.g. 500mg, 250mg, 5ml, 1 tablet, 10ml",
      colClass: "col-12 col-md-6",
    },
    {
      name: "Instructions",
      label: "Clinical Instructions / Notes",
      type: "text",
      placeholder: "e.g. After meals, twice daily, with water",
      colClass: "col-12 col-md-6",
    },
  ];

  const validate = (data) => {
    const errors = {};
    if (!String(data.DosageValue || "").trim()) {
      errors.DosageValue = "Dosage value is required.";
    }
    return errors;
  };

  const transformPayload = (data) => ({
    DosageValue: String(data.DosageValue || "").trim(),
    Instructions: String(data.Instructions || "").trim(),
  });

  const populateForm = (item) => ({
    DosageValue: item.DosageValue || "",
    Instructions: item.Instructions || "",
  });

  return (
    <ResourceManager
      title="Dosage Standards"
      itemTitle="Dosage"
      resource={adminApi.dosages}
      idField="DosageId"
      columns={columns}
      fields={fields}
      validate={validate}
      transformPayload={transformPayload}
      populateForm={populateForm}
      searchPlaceholder="Search dosages by strength or instructions..."
    />
  );
}

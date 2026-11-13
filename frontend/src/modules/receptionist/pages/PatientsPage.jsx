import React from "react";
import receptionistApi from "../../../api/receptionistApi.js";
import ResourceManager from "../../../components/common/ResourceManager.jsx";

const PATIENT_COLUMNS = [
  { key: "PatientId", label: "ID", formatter: (val, row) => `#${val ?? row.id ?? "-"}` },
  {
    key: "Name",
    label: "Patient Name",
    formatter: (val, row) => (
      <span className="fw-semibold text-primary">{val || row.name || "-"}</span>
    ),
  },
  {
    key: "Gender",
    label: "Gender",
    formatter: (val, row) => val || row.gender || "-",
  },
  {
    key: "DOB",
    label: "Date of Birth",
    formatter: (val, row) => val || row.dob || "-",
  },
  {
    key: "PhoneNumber",
    label: "Phone",
    formatter: (val, row) => val || row.phone || "-",
  },
  {
    key: "BloodGroup",
    label: "Blood Group",
    formatter: (val, row) => (
      <span className="badge bg-light text-dark border">
        {val || row.blood_group || "-"}
      </span>
    ),
  },
  {
    key: "Weight",
    label: "Weight",
    formatter: (val, row) => {
      const v = val ?? row.weight;
      return v !== undefined && v !== null && v !== "" ? `${v} kg` : "-";
    },
  },
  {
    key: "Height",
    label: "Height",
    formatter: (val, row) => {
      const v = val ?? row.height;
      return v !== undefined && v !== null && v !== "" ? `${v} cm` : "-";
    },
  },
  {
    key: "Address",
    label: "Address",
    formatter: (val, row) => (
      <span className="text-muted small text-truncate d-inline-block" style={{ maxWidth: "160px" }}>
        {val || row.address || "-"}
      </span>
    ),
  },
];

const PATIENT_FIELDS = [
  {
    name: "Name",
    label: "Full Name",
    type: "text",
    required: true,
    placeholder: "e.g. John Doe",
    colClass: "col-12 col-md-6",
  },
  {
    name: "Gender",
    label: "Gender",
    type: "select",
    options: ["Male", "Female", "Other"],
    defaultValue: "Male",
    required: true,
    colClass: "col-12 col-md-6",
  },
  {
    name: "DOB",
    label: "Date of Birth",
    type: "date",
    required: true,
    help: "Must not be in the future, max 100 years ago.",
    colClass: "col-12 col-md-6",
  },
  {
    name: "PhoneNumber",
    label: "Phone Number",
    type: "text",
    required: true,
    placeholder: "e.g. 9876543210 (7-15 digits)",
    colClass: "col-12 col-md-6",
  },
  {
    name: "BloodGroup",
    label: "Blood Group",
    type: "select",
    options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    defaultValue: "O+",
    required: true,
    colClass: "col-12 col-md-4",
  },
  {
    name: "Weight",
    label: "Weight (kg)",
    type: "number",
    step: "0.1",
    min: "0.5",
    max: "500",
    required: true,
    placeholder: "e.g. 68.5",
    colClass: "col-12 col-md-4",
  },
  {
    name: "Height",
    label: "Height (cm)",
    type: "number",
    step: "0.1",
    min: "10",
    max: "300",
    required: true,
    placeholder: "e.g. 172.0",
    colClass: "col-12 col-md-4",
  },
  {
    name: "Address",
    label: "Residential Address",
    type: "textarea",
    rows: 2,
    required: true,
    placeholder: "e.g. 123 Main Street, Springfield",
    colClass: "col-12",
  },
];

function validatePatient(data) {
  const errors = {};
  if (!data.Name || data.Name.trim().length < 3) {
    errors.Name = "Name must be at least 3 characters and contain only letters and spaces.";
  }
  const digits = String(data.PhoneNumber || "").replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    errors.PhoneNumber = "Phone number must be between 7 and 15 digits.";
  }
  if (!data.DOB) {
    errors.DOB = "Date of birth is required.";
  } else {
    const d = new Date(data.DOB);
    const today = new Date();
    if (d > today) {
      errors.DOB = "Date of birth cannot be in the future.";
    }
  }
  if (!data.BloodGroup) {
    errors.BloodGroup = "Blood group is required.";
  }
  if (data.Weight === undefined || data.Weight === "" || Number(data.Weight) <= 0) {
    errors.Weight = "Weight must be greater than 0 kg.";
  }
  if (data.Height === undefined || data.Height === "" || Number(data.Height) <= 0) {
    errors.Height = "Height must be greater than 0 cm.";
  }
  if (!data.Address || data.Address.trim().length === 0) {
    errors.Address = "Address is required.";
  }
  return errors;
}

export default function PatientsPage() {
  const transformPayload = (data) => ({
    Name: (data.Name || "").trim(),
    Gender: data.Gender || "Male",
    DOB: data.DOB,
    PhoneNumber: (data.PhoneNumber || "").trim(),
    BloodGroup: data.BloodGroup,
    Weight: parseFloat(data.Weight),
    Height: parseFloat(data.Height),
    Address: (data.Address || "").trim(),
  });

  const populateForm = (item) => ({
    Name: item.Name ?? item.name ?? "",
    Gender: item.Gender ?? item.gender ?? "Male",
    DOB: item.DOB ?? item.dob ?? "",
    PhoneNumber: item.PhoneNumber ?? item.phone ?? item.contact_number ?? "",
    BloodGroup: item.BloodGroup ?? item.blood_group ?? "O+",
    Weight: item.Weight ?? item.weight ?? "",
    Height: item.Height ?? item.height ?? "",
    Address: item.Address ?? item.address ?? "",
  });

  return (
    <ResourceManager
      title="Patient Registry"
      itemTitle="Patient"
      resource={receptionistApi.patients}
      idField="PatientId"
      columns={PATIENT_COLUMNS}
      fields={PATIENT_FIELDS}
      validate={validatePatient}
      transformPayload={transformPayload}
      populateForm={populateForm}
      searchPlaceholder="Search patients by name, phone, or blood group..."
    />
  );
}

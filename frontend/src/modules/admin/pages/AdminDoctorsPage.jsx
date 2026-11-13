import React, { useMemo } from "react";
import adminApi from "../../../api/adminApi.js";
import ResourceManager from "../../../components/common/ResourceManager.jsx";
import StatusBadge from "../../../components/common/StatusBadge.jsx";
import useLookups from "../../../hooks/useLookups.js";

export default function AdminDoctorsPage() {
  const { lookups } = useLookups({
    departments: adminApi.departments,
    users: adminApi.users,
  });

  const departmentOptions = useMemo(() => {
    return (lookups.departments || []).map((d) => ({
      value: d.DepartmentId ?? d.id,
      label: d.DepartmentName ?? d.name,
    }));
  }, [lookups.departments]);

  const userOptions = useMemo(() => {
    return (lookups.users || []).map((u) => ({
      value: u.UserId ?? u.id,
      label: `${u.Username} (#${u.UserId ?? u.id})`,
    }));
  }, [lookups.users]);

  const columns = [
    {
      key: "DoctorId",
      label: "Doctor ID",
      formatter: (val, row) => `#${val ?? row.id ?? "-"}`,
    },
    {
      key: "Name",
      label: "Doctor Name",
      formatter: (val) => (
        <span className="fw-semibold text-primary">Dr. {val || "-"}</span>
      ),
    },
    {
      key: "DepartmentName",
      label: "Department",
      formatter: (val, row) => (
        <span className="badge bg-info-subtle text-info border">
          {val || row.department || "-"}
        </span>
      ),
    },
    {
      key: "Specialization",
      label: "Specialization",
      formatter: (val) => val || "-",
    },
    {
      key: "Qualification",
      label: "Qualification",
      formatter: (val) => val || "-",
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
      name: "Name",
      label: "Doctor Name",
      type: "text",
      required: true,
      placeholder: "e.g. Robert Smith",
      colClass: "col-12 col-md-6",
    },
    {
      name: "DepartmentId",
      label: "Department",
      type: "select",
      options: departmentOptions,
      required: true,
      colClass: "col-12 col-md-6",
    },
    {
      name: "UserId",
      label: "Linked User Account",
      type: "select",
      options: userOptions,
      required: true,
      colClass: "col-12 col-md-6",
    },
    {
      name: "Specialization",
      label: "Specialization",
      type: "text",
      required: true,
      placeholder: "e.g. Cardiologist, Dermatologist",
      colClass: "col-12 col-md-6",
    },
    {
      name: "Qualification",
      label: "Qualification",
      type: "text",
      required: true,
      placeholder: "e.g. MBBS, MD (Cardiology)",
      colClass: "col-12 col-md-6",
    },
    {
      name: "isActive",
      label: "Status",
      type: "checkbox",
      defaultValue: true,
      checkboxLabel: "Active Practitioner",
      colClass: "col-12 col-md-6",
    },
  ];

  const validate = (data) => {
    const errors = {};
    if (!String(data.Name || "").trim()) {
      errors.Name = "Doctor name is required.";
    }
    if (!data.DepartmentId) {
      errors.DepartmentId = "Please select a department.";
    }
    if (!data.UserId) {
      errors.UserId = "Please select a linked user account.";
    }
    if (!String(data.Specialization || "").trim()) {
      errors.Specialization = "Specialization is required.";
    }
    if (!String(data.Qualification || "").trim()) {
      errors.Qualification = "Qualification is required.";
    }
    return errors;
  };

  const transformPayload = (data) => ({
    Name: String(data.Name || "").trim(),
    DepartmentId: Number(data.DepartmentId),
    UserId: Number(data.UserId),
    Specialization: String(data.Specialization || "").trim(),
    Qualification: String(data.Qualification || "").trim(),
    isActive: data.isActive !== false,
  });

  const populateForm = (item) => ({
    Name: item.Name || "",
    DepartmentId: item.DepartmentId?.DepartmentId ?? item.DepartmentId ?? "",
    UserId: item.UserId?.UserId ?? item.UserId ?? "",
    Specialization: item.Specialization || "",
    Qualification: item.Qualification || "",
    isActive: item.isActive !== false,
  });

  return (
    <ResourceManager
      title="Doctors Directory"
      itemTitle="Doctor"
      resource={adminApi.doctors}
      idField="DoctorId"
      columns={columns}
      fields={fields}
      validate={validate}
      transformPayload={transformPayload}
      populateForm={populateForm}
      searchPlaceholder="Search doctors by name, specialization, or department..."
    />
  );
}

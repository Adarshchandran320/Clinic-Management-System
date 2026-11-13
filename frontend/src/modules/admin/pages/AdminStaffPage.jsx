import React, { useMemo } from "react";
import adminApi from "../../../api/adminApi.js";
import ResourceManager from "../../../components/common/ResourceManager.jsx";
import useLookups from "../../../hooks/useLookups.js";

function calculateAge(birthDate) {
  if (!birthDate) return 0;
  const today = new Date();
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export default function AdminStaffPage() {
  const { lookups } = useLookups({
    roles: adminApi.roles,
    users: adminApi.users,
  });

  const roleOptions = useMemo(() => {
    return (lookups.roles || []).map((r) => ({
      value: r.RoleId ?? r.id,
      label: r.RoleName ?? r.name,
    }));
  }, [lookups.roles]);

  const userOptions = useMemo(() => {
    return (lookups.users || []).map((u) => ({
      value: u.UserId ?? u.id,
      label: `${u.Username} (#${u.UserId ?? u.id})`,
    }));
  }, [lookups.users]);

  const columns = [
    {
      key: "StaffId",
      label: "Staff ID",
      formatter: (val, row) => `#${val ?? row.id ?? "-"}`,
    },
    {
      key: "Name",
      label: "Staff Name",
      formatter: (val) => (
        <span className="fw-semibold text-primary">{val || "-"}</span>
      ),
    },
    {
      key: "RoleName",
      label: "Role",
      formatter: (val, row) => (
        <span className="badge bg-secondary-subtle text-secondary border">
          {val || row.role || "-"}
        </span>
      ),
    },
    {
      key: "phoneNumber",
      label: "Phone",
      formatter: (val) => val || "-",
    },
    {
      key: "DateofBirth",
      label: "DOB (Age)",
      formatter: (val) => {
        if (!val) return "-";
        const age = calculateAge(val);
        return `${val} (${age} yrs)`;
      },
    },
    {
      key: "DateOfJoining",
      label: "Date of Joining",
      formatter: (val) => val || "-",
    },
    {
      key: "Address",
      label: "Address",
      formatter: (val) => val || "-",
    },
  ];

  const fields = [
    {
      name: "Name",
      label: "Full Name",
      type: "text",
      required: true,
      placeholder: "e.g. Jane Smith",
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
      name: "RoleId",
      label: "Role",
      type: "select",
      options: roleOptions,
      required: true,
      colClass: "col-12 col-md-6",
    },
    {
      name: "phoneNumber",
      label: "Phone Number",
      type: "text",
      required: true,
      placeholder: "10-digit phone number",
      help: "Must contain exactly 10 digits.",
      colClass: "col-12 col-md-6",
    },
    {
      name: "DateofBirth",
      label: "Date of Birth",
      type: "date",
      required: true,
      help: "Age must be between 23 and 56 years.",
      colClass: "col-12 col-md-6",
    },
    {
      name: "DateOfJoining",
      label: "Date of Joining",
      type: "date",
      required: true,
      colClass: "col-12 col-md-6",
    },
    {
      name: "Address",
      label: "Address",
      type: "textarea",
      rows: 2,
      placeholder: "Residential / Staff address",
      colClass: "col-12",
    },
  ];

  const validate = (data) => {
    const errors = {};
    if (!String(data.Name || "").trim()) {
      errors.Name = "Staff name is required.";
    }

    if (!data.UserId) {
      errors.UserId = "Linked user account is required.";
    }

    if (!data.RoleId) {
      errors.RoleId = "Role is required.";
    }

    const phone = String(data.phoneNumber || "").replace(/\D/g, "");
    if (!phone || phone.length !== 10) {
      errors.phoneNumber = "Phone number must contain exactly 10 digits.";
    }

    if (!data.DateofBirth) {
      errors.DateofBirth = "Date of birth is required.";
    } else {
      const age = calculateAge(data.DateofBirth);
      if (age < 23 || age > 56) {
        errors.DateofBirth = `Staff age must be between 23 and 56 years (currently ${age}).`;
      }
    }

    if (!data.DateOfJoining) {
      errors.DateOfJoining = "Date of joining is required.";
    }

    return errors;
  };

  const transformPayload = (data) => ({
    Name: String(data.Name || "").trim(),
    UserId: Number(data.UserId),
    RoleId: Number(data.RoleId),
    phoneNumber: String(data.phoneNumber || "").replace(/\D/g, ""),
    DateofBirth: data.DateofBirth,
    DateOfJoining: data.DateOfJoining,
    Address: String(data.Address || "Clinic Address").trim(),
  });

  const populateForm = (item) => ({
    Name: item.Name || "",
    UserId: item.UserId?.UserId ?? item.UserId ?? "",
    RoleId: item.RoleId?.RoleId ?? item.RoleId ?? "",
    phoneNumber: item.phoneNumber || "",
    DateofBirth: item.DateofBirth || "",
    DateOfJoining: item.DateOfJoining || "",
    Address: item.Address || "",
  });

  return (
    <ResourceManager
      title="Staff Directory"
      itemTitle="Staff Member"
      resource={adminApi.staff}
      idField="StaffId"
      columns={columns}
      fields={fields}
      validate={validate}
      transformPayload={transformPayload}
      populateForm={populateForm}
      searchPlaceholder="Search staff by name, phone, or role..."
    />
  );
}

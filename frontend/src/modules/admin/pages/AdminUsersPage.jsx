import React, { useMemo } from "react";
import adminApi from "../../../api/adminApi.js";
import ResourceManager from "../../../components/common/ResourceManager.jsx";
import StatusBadge from "../../../components/common/StatusBadge.jsx";
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

export default function AdminUsersPage() {
  const { lookups } = useLookups({
    roles: adminApi.roles,
  });

  const roleOptions = useMemo(() => {
    return (lookups.roles || []).map((r) => ({
      value: r.RoleId ?? r.id,
      label: r.RoleName ?? r.name,
    }));
  }, [lookups.roles]);

  const columns = [
    {
      key: "UserId",
      label: "User ID",
      formatter: (val, row) => `#${val ?? row.id ?? "-"}`,
    },
    {
      key: "Name",
      label: "Full Name",
      formatter: (val, row) => (
        <span className="fw-semibold text-primary">{val || row.name || row.Username || "-"}</span>
      ),
    },
    {
      key: "Username",
      label: "Username",
      formatter: (val) => <span className="font-monospace small">{val}</span>,
    },
    {
      key: "RoleName",
      label: "Role",
      formatter: (val, row) => (
        <span className="badge bg-secondary-subtle text-secondary border">
          {val || row.role || "User"}
        </span>
      ),
    },
    {
      key: "phoneNumber",
      label: "Phone",
      formatter: (val, row) => val || row.phone || "-",
    },
    {
      key: "DOB",
      label: "Date of Birth",
      formatter: (val, row) => val || row.DateofBirth || "-",
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
      label: "Full Name",
      type: "text",
      required: true,
      placeholder: "e.g. John Doe",
      colClass: "col-12 col-md-6",
    },
    {
      name: "Username",
      label: "Username",
      type: "text",
      required: true,
      placeholder: "e.g. jdoe (no spaces)",
      help: "Must contain no spaces, minimum 3 characters.",
      colClass: "col-12 col-md-6",
    },
    {
      name: "Password",
      label: "Password",
      type: "password",
      placeholder: "Leave blank to keep existing password on edit",
      help: "Required when creating a new user (minimum 4 characters).",
      colClass: "col-12 col-md-6",
    },
    {
      name: "RoleId",
      label: "User Role",
      type: "select",
      options: roleOptions,
      required: true,
      colClass: "col-12 col-md-6",
    },
    {
      name: "DOB",
      label: "Date of Birth",
      type: "date",
      required: true,
      help: "Staff age must be between 23 and 56 years.",
      colClass: "col-12 col-md-6",
    },
    {
      name: "phoneNumber",
      label: "Phone Number",
      type: "text",
      required: true,
      placeholder: "e.g. 9876543210 (10 digits)",
      help: "Must contain exactly 10 digits.",
      colClass: "col-12 col-md-6",
    },
    {
      name: "Address",
      label: "Residential Address",
      type: "textarea",
      rows: 2,
      placeholder: "e.g. 123 Main Street, Suite 4",
      colClass: "col-12",
    },
    {
      name: "isActive",
      label: "Account Active",
      type: "checkbox",
      defaultValue: true,
      checkboxLabel: "Active User Account",
      colClass: "col-12",
    },
  ];

  const validate = (data) => {
    const errors = {};
    const username = String(data.Username || "").trim();
    if (!username) {
      errors.Username = "Username is required.";
    } else if (username.includes(" ")) {
      errors.Username = "Username cannot contain spaces.";
    } else if (username.length < 3) {
      errors.Username = "Username must be at least 3 characters.";
    }

    if (!data.RoleId) {
      errors.RoleId = "Please select a role.";
    }

    // Phone 10 digits validation
    const phone = String(data.phoneNumber || "").replace(/\D/g, "");
    if (!phone || phone.length !== 10) {
      errors.phoneNumber = "Phone number must contain exactly 10 digits.";
    }

    // Age 23-56 validation
    if (!data.DOB) {
      errors.DOB = "Date of birth is required.";
    } else {
      const age = calculateAge(data.DOB);
      if (age < 23 || age > 56) {
        errors.DOB = `Staff age must be between 23 and 56 years (currently ${age}).`;
      }
    }

    return errors;
  };

  const transformPayload = (data, isEdit) => {
    const payload = {
      Username: String(data.Username || "").trim().replace(/\s+/g, ""),
      RoleId: Number(data.RoleId),
      isActive: data.isActive !== false,
      Name: (data.Name || "").trim(),
      phoneNumber: String(data.phoneNumber || "").replace(/\D/g, ""),
      DOB: data.DOB,
      DateofBirth: data.DOB,
      Address: (data.Address || "Clinic Address").trim(),
    };

    if (data.Password && data.Password.trim()) {
      payload.Password = data.Password.trim();
    } else if (!isEdit) {
      payload.Password = "";
    }

    return payload;
  };

  const populateForm = (item) => ({
    Name: item.Name ?? item.name ?? "",
    Username: item.Username ?? item.username ?? "",
    Password: "",
    RoleId: item.RoleId ?? item.role_id ?? "",
    DOB: item.DOB ?? item.DateofBirth ?? "",
    phoneNumber: item.phoneNumber ?? item.phone ?? "",
    Address: item.Address ?? item.address ?? "",
    isActive: item.isActive !== false,
  });

  return (
    <ResourceManager
      title="User & Staff Management"
      itemTitle="User"
      resource={adminApi.users}
      idField="UserId"
      columns={columns}
      fields={fields}
      validate={validate}
      transformPayload={transformPayload}
      populateForm={populateForm}
      searchPlaceholder="Search users by name, username, phone..."
    />
  );
}

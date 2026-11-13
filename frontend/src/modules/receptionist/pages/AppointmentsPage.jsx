import React from "react";
import receptionistApi from "../../../api/receptionistApi.js";
import doctorApi from "../../../api/doctorApi.js";
import adminApi from "../../../api/adminApi.js";
import ResourceManager from "../../../components/common/ResourceManager.jsx";
import StatusBadge from "../../../components/common/StatusBadge.jsx";
import useLookups from "../../../hooks/useLookups.js";

export default function AppointmentsPage() {
  const { lookups, loading: lookupsLoading } = useLookups({
    patients: receptionistApi.patients,
    doctors: doctorApi.doctors,
    departments: adminApi.departments,
  });

  const patientMap = React.useMemo(() => {
    const map = {};
    (lookups.patients || []).forEach((p) => {
      const id = p.PatientId ?? p.id;
      map[id] = p.Name ?? p.name ?? `Patient #${id}`;
    });
    return map;
  }, [lookups.patients]);

  const doctorMap = React.useMemo(() => {
    const map = {};
    (lookups.doctors || []).forEach((d) => {
      const id = d.DoctorId ?? d.id;
      map[id] = d.Name ?? d.name ?? `Doctor #${id}`;
    });
    return map;
  }, [lookups.doctors]);

  const departmentMap = React.useMemo(() => {
    const map = {};
    (lookups.departments || []).forEach((dep) => {
      const id = dep.DepartmentId ?? dep.id;
      map[id] = dep.DepartmentName ?? dep.name ?? `Dept #${id}`;
    });
    return map;
  }, [lookups.departments]);

  const patientOptions = (lookups.patients || []).map((p) => {
    const id = p.PatientId ?? p.id;
    return {
      value: id,
      label: `${p.Name ?? p.name ?? "Patient"} (#${id}) - ${p.PhoneNumber || p.phone || ""}`,
    };
  });

  const doctorOptions = (lookups.doctors || []).map((d) => {
    const id = d.DoctorId ?? d.id;
    return {
      value: id,
      label: `Dr. ${d.Name ?? d.name} (${d.Specialization || "General"})`,
    };
  });

  const departmentOptions = (lookups.departments || []).map((dep) => {
    const id = dep.DepartmentId ?? dep.id;
    return {
      value: id,
      label: dep.DepartmentName ?? dep.name,
    };
  });

  const columns = [
    {
      key: "AppointmentId",
      label: "ID",
      formatter: (val, row) => `#${val ?? row.id ?? "-"}`,
    },
    {
      key: "PatientId",
      label: "Patient",
      formatter: (val, row) => {
        const id = val ?? row.patient;
        return (
          <span className="fw-semibold text-primary">
            {patientMap[id] || row.patient_name || (id ? `Patient #${id}` : "-")}
          </span>
        );
      },
    },
    {
      key: "DoctorId",
      label: "Doctor",
      formatter: (val, row) => {
        const id = val ?? row.doctor;
        return (
          <span className="fw-semibold">
            {doctorMap[id] ? `Dr. ${doctorMap[id]}` : row.doctor_name || (id ? `Dr. #${id}` : "-")}
          </span>
        );
      },
    },
    {
      key: "DepartmentId",
      label: "Department",
      formatter: (val, row) => {
        const id = val ?? row.department;
        return departmentMap[id] || (id ? `Dept #${id}` : "-");
      },
    },
    {
      key: "AppointmentDateTime",
      label: "Date & Time",
      formatter: (val, row) => {
        const dt = val || row.appointment_date || row.created_at;
        if (!dt) return "-";
        try {
          return new Date(dt).toLocaleString();
        } catch {
          return String(dt);
        }
      },
    },
    {
      key: "AppointmentStatus",
      label: "Status",
      formatter: (val, row) => (
        <StatusBadge status={val || row.status || "Scheduled"} />
      ),
    },
  ];

  const fields = [
    {
      name: "PatientId",
      label: "Patient",
      type: "select",
      options: patientOptions,
      required: true,
      colClass: "col-12 col-md-6",
    },
    {
      name: "DoctorId",
      label: "Doctor",
      type: "select",
      options: doctorOptions,
      required: true,
      colClass: "col-12 col-md-6",
    },
    {
      name: "DepartmentId",
      label: "Department",
      type: "select",
      options: departmentOptions,
      help: "Leave empty to auto-derive from selected Doctor",
      colClass: "col-12 col-md-6",
    },
    {
      name: "AppointmentDateTime",
      label: "Appointment Date & Time",
      type: "datetime-local",
      required: true,
      colClass: "col-12 col-md-6",
    },
    {
      name: "AppointmentStatus",
      label: "Status",
      type: "select",
      options: ["Scheduled", "Waiting", "Completed", "Cancelled"],
      defaultValue: "Scheduled",
      required: true,
      colClass: "col-12 col-md-6",
    },
  ];

  const transformPayload = (data) => {
    let deptId = data.DepartmentId ? Number(data.DepartmentId) : undefined;
    if (!deptId && data.DoctorId) {
      const doc = (lookups.doctors || []).find(
        (d) => String(d.DoctorId ?? d.id) === String(data.DoctorId)
      );
      if (doc && (doc.DepartmentId || doc.DepartmentId_id)) {
        deptId = doc.DepartmentId?.DepartmentId ?? doc.DepartmentId_id ?? doc.DepartmentId;
      }
    }

    return {
      PatientId: Number(data.PatientId),
      DoctorId: Number(data.DoctorId),
      ...(deptId ? { DepartmentId: Number(deptId) } : {}),
      AppointmentDateTime: data.AppointmentDateTime,
      AppointmentStatus: data.AppointmentStatus || "Scheduled",
    };
  };

  const populateForm = (item) => {
    let dt = item.AppointmentDateTime || item.appointment_date || "";
    if (dt && dt.includes("Z")) {
      dt = dt.slice(0, 16);
    } else if (dt && dt.length > 16) {
      dt = dt.slice(0, 16);
    }
    return {
      PatientId: item.PatientId ?? item.patient ?? "",
      DoctorId: item.DoctorId ?? item.doctor ?? "",
      DepartmentId: item.DepartmentId ?? item.department ?? "",
      AppointmentDateTime: dt,
      AppointmentStatus: item.AppointmentStatus ?? item.status ?? "Scheduled",
    };
  };

  const validate = (data) => {
    const errors = {};
    if (!data.PatientId) errors.PatientId = "Please select a patient.";
    if (!data.DoctorId) errors.DoctorId = "Please select a doctor.";
    if (!data.AppointmentDateTime) errors.AppointmentDateTime = "Please pick date and time.";
    return errors;
  };

  const actions = [
    {
      label: "Check In",
      icon: "bi-check2-circle",
      variant: "outline-success",
      show: (row) =>
        (row.AppointmentStatus || row.status) === "Scheduled",
      onClick: async (row) => {
        const id = row.AppointmentId ?? row.id;
        await receptionistApi.appointments.patch(id, {
          AppointmentStatus: "Waiting",
        });
        window.location.reload();
      },
    },
    {
      label: "Cancel",
      icon: "bi-x-circle",
      variant: "outline-secondary",
      show: (row) =>
        (row.AppointmentStatus || row.status) !== "Cancelled" &&
        (row.AppointmentStatus || row.status) !== "Completed",
      onClick: async (row) => {
        const id = row.AppointmentId ?? row.id;
        await receptionistApi.appointments.patch(id, {
          AppointmentStatus: "Cancelled",
        });
        window.location.reload();
      },
    },
  ];

  return (
    <ResourceManager
      title="Appointment Scheduling"
      itemTitle="Appointment"
      resource={receptionistApi.appointments}
      idField="AppointmentId"
      columns={columns}
      fields={fields}
      validate={validate}
      transformPayload={transformPayload}
      populateForm={populateForm}
      actions={actions}
      searchPlaceholder="Search appointments..."
    />
  );
}

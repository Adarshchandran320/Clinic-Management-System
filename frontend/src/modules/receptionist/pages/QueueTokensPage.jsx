import React from "react";
import receptionistApi from "../../../api/receptionistApi.js";
import doctorApi from "../../../api/doctorApi.js";
import ResourceManager from "../../../components/common/ResourceManager.jsx";
import StatusBadge from "../../../components/common/StatusBadge.jsx";
import useLookups from "../../../hooks/useLookups.js";

export default function QueueTokensPage() {
  const { lookups, loading: lookupsLoading } = useLookups({
    appointments: receptionistApi.appointments,
    patients: receptionistApi.patients,
    doctors: doctorApi.doctors,
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

  const appointmentOptions = (lookups.appointments || []).map((a) => {
    const id = a.AppointmentId ?? a.id;
    const patName = patientMap[a.PatientId ?? a.patient] || a.patient_name || "";
    const docName = doctorMap[a.DoctorId ?? a.doctor] || a.doctor_name || "";
    return {
      value: id,
      label: `Appt #${id} - ${patName} with Dr. ${docName} (${a.AppointmentStatus || a.status || "Scheduled"})`,
    };
  });

  const patientOptions = (lookups.patients || []).map((p) => {
    const id = p.PatientId ?? p.id;
    return {
      value: id,
      label: `${p.Name ?? p.name} (#${id})`,
    };
  });

  const doctorOptions = (lookups.doctors || []).map((d) => {
    const id = d.DoctorId ?? d.id;
    return {
      value: id,
      label: `Dr. ${d.Name ?? d.name}`,
    };
  });

  const columns = [
    {
      key: "TokenNo",
      label: "Token #",
      formatter: (val, row) => (
        <span className="fw-bold text-primary fs-6">
          #{val ?? row.token_number ?? row.token_no ?? row.id}
        </span>
      ),
    },
    {
      key: "AppointmentId",
      label: "Appointment",
      formatter: (val, row) => `#${val ?? row.appointment ?? "-"}`,
    },
    {
      key: "PatientId",
      label: "Patient",
      formatter: (val, row) => {
        const id = val ?? row.patient;
        return (
          <span className="fw-semibold">
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
        return doctorMap[id] ? `Dr. ${doctorMap[id]}` : row.doctor_name || (id ? `Dr. #${id}` : "-");
      },
    },
    {
      key: "TokenDate",
      label: "Issued Date",
      formatter: (val, row) => {
        const dt = val || row.date;
        if (!dt) return "-";
        try {
          return new Date(dt).toLocaleString();
        } catch {
          return String(dt);
        }
      },
    },
    {
      key: "status",
      label: "Status",
      formatter: (val, row) => (
        <StatusBadge status={val || row.status || "Waiting"} />
      ),
    },
  ];

  const fields = [
    {
      name: "AppointmentId",
      label: "Appointment",
      type: "select",
      options: appointmentOptions,
      required: true,
      colClass: "col-12",
      help: "Select the scheduled appointment to issue a queue token.",
    },
    {
      name: "PatientId",
      label: "Patient (Auto-derived if blank)",
      type: "select",
      options: patientOptions,
      colClass: "col-12 col-md-6",
    },
    {
      name: "DoctorId",
      label: "Doctor (Auto-derived if blank)",
      type: "select",
      options: doctorOptions,
      colClass: "col-12 col-md-6",
    },
  ];

  const transformPayload = (data) => {
    const payload = {
      AppointmentId: Number(data.AppointmentId),
    };

    if (data.PatientId) {
      payload.PatientId = Number(data.PatientId);
    }
    if (data.DoctorId) {
      payload.DoctorId = Number(data.DoctorId);
    }

    // Auto-fill from appointment lookup if not provided
    if ((!payload.PatientId || !payload.DoctorId) && lookups.appointments) {
      const appt = lookups.appointments.find(
        (a) => String(a.AppointmentId ?? a.id) === String(data.AppointmentId)
      );
      if (appt) {
        if (!payload.PatientId) payload.PatientId = appt.PatientId ?? appt.patient;
        if (!payload.DoctorId) payload.DoctorId = appt.DoctorId ?? appt.doctor;
      }
    }

    return payload;
  };

  const populateForm = (item) => ({
    AppointmentId: item.AppointmentId ?? item.appointment ?? "",
    PatientId: item.PatientId ?? item.patient ?? "",
    DoctorId: item.DoctorId ?? item.doctor ?? "",
  });

  const validate = (data) => {
    const errors = {};
    if (!data.AppointmentId) {
      errors.AppointmentId = "Appointment is required to issue a token.";
    }
    return errors;
  };

  return (
    <ResourceManager
      title="Queue & Tokens"
      itemTitle="Token"
      resource={receptionistApi.tokens}
      idField="TokenNo"
      columns={columns}
      fields={fields}
      validate={validate}
      transformPayload={transformPayload}
      populateForm={populateForm}
      searchPlaceholder="Search tokens by number, patient, or doctor..."
    />
  );
}

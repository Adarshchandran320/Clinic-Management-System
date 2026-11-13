import React from "react";
import doctorApi from "../../../api/doctorApi.js";
import receptionistApi from "../../../api/receptionistApi.js";
import ResourceManager from "../../../components/common/ResourceManager.jsx";
import StatusBadge from "../../../components/common/StatusBadge.jsx";
import useLookups from "../../../hooks/useLookups.js";

export default function ConsultationsPage() {
  const { lookups } = useLookups({
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
    const pat = patientMap[a.PatientId ?? a.patient] || a.patient_name || "";
    const doc = doctorMap[a.DoctorId ?? a.doctor] || a.doctor_name || "";
    return {
      value: id,
      label: `Appt #${id} - ${pat} (with Dr. ${doc})`,
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
      key: "ConsultationId",
      label: "ID",
      formatter: (val, row) => `#${val ?? row.id ?? "-"}`,
    },
    {
      key: "AppointmentId",
      label: "Appt #",
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
      key: "Symptoms",
      label: "Symptoms",
      formatter: (val, row) => (
        <span className="small text-truncate d-inline-block" style={{ maxWidth: "150px" }}>
          {val || row.symptoms || "-"}
        </span>
      ),
    },
    {
      key: "Diagnosis",
      label: "Diagnosis",
      formatter: (val, row) => (
        <span className="fw-semibold text-primary small text-truncate d-inline-block" style={{ maxWidth: "160px" }}>
          {val || row.diagnosis || "-"}
        </span>
      ),
    },
    {
      key: "Remarks",
      label: "Remarks",
      formatter: (val, row) => (
        <span className="text-muted small text-truncate d-inline-block" style={{ maxWidth: "140px" }}>
          {val || row.notes || "-"}
        </span>
      ),
    },
    {
      key: "ConsultationStatus",
      label: "Status",
      formatter: (val, row) => (
        <StatusBadge status={val || row.status || "Completed"} />
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
      help: "Select the patient appointment for this consultation.",
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
    {
      name: "Symptoms",
      label: "Symptoms",
      type: "textarea",
      rows: 2,
      required: true,
      placeholder: "e.g. Persistent cough, mild fever for 3 days",
      help: "Minimum 3 characters.",
      colClass: "col-12 col-md-6",
    },
    {
      name: "Diagnosis",
      label: "Diagnosis",
      type: "textarea",
      rows: 2,
      required: true,
      placeholder: "e.g. Acute upper respiratory infection",
      help: "Minimum 3 characters.",
      colClass: "col-12 col-md-6",
    },
    {
      name: "Remarks",
      label: "Doctor Notes & Recommendations",
      type: "textarea",
      rows: 2,
      placeholder: "e.g. Advised rest and hydration, return if fever persists.",
      defaultValue: "Routine consultation",
      colClass: "col-12 col-md-6",
    },
    {
      name: "ConsultationStatus",
      label: "Consultation Status",
      type: "select",
      options: ["Completed", "Follow-up", "Referred", "In Consultation"],
      defaultValue: "Completed",
      required: true,
      colClass: "col-12 col-md-6",
    },
  ];

  const transformPayload = (data) => {
    const payload = {
      AppointmentId: Number(data.AppointmentId),
      Symptoms: (data.Symptoms || "").trim(),
      Diagnosis: (data.Diagnosis || "").trim(),
      Remarks: (data.Remarks || "Routine consultation").trim(),
      ConsultationStatus: data.ConsultationStatus || "Completed",
    };

    if (data.PatientId) payload.PatientId = Number(data.PatientId);
    if (data.DoctorId) payload.DoctorId = Number(data.DoctorId);

    // Auto-fill from appointment if missing
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
    Symptoms: item.Symptoms ?? item.symptoms ?? "",
    Diagnosis: item.Diagnosis ?? item.diagnosis ?? "",
    Remarks: item.Remarks ?? item.notes ?? "",
    ConsultationStatus: item.ConsultationStatus ?? item.status ?? "Completed",
  });

  const validate = (data) => {
    const errors = {};
    if (!data.AppointmentId) errors.AppointmentId = "Appointment is required.";
    if (!data.Symptoms || data.Symptoms.trim().length < 3) {
      errors.Symptoms = "Symptoms must be at least 3 characters.";
    }
    if (!data.Diagnosis || data.Diagnosis.trim().length < 3) {
      errors.Diagnosis = "Diagnosis must be at least 3 characters.";
    }
    return errors;
  };

  return (
    <ResourceManager
      title="Clinical Consultations"
      itemTitle="Consultation"
      resource={doctorApi.consultations}
      idField="ConsultationId"
      columns={columns}
      fields={fields}
      validate={validate}
      transformPayload={transformPayload}
      populateForm={populateForm}
      searchPlaceholder="Search consultations by symptoms, diagnosis, or patient..."
    />
  );
}

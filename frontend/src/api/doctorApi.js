import makeResource from "./resources.js";

/**
 * Doctor API client built on makeResource.
 * Exposes CRUD resources matching Django /api/doctor/ endpoints:
 * - doctors (/api/doctor/doctors/)
 * - consultations (/api/doctor/consultations/)
 * - prescriptions (/api/doctor/prescriptions/)
 * - prescriptionItems (/api/doctor/prescription-items/)
 * - labPrescriptions (/api/doctor/lab-prescriptions/)
 */
export const doctorApi = {
  doctors: makeResource("/doctor/doctors/"),
  consultations: makeResource("/doctor/consultations/"),
  prescriptions: makeResource("/doctor/prescriptions/"),
  prescriptionItems: makeResource("/doctor/prescription-items/"),
  labPrescriptions: makeResource("/doctor/lab-prescriptions/"),
  waitingQueue: makeResource("/doctor/queue/"),
  appointments: makeResource("/doctor/appointments/"),
  labReports: makeResource("/doctor/lab-reports/"),
};

export default doctorApi;

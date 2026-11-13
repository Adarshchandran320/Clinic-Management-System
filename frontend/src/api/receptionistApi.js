import makeResource from "./resources.js";

/**
 * Receptionist API client built on makeResource.
 * Exposes CRUD resources matching Django /api/receptionist/ endpoints:
 * - patients (/api/receptionist/patients/)
 * - appointments (/api/receptionist/appointments/)
 * - tokens (/api/receptionist/tokens/)
 * - bills (/api/receptionist/bills/)
 * - payments (/api/receptionist/payments/)
 */
export const receptionistApi = {
  patients: makeResource("/receptionist/patients/"),
  appointments: makeResource("/receptionist/appointments/"),
  tokens: makeResource("/receptionist/tokens/"),
  bills: makeResource("/receptionist/bills/"),
  payments: makeResource("/receptionist/payments/"),
};

export default receptionistApi;

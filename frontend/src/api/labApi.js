import makeResource from "./resources.js";

/**
 * Lab Technician API client built on makeResource.
 * Exposes CRUD resources matching Django /api/lab/ endpoints:
 * - labPrescriptions (/api/lab/lab-prescriptions/)
 * - labReports (/api/lab/lab-reports/)
 * - labTests (/api/lab/lab-tests/)
 */
export const labApi = {
  labPrescriptions: makeResource("/lab/lab-prescriptions/"),
  labReports: makeResource("/lab/lab-reports/"),
  labTests: makeResource("/lab/lab-tests/"),
};

export default labApi;

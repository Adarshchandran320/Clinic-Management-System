import axiosClient from "./axiosClient.js";
import makeResource from "./resources.js";

/**
 * Admin API client built on makeResource.
 * Exposes CRUD resources matching Django /api/admin/ endpoints:
 * - users (/api/admin/users/)
 * - roles (/api/admin/roles/)
 * - departments (/api/admin/departments/)
 * - staff (/api/admin/staff/)
 * - doctors (/api/admin/doctors/)
 * - labTests (/api/admin/lab-tests/)
 * - medicines (/api/admin/medicines/)
 * - auditLogs (/api/admin/audit-logs/)
 * - appointments (/api/admin/appointments/)
 * - patients (/api/admin/patients/)
 * - dosages (/api/admin/dosages/)
 * - getDashboard (/api/admin/dashboard/)
 */
export const adminApi = {
  users: makeResource("/admin/users/"),
  roles: makeResource("/admin/roles/"),
  departments: makeResource("/admin/departments/"),
  staff: makeResource("/admin/staff/"),
  doctors: makeResource("/admin/doctors/"),
  labTests: makeResource("/admin/lab-tests/"),
  medicines: makeResource("/admin/medicines/"),
  auditLogs: makeResource("/admin/audit-logs/"),
  appointments: makeResource("/admin/appointments/"),
  patients: makeResource("/admin/patients/"),
  dosages: makeResource("/admin/dosages/"),

  getDashboard: async (params = {}) => {
    const res = await axiosClient.get("/admin/dashboard/", { params });
    return res.data;
  },
};

export default adminApi;

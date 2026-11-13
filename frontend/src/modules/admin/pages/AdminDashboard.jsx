import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import adminApi from "../../../api/adminApi.js";
import Loader from "../../../components/common/Loader.jsx";
import EmptyState from "../../../components/common/EmptyState.jsx";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [users, setUsers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Concurrently query list endpoints to compute real-time KPIs
      const [uRes, dRes, depRes, sRes, ltRes, mRes, aRes] = await Promise.allSettled([
        adminApi.users.list(),
        adminApi.doctors.list(),
        adminApi.departments.list(),
        adminApi.staff.list(),
        adminApi.labTests.list(),
        adminApi.medicines.list(),
        adminApi.auditLogs.list(),
      ]);

      if (uRes.status === "fulfilled") setUsers(uRes.value.results || uRes.value.data || []);
      if (dRes.status === "fulfilled") setDoctors(dRes.value.results || dRes.value.data || []);
      if (depRes.status === "fulfilled") setDepartments(depRes.value.results || depRes.value.data || []);
      if (sRes.status === "fulfilled") setStaff(sRes.value.results || sRes.value.data || []);
      if (ltRes.status === "fulfilled") setLabTests(ltRes.value.results || ltRes.value.data || []);
      if (mRes.status === "fulfilled") setMedicines(mRes.value.results || mRes.value.data || []);
      if (aRes.status === "fulfilled") setAuditLogs(aRes.value.results || aRes.value.data || []);
    } catch (err) {
      setError(err?.message || "Failed to load administrative dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) return <Loader text="Computing administrative KPIs..." />;

  // 8 KPIs computed from list endpoints
  const totalUsers = users.length;
  const totalDoctors = doctors.length;
  const totalDepartments = departments.length;
  const totalStaff = staff.length;
  const totalLabTests = labTests.length;
  const totalMedicines = medicines.length;
  const lowStockCount = medicines.filter(
    (m) => Number(m.Quantity ?? m.QuantityOnHand ?? m.quantity ?? 0) <= 10
  ).length;
  const totalAuditLogs = auditLogs.length;

  const departmentMap = {};
  departments.forEach((d) => {
    departmentMap[d.DepartmentId ?? d.id] = d.DepartmentName ?? d.name;
  });

  const recentDoctors = doctors.slice(0, 5);
  const recentMedicines = medicines.slice(0, 5);

  return (
    <div className="container-fluid py-2">
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Administrative Command Center</h4>
          <span className="text-muted small">
            Live diagnostic KPIs computed dynamically across clinic personnel, departments, and medical inventory.
          </span>
        </div>
        <button className="btn btn-sm btn-outline-secondary" onClick={loadDashboard}>
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger py-2 small mb-3">
          <i className="bi bi-exclamation-triangle-fill me-1"></i> {error}
        </div>
      )}

      {/* 8 Metric KPIs Grid */}
      <div className="row g-3 mb-4">
        {/* KPI 1: Users */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 bg-white">
            <div className="card-body p-3 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small text-uppercase fw-semibold">Total Users</span>
                <h3 className="fw-bold mb-0 mt-1 text-primary">{totalUsers}</h3>
              </div>
              <div className="rounded-circle p-3 bg-primary-subtle text-primary">
                <i className="bi bi-people fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 2: Doctors */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 bg-white">
            <div className="card-body p-3 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small text-uppercase fw-semibold">Doctors</span>
                <h3 className="fw-bold mb-0 mt-1 text-success">{totalDoctors}</h3>
              </div>
              <div className="rounded-circle p-3 bg-success-subtle text-success">
                <i className="bi bi-hospital fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3: Departments */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 bg-white">
            <div className="card-body p-3 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small text-uppercase fw-semibold">Departments</span>
                <h3 className="fw-bold mb-0 mt-1 text-info">{totalDepartments}</h3>
              </div>
              <div className="rounded-circle p-3 bg-info-subtle text-info">
                <i className="bi bi-building fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 4: Staff */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 bg-white">
            <div className="card-body p-3 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small text-uppercase fw-semibold">Staff Members</span>
                <h3 className="fw-bold mb-0 mt-1 text-indigo">{totalStaff}</h3>
              </div>
              <div className="rounded-circle p-3 bg-indigo-subtle text-indigo">
                <i className="bi bi-person-badge fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 5: Lab Tests */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 bg-white">
            <div className="card-body p-3 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small text-uppercase fw-semibold">Lab Tests</span>
                <h3 className="fw-bold mb-0 mt-1 text-teal">{totalLabTests}</h3>
              </div>
              <div className="rounded-circle p-3 bg-teal-subtle text-teal">
                <i className="bi bi-eyedropper fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 6: Medicines */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 bg-white">
            <div className="card-body p-3 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small text-uppercase fw-semibold">Medicines</span>
                <h3 className="fw-bold mb-0 mt-1 text-secondary">{totalMedicines}</h3>
              </div>
              <div className="rounded-circle p-3 bg-secondary-subtle text-secondary">
                <i className="bi bi-capsule fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 7: Low Stock */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 bg-white">
            <div className="card-body p-3 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small text-uppercase fw-semibold">Low Stock Items</span>
                <h3 className={`fw-bold mb-0 mt-1 ${lowStockCount > 0 ? "text-danger" : "text-success"}`}>
                  {lowStockCount}
                </h3>
              </div>
              <div className="rounded-circle p-3 bg-danger-subtle text-danger">
                <i className="bi bi-exclamation-triangle fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 8: Audit Count */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 bg-white">
            <div className="card-body p-3 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small text-uppercase fw-semibold">Audit Logs</span>
                <h3 className="fw-bold mb-0 mt-1 text-dark">{totalAuditLogs}</h3>
              </div>
              <div className="rounded-circle p-3 bg-dark-subtle text-dark">
                <i className="bi bi-journal-text fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Dashboard Panels: Doctors Panel & Medicine Inventory Panel */}
      <div className="row g-3">
        {/* Doctors Panel */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm rounded-3 bg-white h-100">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">
                <i className="bi bi-hospital me-2 text-primary"></i> Doctors Directory
              </h6>
              <Link to="/admin/doctors" className="btn btn-sm btn-link text-decoration-none">
                View All &rarr;
              </Link>
            </div>
            <div className="table-responsive">
              {recentDoctors.length === 0 ? (
                <EmptyState message="No doctors registered." />
              ) : (
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light small text-uppercase text-muted">
                    <tr>
                      <th>Doctor</th>
                      <th>Department</th>
                      <th>Qualification</th>
                      <th>Specialization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDoctors.map((doc) => {
                      const id = doc.DoctorId ?? doc.id;
                      const deptName =
                        departmentMap[doc.DepartmentId] ||
                        doc.DepartmentName ||
                        doc.Department?.DepartmentName ||
                        "-";
                      return (
                        <tr key={id}>
                          <td className="fw-semibold text-primary">Dr. {doc.Name}</td>
                          <td>
                            <span className="badge bg-light text-dark border">{deptName}</span>
                          </td>
                          <td className="small">{doc.Qualification}</td>
                          <td className="small text-muted">{doc.Specialization}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Medicine Inventory Panel */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm rounded-3 bg-white h-100">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">
                <i className="bi bi-capsule me-2 text-primary"></i> Medicine Inventory
              </h6>
              <Link to="/admin/medicines" className="btn btn-sm btn-link text-decoration-none">
                Manage &rarr;
              </Link>
            </div>
            <div className="table-responsive">
              {recentMedicines.length === 0 ? (
                <EmptyState message="No medicines in inventory." />
              ) : (
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light small text-uppercase text-muted">
                    <tr>
                      <th>Medicine</th>
                      <th>Category</th>
                      <th>Stock Quantity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMedicines.map((m) => {
                      const id = m.MedicineId ?? m.id;
                      const qty = Number(m.Quantity ?? m.QuantityOnHand ?? m.quantity ?? 0);
                      const isLow = qty <= 10;
                      const isOut = qty <= 0;

                      return (
                        <tr key={id}>
                          <td className="fw-semibold text-dark">{m.MedicineName}</td>
                          <td className="small text-muted">{m.Category || "General"}</td>
                          <td className="fw-bold">{qty} units</td>
                          <td>
                            {isOut ? (
                              <span className="badge bg-danger">Out of Stock</span>
                            ) : isLow ? (
                              <span className="badge bg-warning text-dark">Low Stock</span>
                            ) : (
                              <span className="badge bg-success">In Stock</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

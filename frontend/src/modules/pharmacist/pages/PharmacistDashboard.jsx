import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import pharmacistApi from "../../../api/pharmacistApi.js";
import {
  StatCard,
  DataTable,
  StatusBadge,
  PageHeader,
  ConfirmModal,
  ErrorAlert,
} from "../../../components/common/index.js";
import PrescriptionDrawer from "../components/PrescriptionDrawer.jsx";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

// Column configs kept in one place per page so backend field names can be adjusted easily
const RECENT_PRESCRIPTION_COLUMNS = (onDispense, onView) => [
  {
    key: "patient_name",
    label: "Patient",
    formatter: (val, row) => (
      <div>
        <div className="fw-semibold">
          {val || row.patient?.name || row.patient || `Patient #${row.id}`}
        </div>
        <div className="text-secondary small">#{row.id}</div>
      </div>
    ),
  },
  {
    key: "medicine_summary",
    label: "Medicine",
    formatter: (val, row) =>
      val ||
      row.medicine_name ||
      row.items?.[0]?.medicine_name ||
      row.items?.[0]?.medicine ||
      "See items",
  },
  {
    key: "doctor_name",
    label: "Prescribed By",
    formatter: (val, row) => val || row.doctor?.name || row.doctor || "-",
  },
  {
    key: "status",
    label: "Status",
    formatter: (val, row) => (
      <StatusBadge status={val || (row.is_dispensed ? "Dispensed" : "Pending")} />
    ),
  },
  {
    key: "actions",
    label: "",
    className: "text-end",
    formatter: (_, row) => {
      const status = String(
        row.status || (row.is_dispensed ? "Dispensed" : "Pending")
      ).toLowerCase();
      const isPending = !status.includes("dispens") && !row.is_dispensed;
      return isPending ? (
        <button
          type="button"
          className="btn btn-sm btn-primary px-3"
          onClick={() => onDispense(row)}
        >
          Dispense
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-sm btn-light border px-3"
          onClick={() => onView(row)}
        >
          View
        </button>
      );
    },
  },
];

const LOW_STOCK_COLUMNS = (onManage) => [
  {
    key: "medicine_name",
    label: "Medicine",
    formatter: (val, row) => (
      <span className="fw-semibold">
        {val || row.name || row.medicine?.name || row.medicine || "-"}
      </span>
    ),
  },
  {
    key: "category",
    label: "Category",
    formatter: (val, row) => val || row.medicine?.category || "-",
  },
  {
    key: "quantity",
    label: "Available Qty",
    formatter: (val, row) => val ?? row.available_qty ?? row.current_stock ?? 0,
  },
  {
    key: "reorder_level",
    label: "Reorder Level",
    formatter: (val, row) => val ?? row.min_stock ?? "-",
  },
  {
    key: "supplier",
    label: "Supplier",
    formatter: (val) => val || "-",
  },
  {
    key: "action",
    label: "",
    className: "text-end",
    formatter: () => (
      <button type="button" className="btn btn-sm btn-primary" onClick={onManage}>
        Reorder
      </button>
    ),
  },
];

export default function PharmacistDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const [medicines, setMedicines] = useState([]);
  const [stock, setStock] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reorderItems, setReorderItems] = useState([]);
  const [revenueData, setRevenueData] = useState(null);

  // Dispense modal & drawer states
  const [dispenseTarget, setDispenseTarget] = useState(null);
  const [dispensing, setDispensing] = useState(false);
  const [dispenseError, setDispenseError] = useState(null);

  const [drawerItem, setDrawerItem] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [medsRes, stockRes, prescRes, reorderRes, revRes] =
        await Promise.allSettled([
          pharmacistApi.getMedicines(),
          pharmacistApi.getStock(),
          pharmacistApi.getPrescriptions(),
          pharmacistApi.getReorderReport(),
          pharmacistApi.getRevenueReport(),
        ]);

      if (medsRes.status === "fulfilled") setMedicines(medsRes.value);
      if (stockRes.status === "fulfilled") setStock(stockRes.value);
      if (prescRes.status === "fulfilled") setPrescriptions(prescRes.value);
      if (reorderRes.status === "fulfilled") setReorderItems(reorderRes.value);
      if (revRes.status === "fulfilled") setRevenueData(revRes.value);

      const firstRejected = [medsRes, stockRes, prescRes, reorderRes, revRes].find(
        (r) => r.status === "rejected"
      );
      if (
        firstRejected &&
        medsRes.status === "rejected" &&
        stockRes.status === "rejected"
      ) {
        setError(firstRejected.reason);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleOpenDrawer = async (row) => {
    setDrawerItem(row);
    setDrawerError(null);
    setDrawerLoading(true);
    try {
      const detail = await pharmacistApi.getPrescriptionById(row.id);
      setDrawerItem(detail);
    } catch (err) {
      setDrawerError(err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleConfirmDispense = async () => {
    if (!dispenseTarget) return;
    setDispensing(true);
    setDispenseError(null);
    try {
      await pharmacistApi.dispensePrescription(dispenseTarget.id);
      setDispenseTarget(null);
      setToastMessage(`Prescription #${dispenseTarget.id} dispensed and billed.`);
      fetchDashboardData();
    } catch (err) {
      setDispenseError(err);
    } finally {
      setDispensing(false);
    }
  };

  // KPI metrics derived from API responses
  const totalMedicines = medicines.length || stock.length;
  const pendingPrescriptions = prescriptions.filter((p) => {
    const s = String(p.status || "").toLowerCase();
    return !s.includes("dispens") && !p.is_dispensed;
  }).length;
  const lowStockCount = reorderItems.length;
  const expiringSoonCount = stock.filter((s) => Boolean(s.expiry_date)).length;

  // Build Bar chart from revenue report response
  const revList = Array.isArray(revenueData)
    ? revenueData
    : revenueData?.daily || revenueData?.results || revenueData?.items || [];
  const barLabels =
    revList.length > 0
      ? revList.map((r) => r.date || r.day || r.label || "-")
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const barValues =
    revList.length > 0
      ? revList.map((r) => Number(r.total_revenue ?? r.revenue ?? r.amount ?? 0))
      : [0, 0, 0, 0, 0, 0, 0];

  const barChartData = {
    labels: barLabels,
    datasets: [
      {
        label: "Revenue",
        data: barValues,
        backgroundColor: "#0E9384",
        borderRadius: 4,
      },
    ],
  };

  // Build Doughnut chart from stock categories
  const categoryMap = {};
  (medicines.length ? medicines : stock).forEach((item) => {
    const cat = item.category || item.medicine_category || "General";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const catLabels = Object.keys(categoryMap);
  const doughnutData = {
    labels: catLabels.length ? catLabels : ["No Stock Data"],
    datasets: [
      {
        data: catLabels.length ? Object.values(categoryMap) : [1],
        backgroundColor: ["#2E37A4", "#0E9384", "#EAB308", "#EC4899", "#94A3B8"],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div>
      <PageHeader
        title="Pharmacist Dashboard"
        actions={
          <>
            <button
              type="button"
              className="btn btn-primary btn-sm px-3"
              onClick={() => navigate("/pharmacist/prescriptions")}
            >
              <i className="bi bi-receipt me-1"></i>Prescriptions Queue
            </button>
            <button
              type="button"
              className="btn btn-light border btn-sm px-3"
              onClick={() => navigate("/pharmacist/stock")}
            >
              <i className="bi bi-box-seam me-1"></i>Manage Stock
            </button>
          </>
        }
      />

      {toastMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="bi bi-check-circle-fill me-2"></i>
          {toastMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setToastMessage("")}
          ></button>
        </div>
      )}

      {error && <ErrorAlert error={error} onRetry={fetchDashboardData} />}

      {/* Row of 4 Preclinic KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Medicines"
            value={totalMedicines}
            badgeText="Active"
            badgeVariant="success"
            subtitle="Catalog & inventory items"
            icon="bi-capsule"
            iconBg="#2E37A4"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Pending Prescriptions"
            value={pendingPrescriptions}
            badgeText="Queue"
            badgeVariant="warning"
            subtitle="Awaiting fulfillment"
            icon="bi-cart3"
            iconBg="#F59E0B"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Low Stock Items"
            value={lowStockCount}
            badgeText="Alert"
            badgeVariant="danger"
            subtitle="Need reordering"
            icon="bi-exclamation-triangle"
            iconBg="#DC2626"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Tracked Batches"
            value={expiringSoonCount}
            badgeText="Stock"
            badgeVariant="info"
            subtitle="Batches with expiry dates"
            icon="bi-calendar-event"
            iconBg="#2563EB"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-8">
          <div className="card h-100">
            <div className="card-header bg-transparent border-bottom d-flex align-items-center justify-content-between py-3">
              <h6 className="fw-bold mb-0">Medicine Sales Trend</h6>
              <span className="text-secondary small">Revenue Report</span>
            </div>
            <div className="card-body">
              <div style={{ height: 260 }}>
                <Bar
                  data={barChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-header bg-transparent border-bottom py-3">
              <h6 className="fw-bold mb-0">Stock by Category</h6>
            </div>
            <div className="card-body d-flex align-items-center justify-content-center">
              <div style={{ height: 240, width: "100%" }}>
                <Doughnut
                  data={doughnutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "65%",
                    plugins: { legend: { position: "bottom" } },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Prescriptions & Low Stock Tables */}
      <div className="row g-3">
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header bg-transparent border-bottom d-flex align-items-center justify-content-between py-3">
              <h6 className="fw-bold mb-0">Recent Prescriptions</h6>
              <button
                type="button"
                className="btn btn-sm btn-light border"
                onClick={() => navigate("/pharmacist/prescriptions")}
              >
                View All
              </button>
            </div>
            <div className="card-body p-0">
              <DataTable
                columns={RECENT_PRESCRIPTION_COLUMNS(
                  (row) => {
                    setDispenseError(null);
                    setDispenseTarget(row);
                  },
                  handleOpenDrawer
                )}
                data={prescriptions.slice(0, 6)}
                loading={loading}
                emptyTitle="No recent prescriptions"
                emptyMessage="Incoming prescriptions from doctors will appear here."
              />
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card">
            <div className="card-header bg-transparent border-bottom d-flex align-items-center justify-content-between py-3">
              <h6 className="fw-bold mb-0">Low Stock Medicines</h6>
              <button
                type="button"
                className="btn btn-sm btn-light border"
                onClick={() => navigate("/pharmacist/stock")}
              >
                Manage Stock
              </button>
            </div>
            <div className="card-body p-0">
              <DataTable
                columns={LOW_STOCK_COLUMNS(() => navigate("/pharmacist/stock"))}
                data={reorderItems.slice(0, 6)}
                loading={loading}
                emptyTitle="All medicines adequately stocked"
                emptyMessage="No items are currently flagged in the reorder report."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dispense Confirmation Modal */}
      <ConfirmModal
        show={Boolean(dispenseTarget)}
        title="Dispense Prescription"
        message={`Dispense prescription #${dispenseTarget?.id} and automatically generate the patient bill?`}
        confirmText="Dispense Now"
        loading={dispensing}
        error={dispenseError}
        onConfirm={handleConfirmDispense}
        onCancel={() => setDispenseTarget(null)}
      />

      {/* Prescription Detail Drawer */}
      <PrescriptionDrawer
        show={Boolean(drawerItem)}
        prescription={drawerItem}
        loading={drawerLoading}
        error={drawerError}
        onClose={() => setDrawerItem(null)}
        onDispenseRequest={(presc) => {
          setDrawerItem(null);
          setDispenseError(null);
          setDispenseTarget(presc);
        }}
      />
    </div>
  );
}

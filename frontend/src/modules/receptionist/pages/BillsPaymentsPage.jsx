import React, { useState } from "react";
import receptionistApi from "../../../api/receptionistApi.js";
import ResourceManager from "../../../components/common/ResourceManager.jsx";
import StatusBadge from "../../../components/common/StatusBadge.jsx";
import useLookups from "../../../hooks/useLookups.js";

export default function BillsPaymentsPage() {
  const [activeTab, setActiveTab] = useState("bills");

  const { lookups } = useLookups({
    patients: receptionistApi.patients,
    bills: receptionistApi.bills,
  });

  const patientMap = React.useMemo(() => {
    const map = {};
    (lookups.patients || []).forEach((p) => {
      const id = p.PatientId ?? p.id;
      map[id] = p.Name ?? p.name ?? `Patient #${id}`;
    });
    return map;
  }, [lookups.patients]);

  const patientOptions = (lookups.patients || []).map((p) => {
    const id = p.PatientId ?? p.id;
    return {
      value: id,
      label: `${p.Name ?? p.name} (#${id})`,
    };
  });

  const billOptions = (lookups.bills || []).map((b) => {
    const id = b.BillId ?? b.id;
    const pat = patientMap[b.PatientId ?? b.patient] || b.patient_name || "";
    return {
      value: id,
      label: `Bill #${id} - ${pat} (Amt: ${b.Amount ?? b.amount}, Status: ${b.BillStatus ?? b.status})`,
    };
  });

  // Bills Config
  const billColumns = [
    {
      key: "BillId",
      label: "Bill #",
      formatter: (val, row) => `#${val ?? row.id ?? "-"}`,
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
      key: "Amount",
      label: "Amount",
      formatter: (val, row) => {
        const amt = val ?? row.amount ?? row.total_amount;
        return <span className="fw-bold text-success">{amt !== undefined ? `₹${amt}` : "-"}</span>;
      },
    },
    {
      key: "BillType",
      label: "Type",
      formatter: (val, row) => val || row.bill_type || "General",
    },
    {
      key: "BillDate",
      label: "Date",
      formatter: (val, row) => {
        const dt = val || row.bill_date;
        if (!dt) return "-";
        try {
          return new Date(dt).toLocaleDateString();
        } catch {
          return String(dt);
        }
      },
    },
    {
      key: "BillStatus",
      label: "Status",
      formatter: (val, row) => (
        <StatusBadge status={val || row.status || (row.is_paid ? "Paid" : "Pending")} />
      ),
    },
  ];

  const billFields = [
    {
      name: "PatientId",
      label: "Patient",
      type: "select",
      options: patientOptions,
      required: true,
      colClass: "col-12 col-md-6",
    },
    {
      name: "Amount",
      label: "Total Amount (₹)",
      type: "number",
      step: "0.01",
      min: "1",
      required: true,
      colClass: "col-12 col-md-6",
    },
    {
      name: "BillType",
      label: "Bill Type",
      type: "select",
      options: ["Consultation", "Lab", "Pharmacy", "General"],
      defaultValue: "Consultation",
      required: true,
      colClass: "col-12 col-md-6",
    },
    {
      name: "BillStatus",
      label: "Bill Status",
      type: "select",
      options: ["Pending", "Paid", "Cancelled"],
      defaultValue: "Pending",
      required: true,
      colClass: "col-12 col-md-6",
    },
    {
      name: "BillDate",
      label: "Bill Date",
      type: "date",
      defaultValue: new Date().toISOString().slice(0, 10),
      required: true,
      colClass: "col-12 col-md-6",
    },
  ];

  const validateBill = (data) => {
    const errors = {};
    if (!data.PatientId) errors.PatientId = "Patient is required.";
    if (!data.Amount || Number(data.Amount) <= 0) errors.Amount = "Amount must be greater than 0.";
    return errors;
  };

  const transformBillPayload = (data) => ({
    PatientId: Number(data.PatientId),
    Amount: parseFloat(data.Amount),
    BillType: data.BillType || "Consultation",
    BillStatus: data.BillStatus || "Pending",
    BillDate: data.BillDate || new Date().toISOString().slice(0, 10),
  });

  const populateBillForm = (item) => ({
    PatientId: item.PatientId ?? item.patient ?? "",
    Amount: item.Amount ?? item.amount ?? "",
    BillType: item.BillType ?? item.bill_type ?? "Consultation",
    BillStatus: item.BillStatus ?? item.status ?? "Pending",
    BillDate: (item.BillDate || item.bill_date || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
  });

  // Payments Config
  const paymentColumns = [
    {
      key: "PaymentId",
      label: "Payment #",
      formatter: (val, row) => `#${val ?? row.id ?? "-"}`,
    },
    {
      key: "BillId",
      label: "Bill #",
      formatter: (val, row) => `#${val ?? row.bill ?? "-"}`,
    },
    {
      key: "Amount",
      label: "Amount Paid",
      formatter: (val, row) => (
        <span className="fw-bold text-success">₹{val ?? row.amount ?? 0}</span>
      ),
    },
    {
      key: "PaymentMethod",
      label: "Method",
      formatter: (val, row) => (
        <span className="badge bg-secondary">{val || row.payment_method || "Cash"}</span>
      ),
    },
    {
      key: "PaymentDate",
      label: "Date",
      formatter: (val, row) => {
        const dt = val || row.payment_date;
        if (!dt) return "-";
        try {
          return new Date(dt).toLocaleDateString();
        } catch {
          return String(dt);
        }
      },
    },
    {
      key: "PaymentStatus",
      label: "Status",
      formatter: (val, row) => (
        <StatusBadge status={val || row.status || "Success"} />
      ),
    },
  ];

  const paymentFields = [
    {
      name: "BillId",
      label: "Bill",
      type: "select",
      options: billOptions,
      required: true,
      colClass: "col-12 col-md-6",
    },
    {
      name: "Amount",
      label: "Payment Amount (₹)",
      type: "number",
      step: "0.01",
      min: "1",
      required: true,
      colClass: "col-12 col-md-6",
    },
    {
      name: "PaymentMethod",
      label: "Payment Method",
      type: "select",
      options: ["Cash", "Card", "UPI", "Insurance", "Online"],
      defaultValue: "Cash",
      required: true,
      colClass: "col-12 col-md-6",
    },
    {
      name: "PaymentDate",
      label: "Payment Date",
      type: "date",
      defaultValue: new Date().toISOString().slice(0, 10),
      required: true,
      colClass: "col-12 col-md-6",
    },
    {
      name: "PaymentStatus",
      label: "Payment Status",
      type: "select",
      options: ["Success", "Pending", "Failed"],
      defaultValue: "Success",
      required: true,
      colClass: "col-12 col-md-6",
    },
  ];

  const validatePayment = (data) => {
    const errors = {};
    if (!data.BillId) errors.BillId = "Bill is required.";
    if (!data.Amount || Number(data.Amount) <= 0) errors.Amount = "Amount must be greater than 0.";
    return errors;
  };

  const transformPaymentPayload = (data) => ({
    BillId: Number(data.BillId),
    Amount: parseFloat(data.Amount),
    PaymentMethod: data.PaymentMethod || "Cash",
    PaymentDate: data.PaymentDate || new Date().toISOString().slice(0, 10),
    PaymentStatus: data.PaymentStatus || "Success",
  });

  const populatePaymentForm = (item) => ({
    BillId: item.BillId ?? item.bill ?? "",
    Amount: item.Amount ?? item.amount ?? "",
    PaymentMethod: item.PaymentMethod ?? item.payment_method ?? "Cash",
    PaymentDate: (item.PaymentDate || item.payment_date || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
    PaymentStatus: item.PaymentStatus ?? item.status ?? "Success",
  });

  return (
    <div className="container-fluid py-2">
      <ul className="nav nav-pills mb-3 border-bottom pb-2">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "bills" ? "active" : ""}`}
            onClick={() => setActiveTab("bills")}
          >
            <i className="bi bi-receipt me-1"></i> Patient Bills
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "payments" ? "active" : ""}`}
            onClick={() => setActiveTab("payments")}
          >
            <i className="bi bi-credit-card me-1"></i> Payments Received
          </button>
        </li>
      </ul>

      {activeTab === "bills" ? (
        <ResourceManager
          title="Patient Billing"
          itemTitle="Bill"
          resource={receptionistApi.bills}
          idField="BillId"
          columns={billColumns}
          fields={billFields}
          validate={validateBill}
          transformPayload={transformBillPayload}
          populateForm={populateBillForm}
          searchPlaceholder="Search bills by patient or bill ID..."
        />
      ) : (
        <ResourceManager
          title="Payment Ledger"
          itemTitle="Payment"
          resource={receptionistApi.payments}
          idField="PaymentId"
          columns={paymentColumns}
          fields={paymentFields}
          validate={validatePayment}
          transformPayload={transformPaymentPayload}
          populateForm={populatePaymentForm}
          searchPlaceholder="Search payments by bill or method..."
        />
      )}
    </div>
  );
}

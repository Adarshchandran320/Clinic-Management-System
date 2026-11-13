// Translates the real Django API field names (PascalCase) into the field names
// the generated pages read (snake_case), and back for writes.
// If a serializer field is renamed in the backend, change it HERE only.

export const adaptMedicine = (m) => ({
  id: m.MedicineId,
  name: m.MedicineName,
  medicine_name: m.MedicineName,
  generic_name: m.GenericName,
  manufacturer: m.Manufacturer,
  category: m.Category,
  cost_price: m.CostValue,
  mrp: m.MRP,
  price: m.MRP,
});

export const adaptStock = (s) => ({
  id: s.StockId,
  medicine: s.Medicine,
  medicine_id: s.Medicine,
  medicine_name: s.MedicineName,
  quantity: s.QuantityOnHand,
  available_qty: s.QuantityOnHand,
  reorder_level: s.ReorderLevel,
  unit_price: s.UnitPrice,
  selling_price: s.SellingPrice,
  price: s.SellingPrice,
  last_updated: s.LastUpdated,
});

// Backend Status values: "Not Dispensed" | "Partially Dispensed" | "Dispensed".
// The pages hide the Dispense button when the status text contains "dispens",
// so "Not Dispensed" must be shown as "Pending" and "Partially Dispensed" as "Partial".
const STATUS_LABEL = {
  "Not Dispensed": "Pending",
  "Partially Dispensed": "Partial",
  Dispensed: "Dispensed",
};

export const adaptPrescriptionItem = (i) => ({
  id: i.PrescriptionItemId,
  medicine_id: i.MedicineId,
  medicine_name: i.MedicineName,
  medicine: i.MedicineName,
  dosage: i.Dosage,
  instructions: i.DosageInstructions,
  duration: i.Duration,
  frequency: i.Frequency,
});

export const adaptPrescription = (p) => ({
  id: p.PrescriptionId,
  patient_id: p.PatientId,
  patient_name: p.PatientName,
  patient: p.PatientName,
  doctor_id: p.DoctorId,
  doctor_name: p.DoctorName,
  doctor: p.DoctorName,
  created_at: p.PrescriptionDateTime,
  date: p.PrescriptionDateTime,
  status: STATUS_LABEL[p.Status] || p.Status,
  raw_status: p.Status,
  items: (p.items || []).map(adaptPrescriptionItem),
});

export const adaptBill = (b) => ({
  id: b.BillId,
  patient_id: b.Patient,
  patient_name: b.PatientName,
  patient: b.PatientName,
  prescription_id: b.Prescription,
  dispensed_by: b.DispensedByName,
  date: b.BillDate,
  total: b.TotalAmount,
  total_amount: b.TotalAmount,
  amount: b.TotalAmount,
  items: (b.items || []).map((i) => ({
    id: i.BillItemId,
    medicine_name: i.MedicineName,
    quantity: i.Quantity,
    unit_price: i.UnitPrice,
    amount: i.LineAmount,
  })),
});

export const adaptReorderRow = (r) => ({
  id: r.MedicineId,
  medicine_name: r.MedicineName,
  quantity: r.QuantityOnHand,
  available_qty: r.QuantityOnHand,
  reorder_level: r.ReorderLevel,
  unit_price: r.UnitPrice,
  selling_price: r.SellingPrice,
  status: r.StockStatus,
});

export const adaptRevenue = (r) => ({
  from_date: r.from_date,
  to_date: r.to_date,
  bills_count: r.number_of_bills,
  number_of_bills: r.number_of_bills,
  total_revenue: r.total_revenue,
});

// UI form -> backend stock payload. SellingPrice is required by the backend;
// until the stock form has its own field it falls back to the unit price.
export const toStockPayload = (f) => ({
  Medicine: Number(f.medicine),
  QuantityOnHand: Number(f.quantity),
  ReorderLevel: Number(f.reorder_level ?? 0),
  UnitPrice: f.unit_price,
  SellingPrice: f.selling_price ?? f.unit_price,
});

// Dispense body: [{PrescriptionItemId, Quantity}]. `quantities` is an optional
// map {itemId: qty}; any item not in the map defaults to 1.
export const toDispensePayload = (prescription, quantities = {}) => ({
  items: (prescription.items || []).map((i) => ({
    PrescriptionItemId: i.PrescriptionItemId ?? i.id,
    Quantity: Number(quantities[i.PrescriptionItemId ?? i.id] ?? 1),
  })),
});

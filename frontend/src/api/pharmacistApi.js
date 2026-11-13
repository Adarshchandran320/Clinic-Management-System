import axiosClient, { normalizeListResponse } from "./axiosClient.js";
import {
  adaptMedicine, adaptStock, adaptPrescription, adaptBill,
  adaptReorderRow, adaptRevenue, toStockPayload, toDispensePayload,
} from "./pharmacistAdapters.js";

// Pharmacist API endpoints (/api/pharmacist/)
export const pharmacistApi = {
  // Medicines (search/list, read-only)
  getMedicines: async (params = {}) => {
    const res = await axiosClient.get("/pharmacist/medicines/", { params });
    return normalizeListResponse(res).map(adaptMedicine);
  },
  getMedicineById: async (id) => {
    const res = await axiosClient.get(`/pharmacist/medicines/${id}/`);
    return adaptMedicine(res.data);
  },

  // Stock (list, create, detail, update)
  getStock: async (params = {}) => {
    const res = await axiosClient.get("/pharmacist/stock/", { params });
    return normalizeListResponse(res).map(adaptStock);
  },
  getStockById: async (id) => {
    const res = await axiosClient.get(`/pharmacist/stock/${id}/`);
    return adaptStock(res.data);
  },
  createStock: async (payload) => {
    const res = await axiosClient.post("/pharmacist/stock/", toStockPayload(payload));
    return adaptStock(res.data);
  },
  updateStock: async (id, payload) => {
    const res = await axiosClient.put(`/pharmacist/stock/${id}/`, toStockPayload(payload));
    return adaptStock(res.data);
  },

  // Prescriptions (incoming queue, detail with items, dispense)
  getPrescriptions: async (params = {}) => {
    const res = await axiosClient.get("/pharmacist/prescriptions/", { params });
    return normalizeListResponse(res).map(adaptPrescription);
  },
  getPrescriptionById: async (id) => {
    const res = await axiosClient.get(`/pharmacist/prescriptions/${id}/`);
    return adaptPrescription(res.data);
  },
  // Dispense is the ONLY way a bill is created
  // `quantities` = optional {prescriptionItemId: qty}; defaults to 1 per item.
  dispensePrescription: async (id, quantities = {}) => {
    const detail = await axiosClient.get(`/pharmacist/prescriptions/${id}/`);
    const body = toDispensePayload(
      { items: detail.data.items || [] },
      quantities
    );
    const res = await axiosClient.post(`/pharmacist/prescriptions/${id}/dispense/`, body);
    return adaptBill(res.data);
  },

  // Bills & Bill Items (read-only)
  getBills: async (params = {}) => {
    const res = await axiosClient.get("/pharmacist/bills/", { params });
    return normalizeListResponse(res).map(adaptBill);
  },
  getBillById: async (id) => {
    const res = await axiosClient.get(`/pharmacist/bills/${id}/`);
    return adaptBill(res.data);
  },
  getBillItems: async (params = {}) => {
    const res = await axiosClient.get("/pharmacist/bill-items/", { params });
    return normalizeListResponse(res);
  },

  // Reports
  getRevenueReport: async (fromDate = "", toDate = "") => {
    const params = {};
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    const res = await axiosClient.get("/pharmacist/reports/revenue/", { params });
    return adaptRevenue(res.data);
  },
  getReorderReport: async () => {
    const res = await axiosClient.get("/pharmacist/reports/reorder/");
    return normalizeListResponse(res).map(adaptReorderRow);
  },
};

export default pharmacistApi;

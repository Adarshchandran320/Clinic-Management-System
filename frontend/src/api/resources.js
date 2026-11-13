import axiosClient from "./axiosClient.js";

/**
 * Creates a standard CRUD resource client for Django REST Framework.
 *
 * @param {string} endpoint - API resource base URL (e.g. "/receptionist/patients/")
 * @param {object} options - Custom methods or overrides
 * @returns {object} Resource object with list, get, create, update, patch, remove
 */
export function makeResource(endpoint, options = {}) {
  const clean = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const base = clean.endsWith("/") ? clean : `${clean}/`;

  return {
    endpoint: base,

    list: async (params = {}) => {
      const res = await axiosClient.get(base, { params });
      const payload = res.data;

      // Unpaginated plain array
      if (Array.isArray(payload)) {
        return {
          results: payload,
          count: payload.length,
          next: null,
          previous: null,
          data: payload,
        };
      }

      // DRF standard pagination: { count, next, previous, results: [...] }
      if (payload && Array.isArray(payload.results)) {
        return {
          results: payload.results,
          count: payload.count ?? payload.results.length,
          next: payload.next || null,
          previous: payload.previous || null,
          data: payload.results,
        };
      }

      // Alternative pagination envelope
      if (payload && Array.isArray(payload.items)) {
        return {
          results: payload.items,
          count: payload.count ?? payload.items.length,
          next: payload.next || null,
          previous: payload.previous || null,
          data: payload.items,
        };
      }

      return {
        results: [],
        count: 0,
        next: null,
        previous: null,
        data: [],
      };
    },

    get: async (id, params = {}) => {
      const res = await axiosClient.get(`${base}${id}/`, { params });
      return res.data;
    },

    create: async (payload) => {
      const res = await axiosClient.post(base, payload);
      return res.data;
    },

    update: async (id, payload) => {
      const res = await axiosClient.put(`${base}${id}/`, payload);
      return res.data;
    },

    patch: async (id, payload) => {
      const res = await axiosClient.patch(`${base}${id}/`, payload);
      return res.data;
    },

    remove: async (id) => {
      const res = await axiosClient.delete(`${base}${id}/`);
      return res.data;
    },

    ...options,
  };
}

export default makeResource;

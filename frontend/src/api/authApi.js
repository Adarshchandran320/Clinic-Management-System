import axiosClient from "./axiosClient.js";

// Auth API endpoints: POST /api/auth/login/ and POST /api/auth/refresh/
export const authApi = {
  login: ({ username, password }) =>
    axiosClient.post("/auth/login/", { username, password }),
  refresh: (refresh) => axiosClient.post("/auth/refresh/", { refresh }),
};

export default authApi;

import axiosClient from "./axiosClient.js";

const notificationApi = {
  list: async (params = {}) => {
    const res = await axiosClient.get("/notifications/", { params });
    return res.data;
  },

  unreadCount: async () => {
    const res = await axiosClient.get("/notifications/unread-count/");
    return res.data?.unread_count ?? 0;
  },

  markRead: async (id) => {
    const res = await axiosClient.post(`/notifications/${id}/read/`);
    return res.data;
  },

  markReadAll: async () => {
    const res = await axiosClient.post("/notifications/read-all/");
    return res.data;
  },
};

export default notificationApi;

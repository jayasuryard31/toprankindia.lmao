import api from "./api";

export const getStats = () => api.get("/stats");

export const getTotalCollected = () => api.get("/stats/total-collected");

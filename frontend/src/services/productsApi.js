import api from "./api";

export const getHome = () => api.get("/home");

export const getProducts = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, v);
  });
  const query = qs.toString();
  return api.get(`/products${query ? `?${query}` : ""}`);
};

export const getTopProducts = (limit = 3) =>
  api.get(`/products/top?limit=${limit}`);

export const getProduct = (id) => api.get(`/products/${id}`);

export const trackClick = (id) => api.post(`/products/${id}/click`);

import api from "./api";

export const getCityLayout = () => api.get("/map/city");
export const getBillboards = () => api.get("/map/billboards");
export const bookBillboard = (data) => api.post("/map/billboards/book", data);
export const claimBillboard = (billboardId, brandData) =>
  api.post("/map/billboards/book", { code: billboardId, brandData, ...(brandData || {}) });

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const request = async (path, options = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const { responseCode, responseMessage, responseData } = await res.json();

  if (responseCode !== 1000 && responseCode !== 1001) {
    throw new Error(responseMessage);
  }

  return responseData;
};

export const addNumbers = (a, b) =>
  request("/addition", { method: "POST", body: JSON.stringify({ a, b }) });

export const getAdditionHistory = () => request("/addition/history");

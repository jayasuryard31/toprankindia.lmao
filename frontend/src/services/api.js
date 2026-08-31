const BASE_URL = import.meta.env.VITE_API_BASE_URL;

class ApiClient {
  async request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    let res;
    try {
      res = await fetch(url, {
        headers: { "Content-Type": "application/json", ...options.headers },
        ...options,
      });
    } catch (networkErr) {
      console.error(`[ApiClient] Network/CORS error on ${path}:`, networkErr);
      throw new Error(`Network error connecting to API (${path}). Please check connection or CORS settings.`);
    }

    let json;
    try {
      json = await res.json();
    } catch (parseErr) {
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }
      throw new Error("Invalid response format from server.");
    }

    const { responseCode, responseMessage, responseData, success, error } = json;

    if (responseCode !== undefined && responseCode !== 1000 && responseCode !== 1001) {
      const err = new Error(responseMessage || "Request failed");
      err.code = responseCode;
      throw err;
    }

    if (success === false && error) {
      const err = new Error(error.message || "Request failed");
      err.code = error.code;
      throw err;
    }

    return responseData !== undefined ? responseData : json;
  }

  get(path) {
    return this.request(path);
  }

  post(path, body) {
    return this.request(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}

const api = new ApiClient();

export default api;

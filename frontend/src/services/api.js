const BASE_URL = import.meta.env.VITE_API_BASE_URL;

class ApiClient {
  async request(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });

    const json = await res.json();
    const { responseCode, responseMessage, responseData } = json;

    if (responseCode !== 1000 && responseCode !== 1001) {
      const error = new Error(responseMessage || "Request failed");
      error.code = responseCode;
      throw error;
    }

    return responseData;
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

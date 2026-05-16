import axios from "axios";

const baseURL =
  import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3001";

/**
 * Shared axios instance for all backend calls. Adds reasonable timeouts and
 * default JSON content type. Auth headers can be injected here later.
 */
export const apiClient = axios.create({
  baseURL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[api]", err?.response?.status, err?.message);
    }
    return Promise.reject(err);
  },
);

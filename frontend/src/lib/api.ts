import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL;

if (!baseURL) {
  // eslint-disable-next-line no-console
  console.warn("VITE_API_BASE_URL is not set");
}

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

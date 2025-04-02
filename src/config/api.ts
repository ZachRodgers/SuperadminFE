import axios from "axios";

// Determine the base URL based on the environment
const getBaseUrl = () => {
  // Check if we're in production (superadmin.parkwithparallel.com)
  if (window.location.hostname === "superadmin.parkwithparallel.com") {
    return "http://api.parkwithparallel.com";
  }
  // Default to development environment
  return "http://localhost:8085/ParkingWithParallel";
};

// Create axios instance with the appropriate base URL
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to handle authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Export the base URL for use with fetch
const BASE_URL = getBaseUrl();

export { api, BASE_URL };

import axios from "axios";
import API_BASE from "../config";

const API = `${API_BASE}/api/v1/auth`;

export const login = async (email, password) => {
  const res = await axios.post(`${API}/login`, { email, password });
  return res.data.token;
};

export const loginWithGoogle = async (idToken) => {
  const res = await axios.post(`${API}/google`, { idToken });
  return res.data;
};

export const register = async (data) => {
  return axios.post(`${API}/register`, data);
};

export const completeGoogleRegistration = async (data) => {
  const res = await axios.post(`${API}/register/google-complete`, data);
  return res.data;
};

export const forgotPassword = async (email) => {
  return axios.post(`${API}/forgot-password`, { email });
};

export const forgotPasswordUpdate = async (email, password) => {
  return axios.post(`${API}/forgot-password/update`, { email, password });
};

export const resetPassword = async (token, password) => {
  return axios.post(`${API}/reset-password`, { token, password });
};

export const getCurrentUser = async () => {
  const res = await axios.get(`${API}/me`);
  return res.data;
};

export const updateProfile = async (data) => {
  const res = await axios.put(`${API}/me`, data);
  return res.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const res = await axios.post(`${API}/change-password`, {
    currentPassword,
    newPassword,
  });
  return res.data;
};

export const deleteAccount = async (password) => {
  const res = await axios.post(`${API}/delete-account`, { password });
  return res.data;
};

export const logout = () => {
  localStorage.removeItem("jwt");
  sessionStorage.removeItem("jwt");
};

// Axios interceptor to attach JWT token to every request
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Axios interceptor to handle 401 responses (auto-logout)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Don't redirect if already on auth pages
      if (
        currentPath !== "/" &&
        currentPath !== "/login" &&
        currentPath !== "/register" &&
        currentPath !== "/forgot-password" &&
        currentPath !== "/reset-password"
      ) {
        localStorage.removeItem("jwt");
        sessionStorage.removeItem("jwt");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

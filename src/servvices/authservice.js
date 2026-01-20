import axios from "axios";

const API = "http://localhost:8080/auth";

export const login = async (email, password) => {
  const res = await axios.post(`${API}/login`, { email, password });
  return res.data.token;
};

export const register = async (data) => {
  return axios.post(`${API}/register`, data);
};

export const logout = () => {
  localStorage.removeItem("jwt");
  sessionStorage.removeItem("jwt");
};

axios.interceptors.request.use(config => {
  const token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

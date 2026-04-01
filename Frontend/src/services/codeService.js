import axios from "axios";
import API_BASE from "../config";

const API = `${API_BASE}/api/v1/codes`;

if (!window.__NAMASTE_CODE_SERVICE_AUTH_INTERCEPTOR__) {
  axios.interceptors.request.use((config) => {
    const token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  window.__NAMASTE_CODE_SERVICE_AUTH_INTERCEPTOR__ = true;
}

export const searchCodes = async (
  query,
  limit = 10,
  searchWithin = "ALL",
  onlyActive = false,
  minConfidence = 0.45
) => {
  const res = await axios.get(`${API}/search`, {
    params: { q: query, limit, searchWithin, onlyActive, minConfidence }
  });
  return res.data;
};

export const runAiSearch = async (text, minConfidence = 0.45) => {
  const res = await axios.post(`${API}/ai-search`, {
    text: text,
    aiEnabled: true,
    minConfidence
  });
  return res.data;
};

export const translateCode = async (code, from) => {
  const res = await axios.get(`${API}/translate`, {
    params: { code, from }
  });
  return res.data;
};

export const getConceptDetail = async (code, system) => {
  const res = await axios.get(`${API}/concepts/detail`, {
    params: { code, system }
  });
  return res.data;
};

const ADMIN_API = `${API_BASE}/api/v1/admin`;

export const importConceptsFromCsv = async (
  file,
  codeSystems,
  reportDescription = ""
) => {
  const formData = new FormData();
  formData.append("file", file);
  if (Array.isArray(codeSystems)) {
    codeSystems.forEach((value) => {
      if (value) formData.append("codeSystems", value);
    });
  } else if (codeSystems) {
    formData.append("codeSystem", codeSystems);
  }
  formData.append("reportDescription", reportDescription);

  const res = await axios.post(`${ADMIN_API}/import/concepts/csv`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return res.data;
};

export const importNamasteCSV = async (file) => {
  return importConceptsFromCsv(file, "NAMASTE", "");
};

export const getImportHistory = async (page = 1, limit = 20) => {
  const res = await axios.get(`${ADMIN_API}/import/history`, {
    params: { page, limit }
  });
  return res.data;
};

export const deleteImportHistoryEntry = async (id) => {
  const res = await axios.delete(`${ADMIN_API}/import/history/${id}`);
  return res.data;
};

export const downloadImportHistoryFile = async (id) => {
  const res = await axios.get(`${ADMIN_API}/import/history/${id}/download`, {
    responseType: "blob"
  });
  return res.data;
};

export const getCodeSystems = async () => {
  const res = await axios.get(`${ADMIN_API}/code-systems`);
  return res.data;
};

export const updateCodeSystem = async (id, payload) => {
  const res = await axios.put(`${ADMIN_API}/code-systems/${id}`, payload);
  return res.data;
};

export const setCodeSystemActive = async (id, active) => {
  const res = await axios.put(`${ADMIN_API}/code-systems/${id}/active`, null, {
    params: { active }
  });
  return res.data;
};

export const addMapping = async (payload) => {
  const res = await axios.post(`${ADMIN_API}/mappings`, payload);
  return res.data;
};

export const deactivateConcept = async (code, codeSystem) => {
  const res = await axios.post(`${ADMIN_API}/concepts/deactivate`, {
    code,
    codeSystem
  });
  return res.data;
};

export const getStats = async () => {
  const res = await axios.get(`${API}/stats`);
  return res.data;
};

export const getDoctorDashboardStats = async () => {
  const res = await axios.get(`${API}/dashboard`);
  return res.data;
};

export const submitMlFeedback = async (data) => {
  const res = await axios.post(`${API}/ml-feedback`, data);
  return res.data;
};

export const requestConceptAddition = async (data) => {
  const res = await axios.post(`${API}/concept-requests`, data);
  return res.data;
};

export const getPublicSystems = async () => {
  const res = await axios.get(`${API}/systems`);
  return res.data;
};

export const getDoctorConceptById = async (id) => {
  const res = await axios.get(`${API}/concepts/${id}`);
  return res.data;
};

export const addDoctorMapping = async (payload) => {
  const res = await axios.post(`${API}/mappings`, payload);
  return res.data;
};

export const getDoctorMappings = async (query = "", page = 1) => {
  const res = await axios.get(`${API}/mappings`, {
    params: { q: query, page }
  });
  return res.data;
};

export const deactivateDoctorConcept = async (id, reason) => {
  const res = await axios.patch(`${API}/concepts/${id}/deactivate`, { reason });
  return res.data;
};

export const reactivateDoctorConcept = async (id) => {
  const res = await axios.patch(`${API}/concepts/${id}/reactivate`);
  return res.data;
};

export const getMyConceptRequests = async () => {
  const res = await axios.get(`${API}/concept-requests/mine`);
  return res.data;
};


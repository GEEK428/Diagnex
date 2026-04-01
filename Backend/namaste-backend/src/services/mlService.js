const axios = require("axios");
const env = require("../config/env");

function buildMlUrl(path) {
  const base = env.mlServiceUrl.replace(/\/predict\/?$/i, "");
  return `${base}/${path}`;
}

async function predictCode(text) {
  const response = await axios.post(env.mlServiceUrl, { text }, { timeout: env.mlTimeoutMs });

  return response.data;
}

async function trainConcepts(concepts, timeoutMs = 30000) {
  const payload = {
    concepts: concepts.map((c) => ({
      code: c.code,
      text: [c.displayName || "", c.description || "", ...(c.tags || [])]
        .join(" ")
        .trim()
    }))
  };

  const response = await axios.post(buildMlUrl("train"), payload, { timeout: timeoutMs });
  return response.data;
}

async function getTrainStatus(timeoutMs = 5000) {
  const response = await axios.get(buildMlUrl("train/status"), { timeout: timeoutMs });
  return response.data;
}

module.exports = { predictCode, trainConcepts, getTrainStatus };

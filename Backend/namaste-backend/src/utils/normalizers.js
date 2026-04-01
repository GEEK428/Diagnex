function normalizeCodeSystem(value) {
  return (value || "")
    .replace(/\uFEFF/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();
}

function stripBom(value) {
  return typeof value === "string" ? value.replace(/^\uFEFF/, "") : value;
}

function normalizeCode(value) {
  if (typeof value !== "string") return value;
  // Standardize: Strip dashes, spaces, underscores and convert to uppercase (AYU-005 -> AYU005)
  return value
    .replace(/[-\s_]/g, "")
    .trim()
    .toUpperCase();
}

module.exports = { normalizeCodeSystem, stripBom, normalizeCode };

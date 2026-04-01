/**
 * Converts a raw fetch/API error to a user-friendly message.
 * "Failed to fetch" means network is down / backend unreachable.
 */
export function friendlyError(err) {
  if (!err) return "An unexpected error occurred.";
  const msg = err.message || String(err);
  if (
    msg.toLowerCase().includes("failed to fetch") ||
    msg.toLowerCase().includes("networkerror") ||
    msg.toLowerCase().includes("load failed") ||
    msg.toLowerCase().includes("network request failed")
  ) {
    return "Cannot reach the server. Please ensure the backend is running and try again.";
  }
  return msg;
}

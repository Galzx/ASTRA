// Single source of truth for the backend URL. Defaults to localhost for
// normal dev; override by setting VITE_API_URL in frontend/.env (e.g. to
// an ngrok URL) when testing with remote devices.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
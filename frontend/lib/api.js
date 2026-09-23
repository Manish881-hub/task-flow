/**
 * Typed fetch wrapper for TaskFlow API.
 *
 * - BASE_URL comes from NEXT_PUBLIC_API_URL (default http://localhost:8000).
 * - Access token lives ONLY in memory (module variable). Never localStorage.
 * - Transparent 401 refresh: on 401, POST /api/v1/auth/refresh once
 *   (credentials:include so httpOnly cookie travels), then retry once.
 * - All requests send credentials:include (CORS cookies).
 * - No hardcoded URLs — everything resolves through BASE_URL / WS_BASE.
 */

const BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export function getWsBase() {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  // Derive ws(s):// from http(s):// BASE_URL when env not set.
  return BASE_URL.replace(/^http/, "ws");
}

// ---- In-memory token store (never persisted) ----
let _accessToken = null;

export function getAuthToken() {
  return _accessToken;
}

export function setAuthToken(token) {
  _accessToken = token || null;
}

export function clearAuthToken() {
  _accessToken = null;
}

// ---- Error type ----
/**
 * Unwrap the backend `{data}` envelope.
 * Lists keep pagination: `meta`/`links` are attached to the returned value
 * (arrays accept extra props in JS) so no caller loses paging info.
 */
function unwrapEnvelope(body) {
  if (body && typeof body === "object" && !Array.isArray(body) && "data" in body) {
    const out = body.data;
    if (out && typeof out === "object") {
      if (body.meta !== undefined) out.meta = body.meta;
      if (body.links !== undefined) out.links = body.links;
    }
    return out;
  }
  return body;
}
export class ApiError extends Error {
  constructor(status, body, message) {
    super(message || `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** Human-friendly message for common statuses + network failures. */
export function getErrorMessage(err) {
  if (!err) return "Something went wrong. Please try again.";
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === "Failed to fetch" || msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("Load failed")) {
    return "Cannot reach the server. Check your connection and that the API is running.";
  }
  const status = err && typeof err.status === "number" ? err.status : null;
  // Backend envelope: { error: { code, message, details }, request_id }.
  // details may be a string, an array of {loc,msg,type}, or null.
  const body = err && err.body && typeof err.body === "object" ? err.body : null;
  const errObj = body && body.error && typeof body.error === "object" ? body.error : null;
  const rawDetail =
    body && (body.detail || body.message)
      ? body.detail || body.message
      : errObj
        ? errObj.details || errObj.message
        : null;
  const detailStr = Array.isArray(rawDetail)
    ? rawDetail.map((d) => (typeof d === "string" ? d : d.msg || d.message || JSON.stringify(d))).join(" ")
    : typeof rawDetail === "string"
      ? rawDetail
      : rawDetail && typeof rawDetail === "object"
        ? rawDetail.message || JSON.stringify(rawDetail)
        : null;

  switch (status) {
    case 400:
      return detailStr || "Invalid request. Please check your input.";
    case 401:
      return "Your session expired. Please log in again.";
    case 403:
      return "You do not have permission to do that.";
    case 404:
      return "Not found. It may have been deleted.";
    case 409:
      return detailStr || "This already exists (conflict).";
    case 422:
      return detailStr || "Validation failed. Please check the highlighted fields.";
    case 429:
      return "Too many requests. Please wait a moment and retry.";
    case 500:
    case 502:
    case 503:
      return "Server error. Please try again in a moment.";
    default:
      return detailStr || msg || "Something went wrong. Please try again.";
  }
}

async function parseBody(res) {
  const ct = res.headers.get("content-type") || "";
  if (res.status === 204) return null;
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  try {
    const text = await res.text();
    return text || null;
  } catch {
    return null;
  }
}

async function doRefresh() {
  const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await parseBody(res);
    throw new ApiError(res.status, body);
  }
  const data = await parseBody(res);
  // Backend may return { access_token, user } or { accessToken } — accept both.
  // Refresh payload arrives in the {data} envelope; unwrap first.
  const unwrapped = unwrapEnvelope(data);
  const token = unwrapped && (unwrapped.access_token || unwrapped.accessToken || unwrapped.token);
  if (token) setAuthToken(token);
  return data;
}

/**
 * api(path, opts)
 * path: "/api/v1/projects" (leading slash optional)
 * opts: { method, body (object|string), headers, signal, retry?: boolean }
 */
export async function api(path, opts = {}) {
  const { method = "GET", body, headers = {}, signal, retry = true } = opts;
  const url = path.startsWith("http") ? path : `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  const finalHeaders = { ...headers };
  let payload;
  if (body !== undefined && body !== null) {
    if (typeof body === "string" || body instanceof FormData) {
      payload = body;
    } else {
      finalHeaders["Content-Type"] = finalHeaders["Content-Type"] || "application/json";
      payload = JSON.stringify(body);
    }
  }

  if (_accessToken) {
    finalHeaders.Authorization = `Bearer ${_accessToken}`;
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: payload,
      credentials: "include",
      signal,
    });
  } catch (e) {
    // Network failure — surface as generic Error so getErrorMessage maps it.
    throw new Error("Failed to fetch");
  }

  if (res.status === 401 && retry) {
    try {
      await doRefresh();
    } catch {
      clearAuthToken();
      const bodyErr = await parseBody(res);
      throw new ApiError(401, bodyErr);
    }
    // Retry once with (possibly rotated) token, no further retry.
    return api(path, { method, body, headers, signal, retry: false });
  }

  if (!res.ok) {
    const errBody = await parseBody(res);
    throw new ApiError(res.status, errBody);
  }

  return unwrapEnvelope(await parseBody(res));
}

export const apiGet = (path, opts) => api(path, { ...(opts || {}), method: "GET" });
export const apiPost = (path, body, opts) => api(path, { ...(opts || {}), method: "POST", body });
export const apiPatch = (path, body, opts) => api(path, { ...(opts || {}), method: "PATCH", body });
export const apiDelete = (path, opts) => api(path, { ...(opts || {}), method: "DELETE" });

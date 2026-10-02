import { supabase } from './supabaseClient.js';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.fieldErrors = details.fieldErrors ?? {};
    this.problems = details.problems ?? [];
  }
}

async function buildHeaders(body, contentType) {
  const { data } = await supabase.auth.getSession();
  const headers = {};
  if (contentType) headers['Content-Type'] = contentType;
  else if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  return headers;
}

// Calls the Express API with the signed-in user's login token attached.
// body is sent as JSON; rawBody (a file) is sent as-is with contentType.
export async function callApi(path, { method = 'GET', body, rawBody, contentType } = {}) {
  let response;
  try {
    response = await fetch(apiBaseUrl + path, {
      method,
      headers: await buildHeaders(body, contentType),
      body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
  } catch {
    throw new ApiError('Could not reach the store. Please check your internet connection.', 0, {});
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.error ?? 'Something went wrong. Please try again.', response.status, payload);
  }
  return payload;
}

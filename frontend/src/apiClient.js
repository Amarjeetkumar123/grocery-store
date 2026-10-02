import { supabase } from './supabaseClient.js';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(message, status, fieldErrors) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

// Calls the Express API with the signed-in user's login token attached.
export async function callApi(path, { method = 'GET', body } = {}) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response;
  try {
    response = await fetch(apiBaseUrl + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the store. Please check your internet connection.', 0, {});
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.error ?? 'Something went wrong. Please try again.', response.status, payload.fieldErrors ?? {});
  }
  return payload;
}

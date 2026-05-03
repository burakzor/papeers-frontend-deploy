export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export function isBackendConfigured() {
  return Boolean(API_BASE_URL);
}

export function shouldUseMockData() {
  return import.meta.env.VITE_USE_MOCKS !== 'false' || !isBackendConfigured();
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getWsBaseUrl() {
  // Use the origin part of the API_BASE_URL and append /ws
  try {
    const url = new URL(API_BASE_URL);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${url.host}/ws`;
  } catch (e) {
    // Fallback logic if URL parsing fails
    return API_BASE_URL
      .replace(/^https:/, 'wss:')
      .replace(/^http:/, 'ws:')
      .replace(/\/api.*$/, '')
      .replace(/\/$/, '') + '/ws';
  }
}

function getStoredToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem('prs.auth.token');
}

export function setAuthToken(token: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!token) {
    window.localStorage.removeItem('prs.auth.token');
    return;
  }

  window.localStorage.setItem('prs.auth.token', token);
}

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | Record<string, unknown> | null;
  auth?: boolean;
  skipAuthRedirect?: boolean;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      'VITE_API_BASE_URL is not configured. Add it to your .env file before using the backend.',
      0,
    );
  }

  const { body, auth = true, skipAuthRedirect = false, headers, ...rest } = options;
  const token = auth ? getStoredToken() : null;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const requestHeaders = new Headers(headers ?? {});
  requestHeaders.set('Accept', 'application/json');

  if (!isFormData && body && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (token && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    credentials: 'include',
    ...rest,
    headers: requestHeaders,
    body: !body ? null : isFormData || typeof body === 'string' ? body : JSON.stringify(body),
  });

  const rawText = await response.text();
  const payload = rawText ? safeParseJson(rawText) : null;

  if (response.status === 401 && !skipAuthRedirect) {
    window.localStorage.removeItem('prs.auth.token');
    window.localStorage.removeItem('prs.auth.user');
    window.localStorage.removeItem('prs.selected.lab');
    window.location.href = '/login';
    throw new ApiError('Session expired', response.status, payload);
  }

  if (!response.ok) {
    const message = extractErrorMessage(payload) ?? response.statusText ?? 'Request failed';
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractErrorMessage(payload: unknown) {
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if ('message' in payload && typeof payload.message === 'string') {
    return payload.message;
  }

  if ('error' in payload && typeof payload.error === 'string') {
    return payload.error;
  }

  return null;
}

import { apiRequest, getApiBaseUrl } from '../lib/api';

export interface AIReviewUrlResponse {
  url: string;
}

/**
 * Parses a non-OK fetch() response and returns a human-readable error message.
 * Handles Spring Boot's default error JSON body: { status, error, message, path }.
 */
async function extractBlobFetchError(response: Response): Promise<string> {
  // 401 / 403 — session issues

  // Try to read the body as text (safe even for binary endpoints on error paths)
  try {
    const text = await response.text();
    if (!text) {
      if (response.status === 401) return 'Your session has expired. Please log in again.';
      if (response.status === 403) return 'You do not have permission to perform this action.';
      return `Server error (${response.status})`;
    }

    // Try to parse as Spring Boot JSON error: { message, error, ... }
    const json = JSON.parse(text);
    if (json && typeof json === 'object') {
      if (typeof json.message === 'string' && json.message.trim()) return json.message;
      if (typeof json.error === 'string' && json.error.trim()) return json.error;
    }
    // Plain text body (e.g. ResponseStatusException reason phrase)
    if (text.trim()) return text.trim();
  } catch {
    // JSON.parse failed — body was plain text or empty
  }

  if (response.status === 401) return 'Your session has expired. Please log in again.';
  if (response.status === 403) return 'You do not have permission to perform this action.';
  return `Server error (${response.status})`;
}

export const generateInlineReview = async (paperId: string): Promise<Blob> => {
  const baseUrl = getApiBaseUrl();
  const token = localStorage.getItem('prs.auth.token');
  if (!token) {
    throw new Error('Your session has expired. Please log in again.');
  }
  const response = await fetch(`${baseUrl}/v1/ai/${paperId}/inline-review`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const message = await extractBlobFetchError(response);
    throw new Error(message);
  }

  return response.blob();
};

export const getReviewSignedUrl = async (paperId: string): Promise<string> => {
  const response = await apiRequest<AIReviewUrlResponse>(`/v1/ai/${paperId}/review-url`, {
    method: 'GET',
    auth: true,
  });
  return response.url;
};

/** Returns the raw LaTeX source of the formal review (kept for debugging). */
export const generateFormalReview = async (paperId: string): Promise<string> => {
  const response = await apiRequest<string>(`/v1/ai/${paperId}/formal-review`, {
    method: 'POST',
    auth: true,
  });
  return response;
};

/**
 * Generates the formal review letter via AI, compiles it to PDF server-side,
 * and triggers a browser download of the resulting PDF.
 */
export const downloadFormalReviewPdf = async (paperId: string, paperTitle: string): Promise<void> => {
  const baseUrl = getApiBaseUrl();
  const token = localStorage.getItem('prs.auth.token');
  if (!token) {
    throw new Error('Your session has expired. Please log in again.');
  }
  const response = await fetch(`${baseUrl}/v1/ai/${paperId}/formal-review-pdf`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const message = await extractBlobFetchError(response);
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `formal-review-${paperTitle.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};


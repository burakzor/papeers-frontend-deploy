import { apiRequest } from '../lib/api';
import { PaginatedResponse } from './userService';

export interface CommentAdditionRequest {
  reviewerId: string;
  paperId: string;
  qualityRating: number;
  quantityRating: number;
  timelinessRating: number;
  comment: string;
}

export interface CommentResponse {
  id: string;
  qualityRating: number;
  quantityRating: number;
  timelinessRating: number;
  comment: string;
  reviewer: string;
  sender?: string;
  paperId: string;
  paperTitle: string;
}

export async function addComment(request: CommentAdditionRequest): Promise<CommentResponse> {
  return apiRequest<CommentResponse>('/v1/comments', {
    method: 'POST',
    auth: true,
    body: request as unknown as Record<string, unknown>,
  });
}

export async function getMyComments(
  page = 0,
  size = 20,
): Promise<PaginatedResponse<CommentResponse>> {
  return apiRequest<PaginatedResponse<CommentResponse>>(
    `/v1/comments?page=${page}&size=${size}`,
    { method: 'GET', auth: true },
  );
}

export async function getMyReceivedComments(
  page = 0,
  size = 20,
): Promise<PaginatedResponse<CommentResponse>> {
  return apiRequest<PaginatedResponse<CommentResponse>>(
    `/v1/comments/received?page=${page}&size=${size}`,
    { method: 'GET', auth: true },
  );
}

export async function getReviewerComments(
  reviewerId: string,
  page = 0,
  size = 20,
): Promise<PaginatedResponse<CommentResponse>> {
  return apiRequest<PaginatedResponse<CommentResponse>>(
    `/v1/comments/coordinator/${reviewerId}?page=${page}&size=${size}`,
    { method: 'GET', auth: true },
  );
}

/**
 * Fetch a single comment by UUID.
 * Only accessible by coordinators (backend enforces COORDINATOR role).
 */
export async function getCommentById(id: string): Promise<CommentResponse> {
  return apiRequest<CommentResponse>(`/v1/comments/${id}`, {
    method: 'GET',
    auth: true,
  });
}

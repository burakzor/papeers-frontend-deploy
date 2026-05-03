import { apiRequest } from '../lib/api';

export interface RequestResponseDTO {
  id: string;
  assignmentId: string;
  labMemberId?: string;
  excuse: string;
  status: string;
  type: string;
  requestedDeadline?: string | null;
}

export type RequestCreationPayload = {
  excuse: string;
  assignmentId: string;
  memberId: string;
  status: string;
  type: string;
  requestedDeadline?: string | null;
};

// Yeni bir talep oluşturur (Refusal veya Extension)
export const createRequest = async (data: RequestCreationPayload): Promise<any> => {
  return apiRequest<any>('/v1/requests', {
    method: 'POST',
    auth: true,
    body: data,
  });
};

// Süre uzatma taleplerini getirir
export const getExtensionRequests = async (): Promise<RequestResponseDTO[]> => {
  return apiRequest<RequestResponseDTO[]>('/v1/requests/extensions', {
    method: 'GET',
    auth: true,
  });
};

// Reddetme taleplerini getirir
export const getRefusalRequests = async (): Promise<RequestResponseDTO[]> => {
  return apiRequest<RequestResponseDTO[]>('/v1/requests/refusals', {
    method: 'GET',
    auth: true,
  });
};

// Talebi onaylar
export const acceptRequestAction = async (requestId: string): Promise<any> => {
  return apiRequest<any>(`/v1/requests/${requestId}/accept`, {
    method: 'PUT',
    auth: true,
  });
};

// Talebi reddeder
export const declineRequestAction = async (requestId: string): Promise<any> => {
  return apiRequest<any>(`/v1/requests/${requestId}/decline`, {
    method: 'PUT',
    auth: true,
  });
};
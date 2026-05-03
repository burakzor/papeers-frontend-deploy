import { apiRequest } from '../lib/api';

export type AssignmentRequest = {
  paperId: string;
  reviewerId: string;
  assignedDate: string;
  deadline: string;
};

export interface AssignmentResponseDTO {
  id: string;
  assignedDate: string;
  deadline: string;
  reviewerId: string;
  paperId: string;
  paperTitle: string;
  reviewerName: string;
  status: string;
  overleafLink: string;
  paperTrack?: string;
  paperSubmissionDate?: string;
  paperPageCount?: number;
  paperAbstractWordCount?: number;
  paperVersion?: number;
  paperMainAuthor?: string;
  paperCoauthors?: string[];
  paperAnonymous?: boolean;
  clarificationNote?: string;
  clarificationRound?: number;
}

export type AssignmentStatusUpdate = {
  assignmentId: string;
  status: 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'STARTED' | 'DONE';
  reason?: string;
};

export const getMyAssignments = async (userId: string): Promise<AssignmentResponseDTO[]> => {
  return apiRequest<AssignmentResponseDTO[]>(`/v1/assignments/reviewer/${userId}`, {
    method: 'GET',
    auth: true,
  });
};

export const getLabAssignments = async (labId: string): Promise<AssignmentResponseDTO[]> => {
  return apiRequest<AssignmentResponseDTO[]>(`/v1/assignments/lab/${labId}`, {
    method: 'GET',
    auth: true,
  });
};

export const createAssignment = async (request: AssignmentRequest): Promise<any> => {
  return apiRequest<any>('/v1/assignments', {
    method: 'POST',
    auth: true,
    body: request,
  });
};

export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  return apiRequest<void>(`/v1/assignments/${assignmentId}`, {
    method: 'DELETE',
    auth: true,
  });
};

export const updateAssignmentStatus = async (data: AssignmentStatusUpdate): Promise<any> => {
  return apiRequest<any>('/v1/assignments/status', {
    method: 'PATCH',
    auth: true,
    body: data,
  });
};

export const requestClarification = async (assignmentId: string, description: string): Promise<any> => {
  return apiRequest<any>(`/v1/assignments/${assignmentId}/clarification`, {
    method: 'POST',
    auth: true,
    body: { description },
  });
};

export const finishClarification = async (assignmentId: string, message?: string): Promise<any> => {
  return apiRequest<any>(`/v1/assignments/${assignmentId}/clarification/finish`, {
    method: 'PUT',
    auth: true,
    body: { message },
  });
};

import { apiRequest } from '../lib/api';

// --- Types & Interfaces ---

export type PaperCreateRequest = {
  title: string;
  labId: string;
  mainAuthorId: string;
  coAuthorIds: string[];
  track: string;
  expectedVenueId: string; // 2. Branch'ten eklendi
  contentLink: string;
  overleafLink: string;
  overleafProjectUrl?: string;
  bypassedPrechecks?: boolean;
};

export type CoordinatorCreatePaperRequest = {
  labId: string;
  mainAuthorId: string;
  overleafLink: string;
  overleafProjectUrl?: string;
  title?: string;
  track?: string;
  expectedVenueId?: string;
  coAuthorIds?: string[];
};

export interface PaperReviewerInfo {
  assignmentId: string;
  reviewerId: string;
  reviewerName: string;
  assignmentStatus?: string;
  clarificationNote?: string;
  clarificationRound?: number;
  deadline?: string;
}

export interface PaperResponseDTO {
  id: string;
  title: string;
  track: string;
  version: number;
  submissionDate: string;
  contentLink: string;
  labId: string;
  labName: string;
  mainAuthorId: string;
  mainAuthorName: string;
  coAuthorNames: string[];
  coAuthorIds: string[];
  assignedReviewers: PaperReviewerInfo[];
  overleafLink: string;
  overleafProjectUrl?: string | null;
  expectedVenueId?: string | null;   // 2. Branch'ten eklendi
  expectedVenueName?: string | null; // 2. Branch'ten eklendi
  status: string;
}

export type PaperStatusUpdateRequest = {
  status: string;
};

// --- Paper Requests ---

export const getPapersOfLabMember = async (labId: string): Promise<PaperResponseDTO[]> => {
  return apiRequest<PaperResponseDTO[]>(`/v1/papers/lab-member/${labId}`, {
    method: 'GET',
    auth: true,
  });
};

// Geriye dönük uyumluluk (1. branch'teki kullanımlar patlamasın diye)
export const getMyPapers = getPapersOfLabMember;

export const getPapersForGuestMember = async (labId: string): Promise<PaperResponseDTO[]> => {
  return apiRequest<PaperResponseDTO[]>(`/v1/papers/guest-coauthor/${labId}`, {
    method: 'GET',
    auth: true,
  });
};

export async function addPaper(paperData: PaperCreateRequest): Promise<PaperResponseDTO> {
  return apiRequest<PaperResponseDTO>('/v1/papers', {
    method: 'POST',
    auth: true,
    body: paperData,
  });
}

export async function createPaper(paperData: CoordinatorCreatePaperRequest): Promise<PaperResponseDTO> {
  return apiRequest<PaperResponseDTO>('/v1/papers/coordinator-create', {
    method: 'POST',
    auth: true,
    body: paperData,
  });
}

export const getPapersByLab = async (labId: string): Promise<PaperResponseDTO[]> => {
  return apiRequest<PaperResponseDTO[]>(`/v1/papers/lab/${labId}`, {
    method: 'GET',
    auth: true,
  });
};

export const resubmitPaper = async (paperId: string, newContentLink: string): Promise<any> => {
  return apiRequest<any>(`/v1/papers/${paperId}/content`, {
    method: 'PATCH',
    auth: true,
    body: { contentLink: newContentLink },
  });
};

export const finishPaper = async (paperId: string, requesterId: string, bypassedPrechecks?: boolean): Promise<PaperResponseDTO> => {
  return apiRequest<PaperResponseDTO>(`/v1/papers/${paperId}/finish`, {
    method: 'PATCH',
    auth: true,
    body: { requesterId, ...(bypassedPrechecks && { bypassedPrechecks: true }) },
  });
};

export const updatePaperStatus = async (paperId: string, statusData: PaperStatusUpdateRequest): Promise<PaperResponseDTO> => {
  return apiRequest<PaperResponseDTO>(`/v1/papers/${paperId}/status`, {
    method: 'PATCH',
    auth: true,
    body: statusData,
  });
};

// --- Reviewer Requests ---
// Not: İleride userService'e taşınabilir ama şimdilik burada durabilir.
export const getEligibleReviewers = async (labId?: string): Promise<any[]> => {
  const url = labId ? `/v1/users/eligible-authors?labId=${labId}` : '/v1/users/eligible-authors';
  return apiRequest<any[]>(url, {
    method: 'GET',
    auth: true,
  });
};

export const editPaperInformation = async (paperId: string, updateData: { title?: string; track?: string }): Promise<PaperResponseDTO> => {
  return apiRequest<PaperResponseDTO>(`/v1/papers/${paperId}`, {
    method: 'PUT',
    auth: true,
    body: updateData,
  });
};
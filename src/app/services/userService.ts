import { apiRequest, isBackendConfigured } from '../lib/api';

export interface BackendUserResponse {
  id: string;
  email: string;
  name?: string;
  photo?: string;
  role: string;
  lastActiveDate?: string;
  registrationDate: string;
  rating?: number;
  labId?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export type UserRole = 'COORDINATOR' | 'LAB_MEMBER' | 'GUEST_MEMBER';

export async function addUser(
  email: string,
  invitationLink: string,
  role: UserRole,
): Promise<BackendUserResponse> {
  return apiRequest<BackendUserResponse>('/v1/users', {
    method: 'POST',
    auth: true,
    body: { email, invitationLink, role },
  });
}

export async function registerUser(
  email: string,
  name: string,
  password: string,
  photo?: string,
): Promise<BackendUserResponse> {
  return apiRequest<BackendUserResponse>(`/v1/users/register/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    auth: false,
    body: { name, password, ...(photo !== undefined ? { photo } : {}) },
  });
}

export async function getEligibleAuthors(labId?: string): Promise<BackendUserResponse[]> {
  if (!isBackendConfigured()) return [];
  const url = labId ? `/v1/users/eligible-authors?labId=${labId}` : '/v1/users/eligible-authors';
  return apiRequest<BackendUserResponse[]>(url, {
    method: 'GET',
    auth: true,
  });
}

export async function getAllUsers(
  name?: string,
  page: number = 0,
  size: number = 20,
): Promise<PaginatedResponse<BackendUserResponse>> {
  if (!isBackendConfigured()) return { content: [], totalElements: 0, totalPages: 0, number: 0, size, first: true, last: true };
  const params = new URLSearchParams();
  if (name) params.set('name', name);
  params.set('page', String(page));
  params.set('size', String(size));
  return apiRequest<PaginatedResponse<BackendUserResponse>>(`/v1/users?${params.toString()}`, {
    method: 'GET',
    auth: true,
  });
}

export async function getUserById(id: string): Promise<BackendUserResponse> {
  return apiRequest<BackendUserResponse>(`/v1/users/${id}`, {
    method: 'GET',
    auth: true,
  });
}

export async function removeUser(id: string): Promise<void> {
  await apiRequest<void>(`/v1/users/${id}`, {
    method: 'DELETE',
    auth: true,
  });
}

// userService.ts

// userService.ts
// services/userService.ts

export async function updateProfile(
  id: string,
  email?: string,
  name?: string,
  photo?: string,
  currentPassword?: string,
  newPassword?: string,
): Promise<any> { // Backend LoginResponse döndüğü için 'any' veya uygun interface
  return apiRequest<any>('/v1/users', {
    method: 'PATCH',
    auth: true,
    body: {
      // Backend @AuthenticationPrincipal kullandığı için 'id' göndermesen de olur, 
      // ama DTO'da varsa 'id' ekleyebilirsin.
      ...(email && { email }),
      ...(name && { name }),
      ...(photo && { photo }),
      ...(currentPassword && { currentPassword }),
      ...(newPassword && { newPassword }),
    },
  });
}

export async function upgradeMemberToCoordinator(
  memberId: string,
  newLabName: string,
): Promise<BackendUserResponse> {
  return apiRequest<BackendUserResponse>(`/v1/users/upgrade-member/${memberId}`, {
    method: 'PATCH',
    auth: true,
    body: { newLabName },
  });
}

export async function forgotPassword(email: string): Promise<void> {
  await apiRequest<BackendUserResponse>(`/v1/users/password/${encodeURIComponent(email)}`, {
    method: 'POST',
    auth: false,
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiRequest<BackendUserResponse>(`/v1/users/password/${encodeURIComponent(token)}`, {
    method: 'PATCH',
    auth: false,
    body: { password },
  });
}

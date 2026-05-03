import { apiRequest } from '../lib/api';

export type BackendNotificationType =
    | 'ASSIGNMENT_RECEIVED'
    | 'REVIEWER_REMOVED'               // 2. Branch'ten geldi
    | 'REVIEWER_INVITATION_ACCEPTED'
    | 'REVIEWER_INVITATION_REJECTED'
    | 'REVIEW_FINISHED'
    | 'ALL_REVIEWS_COMPLETED'
    | 'DECISION_MADE'
    | 'DEADLINE_REMINDER'
    | 'DEADLINE_EXPIRED'
    | 'DEADLINE_EXTENSION_REQUEST'
    | 'DEADLINE_EXTENSION_APPROVED'
    | 'DEADLINE_EXTENSION_REJECTED'
    | 'COORDINATOR_EXTENDED_DEADLINE'
    | 'GUEST_ACCESS_GRANTED'
    | 'NEW_PAPER_UPLOADED'
    | 'PAPER_IN_PROGRESS_ASSIGNED'
    | 'PAPER_FINISHED_BY_AUTHOR'
    | 'WELCOME_TO_LAB'                 // 2. Branch'ten geldi
    | 'ASSIGNMENT_CANCELLED'           // 1. Branch'ten geldi
    | 'SYSTEM_ALERT'
    | 'CLARIFICATION_REQUESTED'
    | 'CLARIFICATION_FINISHED'
    | null;

export interface NotificationResponseDTO {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  date: string;
  type: BackendNotificationType;
}

export async function getNotificationsByLabId(labId: string): Promise<NotificationResponseDTO[]> {
  return apiRequest<NotificationResponseDTO[]>(`/v1/notifications/user/${labId}`, {
    method: 'GET',
    auth: true,
  });
}

export async function markNotificationAsRead(notificationId: string): Promise<NotificationResponseDTO> {
  return apiRequest<NotificationResponseDTO>(`/v1/notifications/${notificationId}/read`, {
    method: 'PATCH',
    auth: true,
  });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  return apiRequest<void>(`/v1/notifications/user/${userId}/read-all`, {
    method: 'PATCH',
    auth: true,
  });
}

export async function deleteNotification(notificationId: string): Promise<void> {
  return apiRequest<void>(`/v1/notifications/${notificationId}`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function deleteReadNotifications(userId: string): Promise<void> {
  return apiRequest<void>(`/v1/notifications/user/${userId}/read`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  return apiRequest<void>(`/v1/notifications/user/${userId}`, {
    method: 'DELETE',
    auth: true,
  });
}
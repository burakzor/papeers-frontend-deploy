import { apiRequest, shouldUseMockData } from '../lib/api';
import { Lab } from '../context/AuthContext';
import { type BackendUserResponse, type UserRole } from './userService';

interface LabCreationRequest {
  name: string;
  workloadLimit?: number;
}

export interface ReviewerWorkload {
  userId: string;
  name: string;
  activeReviews: number;
  capacity: number;
}

export interface LabWorkloadResponse {
  reviewers: ReviewerWorkload[];
  workloadThreshold: number;
}

export interface ReviewerAnalyticsResponse {
  id: string;
  name: string;
  email: string;
  avgScore: number;
  timeliness: number;
  reviewsCompleted: number;
  currentLoad: number;
  avgTurnaround: number;
}

export interface CoordinatorDashboardResponse {
  activeReviewers: number;
  pendingReviews: number;
  completedReviews: number;
  avgTurnaround: number;
}

export interface DashboardChartDataResponse {
  month: string;
  submissions: number;
  reviews: number;
}

export async function createLab(request: LabCreationRequest): Promise<Lab> {
  if (!shouldUseMockData()) {
    const response = await apiRequest<any>('/v1/labs', {
      method: 'POST',
      auth: true,
      body: { ...request },
    });
    
    return {
      id: response.id,
      name: response.name,
      institution: 'Bilkent University',
    };
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));
  return {
    id: 'mock-new-lab-1',
    name: request.name,
    institution: 'Bilkent University',
  };
}

export interface MemberResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    photo: string | null;
    role: string;
    registrationDate: string;
    lastActiveDate: string | null;
  };
  workload: number | null;
  isGuest: boolean;
}

export async function getLabMembers(name?: string): Promise<MemberResponse[]> {
  if (!shouldUseMockData()) {
    if (name) {
      const query = `?name=${encodeURIComponent(name)}`;
      const response = await apiRequest<{ content: MemberResponse[] }>(`/v1/labs/members${query}`, {
        method: 'GET',
        auth: true,
      });
      return response.content;
    } else {
      return await apiRequest<MemberResponse[]>('/v1/labs/allMembers', {
        method: 'GET',
        auth: true,
      });
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 800));
  return [
    {
      user: {
        id: '1',
        name: 'Dr. Alice Johnson',
        email: 'alice.johnson@bilkent.edu.tr',
        role: 'COORDINATOR',
        photo: null,
        registrationDate: '2024-01-15T10:00:00',
        lastActiveDate: '2024-04-20T15:30:00',
      },
      workload: 0,
    },
    {
      user: {
        id: '2',
        name: 'Prof. Bob Smith',
        email: 'bob.smith@bilkent.edu.tr',
        role: 'LAB_MEMBER',
        photo: null,
        registrationDate: '2024-02-01T09:00:00',
        lastActiveDate: '2024-04-22T11:20:00',
      },
      workload: 2,
    }
  ];
}

export async function getAllLabs(name?: string, size = 20): Promise<any[]> {
  if (!shouldUseMockData()) {
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    params.set('size', String(size));
    const response = await apiRequest<{ content: any[] }>(`/v1/labs/admin?${params.toString()}`, {
      method: 'GET',
      auth: true,
    });
    return response.content;
  }
  return [];
}

export async function deleteLabById(id: string): Promise<void> {
  if (!shouldUseMockData()) {
    await apiRequest<void>(`/v1/labs/admin/${id}`, {
      method: 'DELETE',
      auth: true,
    });
  }
}

export async function changeLabCoordinator(labId: string, coordinatorEmail: string): Promise<any> {
  if (!shouldUseMockData()) {
    return await apiRequest<any>(`/v1/labs/admin/${labId}`, {
      method: 'PATCH',
      auth: true,
      body: { coordinatorEmail },
    });
  }
}

export async function inviteToLab(
  email: string,
  invitationLink: string,
  role: UserRole,
): Promise<BackendUserResponse> {
  return apiRequest<BackendUserResponse>('/v1/labs/invite', {
    method: 'POST',
    auth: true,
    body: { email, invitationLink, role },
  });
}

export async function addExistingMember(userId: string): Promise<MemberResponse> {
  return apiRequest<MemberResponse>(`/v1/labs/members/${userId}`, {
    method: 'POST',
    auth: true,
  });
}

export async function addGuestMember(userId: string): Promise<MemberResponse> {
  return apiRequest<MemberResponse>(`/v1/labs/guests/${userId}`, {
    method: 'POST',
    auth: true,
  });
}

export async function getAvailableLabMembers(name?: string): Promise<MemberResponse[]> {
  const query = name ? `?name=${encodeURIComponent(name)}` : '';
  return apiRequest<MemberResponse[]>(`/v1/labs/members/available${query}`, {
    method: 'GET',
    auth: true,
  });
}

export async function updateReminderThreshold(days: number): Promise<Lab> {
  return apiRequest<Lab>('/v1/labs', {
    method: 'PATCH',
    auth: true,
    body: { reminderDaysBeforeDeadline: days },
  });
}

export async function removeLabMember(userId: string): Promise<MemberResponse> {
  if (!shouldUseMockData()) {
    return await apiRequest<MemberResponse>(`/v1/labs/members/${userId}`, {
      method: 'DELETE',
      auth: true,
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 500));
  return {
    user: {
      id: userId,
      email: 'removed@test.com',
      name: 'Removed User',
      role: 'LAB_MEMBER',
      photo: null,
      registrationDate: '2024-01-01T00:00:00',
      lastActiveDate: null,
    },
    workload: 0
  };
}

export async function getWorkloadBalance(): Promise<LabWorkloadResponse> {
  if (!shouldUseMockData()) {
    return await apiRequest<LabWorkloadResponse>('/v1/labs/workload', {
      method: 'GET',
      auth: true,
    });
  }
  
  return {
    reviewers: [
      { userId: '1', name: 'Dr. Johnson (Mock)', activeReviews: 2, capacity: 5 },
      { userId: '2', name: 'Dr. Chen (Mock)', activeReviews: 3, capacity: 5 },
    ],
    workloadThreshold: 4
  };
}

export async function updateWorkloadLimit(limit: number): Promise<LabWorkloadResponse> {
  if (!shouldUseMockData()) {
    return await apiRequest<LabWorkloadResponse>(`/v1/labs/workload-limit?limit=${limit}`, {
      method: 'PATCH',
      auth: true,
    });
  }
  return getWorkloadBalance();
}

export async function getReviewerAnalytics(): Promise<ReviewerAnalyticsResponse[]> {
  if (!shouldUseMockData()) {
    return await apiRequest<ReviewerAnalyticsResponse[]>('/v1/labs/reviewer-analytics', {
      method: 'GET',
      auth: true,
    });
  }
  
  return [
    { id: '1', name: 'Mock Reviewer', email: 'mock@test.com', avgScore: 8.5, timeliness: 95, reviewsCompleted: 10, currentLoad: 2, avgTurnaround: 4.5 }
  ];
}

export async function getCoordinatorDashboardStats(): Promise<CoordinatorDashboardResponse> {
  if (!shouldUseMockData()) {
    return await apiRequest<CoordinatorDashboardResponse>('/v1/labs/dashboard-stats', {
      method: 'GET',
      auth: true,
    });
  }
  
  return {
    activeReviewers: 12,
    pendingReviews: 5,
    completedReviews: 45,
    avgTurnaround: 5.2
  };
}

export async function getDashboardChartData(): Promise<DashboardChartDataResponse[]> {
  if (!shouldUseMockData()) {
    return await apiRequest<DashboardChartDataResponse[]>('/v1/labs/dashboard-chart', {
      method: 'GET',
      auth: true,
    });
  }
  
  return [
    { month: 'Jan', submissions: 45, reviews: 42 },
    { month: 'Feb', submissions: 52, reviews: 50 },
    { month: 'Mar', submissions: 48, reviews: 48 },
    { month: 'Apr', submissions: 61, reviews: 58 },
    { month: 'May', submissions: 55, reviews: 53 },
    { month: 'Jun', submissions: 67, reviews: 65 },
  ];
}

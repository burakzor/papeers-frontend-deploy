import type { Lab, User } from '../context/AuthContext';
import { MOCK_LABS } from '../data/mockLabs';
import { ApiError, apiRequest, isBackendConfigured, setAuthToken, shouldUseMockData } from '../lib/api';

const USER_STORAGE_KEY = 'prs.auth.user';
const SELECTED_LAB_STORAGE_KEY = 'prs.selected.lab';

interface BackendUserResponse {
  id: string;
  email: string;
  name?: string;
  photo?: string;
  role: string;
  lastActiveDate?: string;
  registrationDate?: string;
  labId?: string;
}

interface BackendLoginResponse {
  user: BackendUserResponse;
  access_token: string;
  refresh_token: string;
}

export interface AuthSession {
  user: User;
}

function mapBackendRole(role: string): User['role'] {
  switch (role.toUpperCase()) {
    case 'ADMIN': return 'admin';
    case 'COORDINATOR': return 'coordinator';
    case 'GUEST_MEMBER': return 'guest';
    default: return 'lab_member';
  }
}

export async function loginUser(email: string, password: string, isMobile: boolean = false): Promise<AuthSession> {
    if (isBackendConfigured()) {
        let response: BackendLoginResponse;
        try {
            response = await apiRequest<BackendLoginResponse>(`/v1/users/login/${encodeURIComponent(email)}`, {
                method: 'PATCH',
                auth: false,
                skipAuthRedirect: true,
                body: { password, isMobile: false },
            });
        } catch (err) {
            if (err instanceof ApiError && (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 404)) {
                throw new Error('Email or password incorrect.');
            }
            throw err;
        }

        setAuthToken(response.access_token);

        const user: User = {
            id: response.user.id,
            name: response.user.name ?? email,
            email: response.user.email,
            role: mapBackendRole(response.user.role),
            photo: response.user.photo ?? undefined,
            token: response.access_token,
            labId: response.user.labId ?? undefined,
        };

        persistUser(user);

        return { user };
    }

    // --- MOCK DATA FALLBACK ---
    await new Promise((resolve) => setTimeout(resolve, 1000));

    let role: User['role'] = 'lab_member';
    if (email.includes('admin')) {
        role = 'admin';
    } else if (email.includes('coordinator')) {
        role = 'coordinator';
    } else if (email.includes('guest')) {
        role = 'guest';
    }

    const user: User = {
        id: '1',
        name: email
            .split('@')[0]
            .replace('.', ' ')
            .split(' ')
            .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(' '),
        email,
        role,
        token: 'mock-jwt-token-12345', // <--- Add a fake token here so mock mode WebSockets don't crash
    };

    persistUser(user);
    return { user };
}

export async function fetchLabs(): Promise<Lab[]> {
  if (!shouldUseMockData()) {
    const response = await apiRequest<Lab[] | { content?: Lab[]; labs?: Lab[]; data?: Lab[] }>('/v1/labs');

    if (Array.isArray(response)) {
      return response;
    }

    return response.content ?? response.labs ?? response.data ?? [];
  }

  return MOCK_LABS;
}

export function getStoredUser(): User | null {
  return readFromStorage<User>(USER_STORAGE_KEY);
}

export function getStoredSelectedLab(): Lab | null {
  return readFromStorage<Lab>(SELECTED_LAB_STORAGE_KEY);
}

export function persistUser(user: User | null) {
  writeToStorage(USER_STORAGE_KEY, user);
}

export function persistSelectedLab(lab: Lab | null) {
  writeToStorage(SELECTED_LAB_STORAGE_KEY, lab);
}

export async function logoutUser(_userId: string): Promise<void> {
  if (!shouldUseMockData()) {
    await apiRequest(`/v1/users/logout`, {
      method: 'POST',
      auth: true,
    });
  }
}

export function clearStoredSession() {
  persistUser(null);
  persistSelectedLab(null);
  setAuthToken(null);
}

function readFromStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

function writeToStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') {
    return;
  }

  if (value === null) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

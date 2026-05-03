import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  clearStoredSession,
  fetchLabs,
  getStoredSelectedLab,
  getStoredUser,
  loginUser,
  logoutUser,
  persistSelectedLab,
  persistUser,
} from '../services/authService';
import { ApiError } from '../lib/api';

export interface Lab {
  id: string;
  name: string;
  institution?: string;
  memberCount?: number;
  reminderDaysBeforeDeadline?: number;
  role?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'coordinator' | 'lab_member' | 'guest';
    photo?: string;
    token?: string; // <-- Added this so WebSockets and APIs can authenticate!
    labId?: string;
}


interface AuthContextType {
  user: User | null;
  selectedLab: Lab | null;
  labs: Lab[];
  isAuthenticated: boolean;
  isLoadingLabs: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  selectLab: (lab: Lab) => void;
  refreshLabs: () => Promise<void>;
  updateUser: (updates: Partial<Pick<User, 'name' | 'email' | 'photo'>>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [selectedLab, setSelectedLab] = useState<Lab | null>(() => getStoredSelectedLab());
  const [labs, setLabs] = useState<Lab[]>([]);
  const [isLoadingLabs, setIsLoadingLabs] = useState(false);

  const refreshLabs = useCallback(async () => {
    if (!user) {
      setLabs([]);
      setIsLoadingLabs(false);
      return;
    }

    setIsLoadingLabs(true);

    try {
      const nextLabs = await fetchLabs();
      setLabs(nextLabs);

      if (selectedLab && !nextLabs.some((lab) => lab.id === selectedLab.id)) {
        setSelectedLab(null);
        persistSelectedLab(null);
      }
    } catch (error) {
      setLabs([]);
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        clearStoredSession();
        setUser(null);
        setSelectedLab(null);
      } else {
        console.error('Failed to refresh labs:', error);
      }
    } finally {
      setIsLoadingLabs(false);
    }
  }, [selectedLab, user]);

  useEffect(() => {
    void refreshLabs();
  }, [refreshLabs, user?.id]);

  const login = async (email: string, password: string): Promise<User> => {
    const session = await loginUser(email, password);
    setUser(session.user);
    return session.user;
  };

  const logout = () => {
    if (user) {
      void logoutUser(user.id).catch(() => { });
    }
    clearStoredSession();
    setUser(null);
    setSelectedLab(null);
    setLabs([]);
  };

  const updateUser = (updates: Partial<Pick<User, 'name' | 'email' | 'photo'>>) => {
    setUser((prev: User | null) => {
      if (!prev) return null;
      const next = { ...prev, ...updates };
      persistUser(next);
      return next;
    });
  };

  const selectLab = (lab: Lab) => {
    setSelectedLab(lab);
    persistSelectedLab(lab);

    // TODO(backend): If the backend supports an active-lab endpoint, persist the selection there as well.
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        selectedLab,
        labs,
        isAuthenticated: !!user,
        isLoadingLabs,
        login,
        logout,
        selectLab,
        refreshLabs,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

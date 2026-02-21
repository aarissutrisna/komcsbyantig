import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

interface Profile {
  id: string;
  username: string;
  nama: string;
  role: 'admin' | 'hrd' | 'cs';
  branch_id: string | null;
  faktor_pengali: number | null;
}

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await api.get<Profile>('/auth/profile');
      setUser(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    // Normal Login
    const { token, user: userData } = await api.post<{ token: string, user: Profile }>('/auth/login', {
      username,
      password,
    });

    localStorage.setItem('token', token);
    setUser(userData);
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const changePassword = async (newPassword: string) => {
    await api.post('/auth/change-password', { newPassword });
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, changePassword }}>
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

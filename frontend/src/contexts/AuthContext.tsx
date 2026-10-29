import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { socketService } from '../services/socket.service';
import { toast } from 'sonner';

interface UserProfile {
  firstName?: string;
  lastName?: string;
  service?: string;
  grade?: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  profile: UserProfile;
  mustChangePassword: boolean;
  permissions: Array<{ resource: string; actions: string[] }>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  permissions: Array<{ resource: string; actions: string[] }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [permissions, setPermissions] = useState<Array<{ resource: string; actions: string[] }>>([]);

  const clearSession = useCallback((redirectToLogin = false) => {
    socketService.disconnect();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setMustChangePassword(false);
    setPermissions([]);

    if (redirectToLogin) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const response = await authAPI.getProfile();

          if (response.success) {
            const profile = response.data;
            const parsedUser = { ...profile, mustChangePassword: Boolean(profile.mustChangePassword), permissions: profile.permissions || [] } as User;
            localStorage.setItem('user', JSON.stringify(parsedUser));
            setToken(storedToken);
            setUser(parsedUser);
            setMustChangePassword(parsedUser.mustChangePassword);
            setPermissions(parsedUser.permissions);
            socketService.connect(storedToken, parsedUser.profile?.service);
          } else {
            clearSession();
          }
        } catch (error) {
          console.error('Token invalide:', error);
          clearSession();
        }
      }

      setIsLoading(false);
    };

    void initializeAuth();
  }, [clearSession]);

  const refreshProfile = useCallback(async () => {
    const response = await authAPI.getProfile();
    if (!response.success) return;
    const refreshedUser = { ...response.data, mustChangePassword: Boolean(response.data.mustChangePassword), permissions: response.data.permissions || [] } as User;
    setUser(refreshedUser);
    setMustChangePassword(refreshedUser.mustChangePassword);
    setPermissions(refreshedUser.permissions);
    localStorage.setItem('user', JSON.stringify(refreshedUser));
  }, []);

  useEffect(() => {
    const onPasswordChangeRequired = () => setMustChangePassword(true);
    window.addEventListener('auth:password-change-required', onPasswordChangeRequired);
    return () => window.removeEventListener('auth:password-change-required', onPasswordChangeRequired);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      clearSession(true);
    };

    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [clearSession]);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(username, password);

      if (response.success) {
        const { token: newToken, user: newUser } = response.data;

        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));

        setToken(newToken);
        setUser(newUser);
        setMustChangePassword(Boolean(newUser.mustChangePassword));
        setPermissions(newUser.permissions || []);

        socketService.connect(newToken, newUser.profile?.service);

        toast.success('Connexion reussie', {
          description: `Bienvenue ${newUser.profile.firstName || ''} ${newUser.profile.lastName || ''}`.trim(),
        });
      }
    } catch (error: unknown) {
      console.error('Erreur de connexion:', error);

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authAPI.logout().catch(console.error);
    clearSession(true);

    toast.info('Deconnexion', {
      description: 'Vous avez ete deconnecte',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        mustChangePassword,
        permissions,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit etre utilise dans un AuthProvider');
  }
  return context;
};

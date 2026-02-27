import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
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
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

interface ApiErrorPayload {
  message?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback((redirectToLogin = false) => {
    socketService.disconnect();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);

    if (redirectToLogin) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          const response = await authAPI.getProfile();

          if (response.success) {
            const parsedUser = JSON.parse(storedUser) as User;
            setToken(storedToken);
            setUser(parsedUser);
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

        socketService.connect(newToken, newUser.profile?.service);

        toast.success('Connexion reussie', {
          description: `Bienvenue ${newUser.profile.firstName || ''} ${newUser.profile.lastName || ''}`.trim(),
        });
      }
    } catch (error: unknown) {
      console.error('Erreur de connexion:', error);

      let message = 'Identifiants invalides';
      if (error instanceof AxiosError<ApiErrorPayload>) {
        message = error.response?.data?.message || error.message || message;
      } else if (error instanceof Error) {
        message = error.message;
      }

      toast.error('Erreur de connexion', {
        description: message,
      });
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

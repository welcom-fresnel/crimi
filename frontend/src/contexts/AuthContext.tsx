import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { socketService } from '../services/socket.service';
import { toast } from 'sonner';

interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  profile: {
    firstName: string;
    lastName: string;
    service?: string;
    grade?: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger l'utilisateur depuis localStorage au démarrage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          // Vérifier si le token est toujours valide
          const response = await authAPI.getProfile();
          
          if (response.success) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));

            // Connexion WebSocket
            socketService.connect(storedToken, JSON.parse(storedUser).profile?.service);
          } else {
            // Token invalide, nettoyer localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('Token invalide:', error);
          // Token invalide, nettoyer localStorage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Login
  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);

      const response = await authAPI.login(username, password);

      if (response.success) {
        const { token: newToken, user: newUser } = response.data;

        // Sauvegarder dans localStorage
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));

        // Mettre à jour l'état
        setToken(newToken);
        setUser(newUser);

        // Connexion WebSocket
        socketService.connect(newToken, newUser.profile?.service);

        toast.success('Connexion réussie', {
          description: `Bienvenue ${newUser.profile.firstName} ${newUser.profile.lastName}`,
        });
      }
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      toast.error('Erreur de connexion', {
        description: error.response?.data?.message || 'Identifiants invalides',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = () => {
    // Déconnexion WebSocket
    socketService.disconnect();

    // Appel API logout (optionnel, pour l'audit)
    authAPI.logout().catch(console.error);

    // Nettoyer localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Réinitialiser l'état
    setToken(null);
    setUser(null);

    toast.info('Déconnexion', {
      description: 'Vous avez été déconnecté',
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
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};
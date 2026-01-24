import React, { createContext, useContext, useState, useEffect } from 'react';
import { criminalsAPI, crimeTypesAPI, auditAPI } from '../services/api';
import { socketService } from '../services/socket.service';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { Criminal, CrimeType } from '../types';

interface CriminalsContextType {
  criminals: Criminal[];
  crimeTypes: CrimeType[];
  auditLogs: any[]; // Logs d'audit (simplifié pour l'instant)
  isLoading: boolean;
  fetchCriminals: () => Promise<void>;
  fetchCrimeTypes: () => Promise<void>;
  addCriminal: (data: any) => Promise<void>;
  updateCriminal: (id: string, data: any) => Promise<void>;
  deleteCriminal: (id: string) => Promise<void>;
  searchCriminals: (params: any) => Promise<void>;
}

const CriminalsContext = createContext<CriminalsContextType | undefined>(undefined);

export const CriminalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [criminals, setCriminals] = useState<Criminal[]>([]);
  const [crimeTypes, setCrimeTypes] = useState<CrimeType[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  // Configuration des listeners temps réel
  const setupRealtimeListeners = () => {
    // Criminel créé
    socketService.onCriminalCreated((data) => {
      console.log('🆕 Nouveau criminel reçu:', data.criminal);
      
      // Vérifier si le criminel n'existe pas déjà (éviter les doublons)
      setCriminals((prev) => {
        const exists = prev.some(c => c.id === data.criminal.id);
        if (exists) {
          return prev;
        }
        return [data.criminal, ...prev];
      });
      
      toast.info('Nouveau criminel enregistré', {
        description: `Dossier ${data.criminal.caseNumber} créé par ${data.createdBy?.username || 'Système'}`,
      });
    });

    // Criminel mis à jour
    socketService.onCriminalUpdated((data) => {
      console.log('✏️ Criminel mis à jour:', data.criminal);
      
      setCriminals((prev) =>
        prev.map((c) => (c.id === data.criminal.id ? data.criminal : c))
      );
      
      toast.warning('Dossier mis à jour', {
        description: `Le dossier ${data.criminal.caseNumber} a été modifié`,
      });
    });

    // Criminel supprimé
    socketService.onCriminalDeleted((data) => {
      console.log('🗑️ Criminel supprimé:', data.criminalId);
      
      setCriminals((prev) => prev.filter((c) => c.id !== data.criminalId));
      
      toast.error('Dossier supprimé', {
        description: `Le dossier ${data.caseNumber} a été supprimé`,
      });
    });

    // Notifications génériques
    socketService.onNotification((notification) => {
      console.log('📢 Notification:', notification);
      
      const toastType = notification.type === 'error' ? 'error' : 
                       notification.type === 'warning' ? 'warning' :
                       notification.type === 'success' ? 'success' : 'info';
      
      toast[toastType](notification.title, {
        description: notification.message,
      });
    });
  };

  // Charger les criminels et types de crimes au démarrage
  useEffect(() => {
    if (isAuthenticated) {
      fetchCriminals();
      fetchCrimeTypes();
      fetchAuditLogs();
      setupRealtimeListeners();
    }

    return () => {
      socketService.off('criminal:created');
      socketService.off('criminal:updated');
      socketService.off('criminal:deleted');
      socketService.off('notification');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Récupérer les criminels
  const fetchCriminals = async () => {
    try {
      setIsLoading(true);
      const response = await criminalsAPI.getAll(1, 100);
      
      if (response.success) {
        setCriminals(response.data);
      }
    } catch (error) {
      console.error('Erreur de chargement:', error);
      toast.error('Erreur', {
        description: 'Impossible de charger les criminels',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Récupérer les types de crimes
  const fetchCrimeTypes = async () => {
    try {
      const response = await crimeTypesAPI.getAll();
      
      if (response.success) {
        setCrimeTypes(response.data);
      }
    } catch (error) {
      console.error('Erreur de chargement des types de crimes:', error);
      toast.error('Erreur', {
        description: 'Impossible de charger les types de crimes',
      });
    }
  };

  // Récupérer les logs d'audit
  const fetchAuditLogs = async () => {
    try {
      const response = await auditAPI.getAll(1, 100);
      
      if (response.success) {
        setAuditLogs(response.data || []);
      }
    } catch (error) {
      console.error('Erreur de chargement des logs d\'audit:', error);
      // Ne pas afficher d'erreur toast pour les logs d'audit (optionnel)
    }
  };

  // Ajouter un criminel
  const addCriminal = async (data: any) => {
    try {
      setIsLoading(true);
      const response = await criminalsAPI.create(data);
      
      if (response.success) {
        // Pas besoin d'ajouter manuellement, le WebSocket le fera
        toast.success('Criminel créé', {
          description: `Dossier ${response.data.caseNumber} créé avec succès`,
        });
      }
    } catch (error: any) {
      console.error('Erreur de création:', error);
      toast.error('Erreur', {
        description: error.response?.data?.message || 'Impossible de créer le criminel',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Mettre à jour un criminel
  const updateCriminal = async (id: string, data: any) => {
    try {
      setIsLoading(true);
      const response = await criminalsAPI.update(id, data);
      
      if (response.success) {
        toast.success('Criminel mis à jour', {
          description: 'Les modifications ont été enregistrées',
        });
      }
    } catch (error: any) {
      console.error('Erreur de mise à jour:', error);
      toast.error('Erreur', {
        description: error.response?.data?.message || 'Impossible de modifier le criminel',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Supprimer un criminel
  const deleteCriminal = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await criminalsAPI.delete(id);
      
      if (response.success) {
        toast.success('Criminel supprimé', {
          description: 'Le dossier a été supprimé',
        });
      }
    } catch (error: any) {
      console.error('Erreur de suppression:', error);
      toast.error('Erreur', {
        description: error.response?.data?.message || 'Impossible de supprimer le criminel',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Rechercher des criminels
  const searchCriminals = async (params: any) => {
    try {
      setIsLoading(true);
      const response = await criminalsAPI.search(params);
      
      if (response.success) {
        setCriminals(response.data);
      }
    } catch (error) {
      console.error('Erreur de recherche:', error);
      toast.error('Erreur', {
        description: 'Impossible de rechercher',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CriminalsContext.Provider
      value={{
        criminals,
        crimeTypes,
        auditLogs,
        isLoading,
        fetchCriminals,
        fetchCrimeTypes,
        addCriminal,
        updateCriminal,
        deleteCriminal,
        searchCriminals,
      }}
    >
      {children}
    </CriminalsContext.Provider>
  );
};

export const useCriminals = () => {
  const context = useContext(CriminalsContext);
  if (!context) {
    throw new Error('useCriminals doit être utilisé dans un CriminalsProvider');
  }
  return context;
};
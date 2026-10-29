import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { criminalsAPI, crimeTypesAPI } from '../services/api';
import { socketService } from '../services/socket.service';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { Criminal, CrimeType } from '../types';

type CriminalPayload = Partial<Criminal> & {
  id: string;
  caseNumber: string;
};

type CriminalMutationPayload = {
  caseNumber: string;
  firstName: string;
  lastName: string;
  crimeTypeId: string;
  description: string;
  alias?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  gender?: string;
  crimeDate?: string;
  crimeLocation?: string;
  status?: string;
  dangerLevel?: string;
  lastKnownAddress?: string;
  phoneNumber?: string;
  arrestation?: {
    arrestDate?: string;
    arrestLocation?: string;
    arrestingUnit?: string;
    arrestingOfficer?: string;
    warrantNumber?: string;
    notes?: string;
  };
};

type CriminalSearchParams = Record<string, string>;

interface ApiErrorPayload {
  message?: string;
}

interface CriminalsContextType {
  criminals: Criminal[];
  crimeTypes: CrimeType[];
  isLoading: boolean;
  fetchCriminals: () => Promise<void>;
  fetchCrimeTypes: () => Promise<void>;
  addCriminal: (data: CriminalMutationPayload) => Promise<Criminal | null>;
  updateCriminal: (id: string, data: Partial<CriminalMutationPayload>) => Promise<void>;
  upsertCriminal: (criminal: CriminalPayload) => void;
  searchCriminals: (params: CriminalSearchParams) => Promise<void>;
}

const CriminalsContext = createContext<CriminalsContextType | undefined>(undefined);

export const CriminalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [criminals, setCriminals] = useState<Criminal[]>([]);
  const [crimeTypes, setCrimeTypes] = useState<CrimeType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const searchParamsRef = useRef<CriminalSearchParams | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const scheduleRefresh = () => {
    if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      if (searchParamsRef.current) void searchCriminals(searchParamsRef.current);
      else void fetchCriminals();
    }, 1500);
  };

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof AxiosError<ApiErrorPayload>) {
      return error.response?.data?.message || error.message || fallback;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return fallback;
  };

  const mapCriminal = (criminal: CriminalPayload): Criminal => ({
    ...criminal,
    hasPhoto: Boolean(criminal.photo),
  } as Criminal);

  const upsertCriminal = (criminal: CriminalPayload) => {
    const mapped = mapCriminal(criminal);
    setCriminals((prev) => {
      const exists = prev.some((item) => item.id === mapped.id);
      if (exists) {
        return prev.map((item) => (item.id === mapped.id ? mapped : item));
      }
      return [mapped, ...prev];
    });
  };

  const setupRealtimeListeners = () => {
    socketService.onCriminalCreated((data) => {
      const received = data.criminal as CriminalPayload | undefined;
      if (received) {
        const mapped = mapCriminal(received);
        setCriminals((prev) => {
          const exists = prev.some((item) => item.id === mapped.id);
          if (exists) return prev;
          return [mapped, ...prev];
        });
      } else {
        scheduleRefresh();
      }

      toast.info('Nouveau dossier enregistré', {
        description: `Dossier ${data.caseNumber || ''} créé par ${data.by?.username || 'Système'}`,
      });
    });

    socketService.onCriminalUpdated((data) => {
      const received = data.criminal as CriminalPayload | undefined;
      if (received) {
        const mapped = mapCriminal(received);
        setCriminals((prev) => prev.map((item) => (item.id === mapped.id ? mapped : item)));
      } else {
        scheduleRefresh();
      }

      toast.warning('Dossier mis à jour', {
        description: `Le dossier ${data.caseNumber || ''} a été modifié par ${data.by?.username || 'Système'}`,
      });
    });

    socketService.onCriminalDeleted((data) => {
      if (!data.criminalId) return;

      setCriminals((prev) => prev.filter((item) => item.id !== data.criminalId));

      toast.error('Dossier supprime', {
        description: `Le dossier ${data.caseNumber || ''} a été supprimé par ${data.by?.username || 'Système'}`,
      });
    });

    socketService.onNotification((notification) => {
      const toastType =
        notification.type === 'error'
          ? 'error'
          : notification.type === 'warning'
            ? 'warning'
            : notification.type === 'success'
              ? 'success'
              : 'info';

      toast[toastType](notification.title || 'Notification', {
        description: notification.message,
      });
    });
  };

  useEffect(() => {
    if (isAuthenticated) {
      void fetchCriminals();
      void fetchCrimeTypes();
      setupRealtimeListeners();
    }

    return () => {
      if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
      socketService.off('criminal:created');
      socketService.off('criminal:updated');
      socketService.off('criminal:deleted');
      socketService.off('notification');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchCriminals = async () => {
    searchParamsRef.current = null;
    try {
      setIsLoading(true);
      const response = await criminalsAPI.getAll(1, 100);

      if (response.success) {
        const mapped = response.data.map((criminal) => mapCriminal(criminal as CriminalPayload));
        setCriminals(mapped);
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

  const addCriminal = async (data: CriminalMutationPayload): Promise<Criminal | null> => {
    try {
      setIsLoading(true);
      const response = await criminalsAPI.create(data);

      if (response.success) {
        toast.success('Criminel cree', {
          description: `Dossier ${response.data.caseNumber} cree avec succes`,
        });
        return response.data;
      }

      return null;
    } catch (error: unknown) {
      console.error('Erreur de creation:', error);
      toast.error('Erreur', {
        description: getErrorMessage(error, 'Impossible de creer le criminel'),
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCriminal = async (id: string, data: Partial<CriminalMutationPayload>) => {
    try {
      setIsLoading(true);
      const response = await criminalsAPI.update(id, data);

      if (response.success) {
        toast.success('Criminel mis a jour', {
          description: 'Les modifications ont ete enregistrees',
        });
      }
    } catch (error: unknown) {
      console.error('Erreur de mise a jour:', error);
      toast.error('Erreur', {
        description: getErrorMessage(error, 'Impossible de modifier le criminel'),
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const searchCriminals = async (params: CriminalSearchParams) => {
    searchParamsRef.current = params;
    try {
      setIsLoading(true);
      const response = await criminalsAPI.search(params);

      if (response.success) {
        const mapped = (response.data || []).map((criminal) => mapCriminal(criminal as CriminalPayload));
        setCriminals(mapped);
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
        isLoading,
        fetchCriminals,
        fetchCrimeTypes,
        addCriminal,
        updateCriminal,
        upsertCriminal,
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
    throw new Error('useCriminals doit etre utilise dans un CriminalsProvider');
  }
  return context;
};

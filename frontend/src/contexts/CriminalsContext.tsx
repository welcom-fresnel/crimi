import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { criminalsAPI, crimeTypesAPI } from '../services/api';
import { socketService } from '../services/socket.service';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { Criminal, CrimeType } from '../types';
import { createDebouncedRefresh } from '../lib/debounced-refresh';

type CriminalPayload = Partial<Criminal> & {
  id: string;
  caseNumber: string;
};

type CriminalMutationPayload = {
  caseNumber?: never;
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
interface CriminalPagination { page: number; limit: number; total: number; totalPages: number; }
interface CriminalRequest { page: number; filters: CriminalSearchParams; limit: number; }

interface ApiErrorPayload {
  message?: string;
}

interface CriminalsContextType {
  criminals: Criminal[];
  pagination: CriminalPagination;
  crimeTypes: CrimeType[];
  isLoading: boolean;
  loading: boolean;
  fetchCriminals: (page?: number, filters?: CriminalSearchParams, limit?: number) => Promise<void>;
  fetchCrimeTypes: () => Promise<void>;
  addCriminal: (data: CriminalMutationPayload) => Promise<Criminal | null>;
  updateCriminal: (id: string, data: Partial<CriminalMutationPayload>) => Promise<void>;
  upsertCriminal: (criminal: CriminalPayload) => void;
}

const CriminalsContext = createContext<CriminalsContextType | undefined>(undefined);

export const CriminalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [criminals, setCriminals] = useState<Criminal[]>([]);
  const [pagination, setPagination] = useState<CriminalPagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [crimeTypes, setCrimeTypes] = useState<CrimeType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const currentRequestRef = useRef<CriminalRequest>({ page: 1, filters: {}, limit: 10 });
  const fetchCriminalsRef = useRef<((page?: number, filters?: CriminalSearchParams, limit?: number) => Promise<void>) | null>(null);
  const refreshRef = useRef<ReturnType<typeof createDebouncedRefresh> | null>(null);
  if (!refreshRef.current) {
    refreshRef.current = createDebouncedRefresh(() => {
      const request = currentRequestRef.current;
      if (fetchCriminalsRef.current) void fetchCriminalsRef.current(request.page, request.filters, request.limit);
    });
  }

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof AxiosError<ApiErrorPayload>) {
      if (error.response?.status === 403 && /champ|renseign|déjà|already/i.test(error.response.data?.message || '')) {
        return 'Modification refusée : seuls les administrateurs peuvent modifier les champs déjà renseignés.';
      }
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
        refreshRef.current?.schedule();
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
        refreshRef.current?.schedule();
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
      void fetchCrimeTypes();
      setupRealtimeListeners();
    }

    return () => {
      refreshRef.current?.cancel();
      socketService.off('criminal:created');
      socketService.off('criminal:updated');
      socketService.off('criminal:deleted');
      socketService.off('notification');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchCriminals = async (page = 1, filters: CriminalSearchParams = {}, limit = 10) => {
    currentRequestRef.current = { page, filters, limit };
    try {
      setIsLoading(true);
      const hasFilters = Object.values(filters).some(Boolean);
      const response = hasFilters
        ? await criminalsAPI.search({ ...filters, page: String(page), limit: String(limit) })
        : await criminalsAPI.getAll(page, limit);

      if (response.success) {
        const mapped = response.data.map((criminal) => mapCriminal(criminal as CriminalPayload));
        setCriminals(mapped);
        setPagination(response.pagination || { page, limit, total: mapped.length, totalPages: 1 });
      }
    } catch {
      console.error('Échec du chargement des dossiers.');
      toast.error('Erreur', {
        description: 'Impossible de charger les criminels',
      });
    } finally {
      setIsLoading(false);
    }
  };
  fetchCriminalsRef.current = fetchCriminals;

  const fetchCrimeTypes = async () => {
    try {
      const response = await crimeTypesAPI.getAll();
      if (response.success) {
        setCrimeTypes(response.data);
      }
    } catch {
      console.error('Échec du chargement des types de crimes.');
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
      console.error('Échec de création du dossier.');
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
      console.error('Échec de mise à jour du dossier.');
      if (error instanceof AxiosError && error.response?.status === 403) throw error;
      toast.error('Erreur', {
        description: getErrorMessage(error, 'Impossible de modifier le criminel'),
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CriminalsContext.Provider
      value={{
        criminals,
        pagination,
        crimeTypes,
        isLoading,
        loading: isLoading,
        fetchCriminals,
        fetchCrimeTypes,
        addCriminal,
        updateCriminal,
        upsertCriminal,
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

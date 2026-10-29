import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { criminalsAPI } from '@/services/api';
import type { Criminal } from '@/types';

interface Pagination { page: number; limit: number; total: number; totalPages: number; }

export function useCriminalSearch() {
  const [results, setResults] = useState<Criminal[] | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const search = useCallback(async (filters: Record<string, string>, page: number, limit: number) => {
    setLoading(true);
    try {
      const response = await criminalsAPI.search({ ...filters, page: String(page), limit: String(limit) });
      setResults(response.data || []);
      setPagination(response.pagination || { page, limit, total: response.data?.length || 0, totalPages: 1 });
    } catch {
      toast.error('Recherche impossible', { description: 'Impossible de rechercher les dossiers.' });
    } finally {
      setLoading(false);
    }
  }, []);
  const reset = () => {
    setResults(null);
    setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
  };
  return { results, pagination, loading, search, reset };
}

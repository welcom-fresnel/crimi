import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useCriminals } from '@/contexts/CriminalsContext';
import { CriminalsTable } from '@/components/criminals/CriminalsTable';
import { CriminalCard } from '@/components/criminals/CriminalCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, LayoutGrid, List, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Criminal } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnimatedNumber, SectionHeader } from '@/components/hud';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

export default function CriminalsList() {
  const navigate = useNavigate();
  const { criminals, crimeTypes } = useCriminals();
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState('');
  const [crimeTypeFilter, setCrimeTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(isMobile ? 'grid' : 'table');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (isMobile) {
      setViewMode('grid');
    }
  }, [isMobile]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, crimeTypeFilter, statusFilter, viewMode]);

  const filteredCriminals = criminals.filter(criminal => {
    const matchesSearch =
      !searchQuery ||
      criminal.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      criminal.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (criminal.caseNumber || criminal.fileNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCrimeType =
      crimeTypeFilter === 'all' || criminal.crimeType?.id === crimeTypeFilter;

    const matchesStatus = statusFilter === 'all' || criminal.status === statusFilter;

    return matchesSearch && matchesCrimeType && matchesStatus;
  });

  const pageSize = viewMode === 'grid' ? 9 : 10;
  const totalPages = Math.max(1, Math.ceil(filteredCriminals.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pagedCriminals = filteredCriminals.slice(startIndex, startIndex + pageSize);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + maxPagesToShow - 1);
    if (end - start < maxPagesToShow - 1) {
      start = Math.max(1, end - maxPagesToShow + 1);
    }
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  };

  return (
    <div className="space-y-6">
      <div className="page-heading flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="eyebrow-label">REGISTRE OPERATIONNEL</p>
          <h1 className="display-heading">DOSSIERS CRIMINELS</h1>
          <p className="text-sm text-muted-foreground"><AnimatedNumber value={filteredCriminals.length} className="font-mono text-foreground" /> dossier(s) correspondant(s)</p>
        </div>
        <Button onClick={() => navigate('/criminals/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau dossier
        </Button>
      </div>

      <div className="criminal-filter-bar flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou numero de dossier..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <label className="sr-only" htmlFor="criminal-filter-type">Filtrer par type de crime</label>
        <select
          id="criminal-filter-type"
          aria-label="Filtrer par type de crime"
          value={crimeTypeFilter}
          onChange={(event) => setCrimeTypeFilter(event.target.value)}
          className="hud-input flex h-10 w-full rounded-sm border border-input bg-surface-elevated px-3 py-2 text-sm sm:w-[190px]"
        >
          <option value="all">Tous les types</option>
          {crimeTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
        </select>
        <label className="sr-only" htmlFor="criminal-filter-status">Filtrer par statut</label>
        <select
          id="criminal-filter-status"
          aria-label="Filtrer par statut"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="hud-input flex h-10 w-full rounded-sm border border-input bg-surface-elevated px-3 py-2 text-sm sm:w-[160px]"
        >
          <option value="all">Tous</option>
          <option value="ARRESTED">Arrete</option>
          <option value="ACTIVE">Recherche</option>
          <option value="RELEASED">Libere</option>
          <option value="DECEASED">Decede</option>
          <option value="UNKNOWN">Inconnu</option>
        </select>
        <div className="view-toggle flex border border-border" role="group" aria-label="Mode d’affichage">
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="icon"
            aria-label="Afficher en tableau"
            aria-pressed={viewMode === 'table'}
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            aria-label="Afficher en fiches"
            aria-pressed={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {(searchQuery || crimeTypeFilter !== 'all' || statusFilter !== 'all') && (
        <div className="active-filter-chips" aria-label="Filtres actifs">
          {searchQuery && <button type="button" className="filter-chip" onClick={() => setSearchQuery('')}>TEXTE · {searchQuery} <X aria-hidden="true" /></button>}
          {crimeTypeFilter !== 'all' && <button type="button" className="filter-chip" onClick={() => setCrimeTypeFilter('all')}>TYPE · {crimeTypes.find((type) => type.id === crimeTypeFilter)?.name || 'Selectionne'} <X aria-hidden="true" /></button>}
          {statusFilter !== 'all' && <button type="button" className="filter-chip" onClick={() => setStatusFilter('all')}>STATUT · {statusFilter} <X aria-hidden="true" /></button>}
        </div>
      )}

      <motion.div layout={!prefersReducedMotion} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.22 }}>
        {viewMode === 'table' ? (
          <CriminalsTable criminals={pagedCriminals} />
        ) : (
          <motion.div layout className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pagedCriminals.map((criminal, index) => (
              <motion.div key={criminal.id} layout={!prefersReducedMotion} initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.2, delay: prefersReducedMotion ? 0 : index * 0.04 }}>
                <CriminalCard criminal={criminal} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {filteredCriminals.length === 0 && (
        <div className="text-center py-12">
          <div className="empty-state"><SectionHeader title="AUCUN DOSSIER" description="Aucun dossier ne correspond aux filtres selectionnes." /></div>
        </div>
      )}

      {filteredCriminals.length > pageSize && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setPage(Math.max(1, currentPage - 1));
                }}
              />
            </PaginationItem>
            {getPageNumbers().map((pageNumber) => (
              <PaginationItem key={pageNumber}>
                <PaginationLink
                  href="#"
                  isActive={pageNumber === currentPage}
                  onClick={(event) => {
                    event.preventDefault();
                    setPage(pageNumber);
                  }}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            ))}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setPage(Math.min(totalPages, currentPage + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

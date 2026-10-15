import { useEffect, useState } from 'react';
import { useCriminals } from '@/contexts/CriminalsContext';
import { CriminalsTable } from '@/components/criminals/CriminalsTable';
import { CriminalCard } from '@/components/criminals/CriminalCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, LayoutGrid, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Criminal } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Liste des criminels</h1>
          <p className="text-muted-foreground">{filteredCriminals.length} dossier(s) trouve(s)</p>
        </div>
        <Button onClick={() => navigate('/criminals/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau dossier
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou numero de dossier..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          aria-label="Filtrer par type de crime"
          value={crimeTypeFilter}
          onChange={(event) => setCrimeTypeFilter(event.target.value)}
          className="flex h-10 w-full sm:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="all">Tous les types</option>
          {crimeTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
        </select>
        <select
          aria-label="Filtrer par statut"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="flex h-10 w-full sm:w-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="all">Tous</option>
          <option value="ARRESTED">Arrete</option>
          <option value="ACTIVE">Recherche</option>
          <option value="RELEASED">Libere</option>
          <option value="DECEASED">Decede</option>
          <option value="UNKNOWN">Inconnu</option>
        </select>
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <CriminalsTable criminals={pagedCriminals} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pagedCriminals.map(criminal => (
            <CriminalCard key={criminal.id} criminal={criminal} />
          ))}
        </div>
      )}

      {filteredCriminals.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucun dossier trouve</p>
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

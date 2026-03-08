import { useEffect, useState } from 'react';
import { useCriminals } from '@/contexts/CriminalsContext';
import { CriminalsTable } from '@/components/criminals/CriminalsTable';
import { CriminalCard } from '@/components/criminals/CriminalCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, LayoutGrid, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Criminal } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';

export default function CriminalsList() {
  const navigate = useNavigate();
  const { criminals, crimeTypes } = useCriminals();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [crimeTypeFilter, setCrimeTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(isMobile ? 'grid' : 'table');

  useEffect(() => {
    if (isMobile) {
      setViewMode('grid');
    }
  }, [isMobile]);

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
        <Select value={crimeTypeFilter} onValueChange={setCrimeTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Type de crime" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {crimeTypes && crimeTypes.length > 0 ? (
              crimeTypes.map(type => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="__none__" disabled>Aucun type disponible</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="ARRESTED">Arrete</SelectItem>
              <SelectItem value="ACTIVE">Recherche</SelectItem>
              <SelectItem value="RELEASED">Libere</SelectItem>
              <SelectItem value="DECEASED">Decede</SelectItem>
              <SelectItem value="UNKNOWN">Inconnu</SelectItem>
            </SelectContent>
          </Select>
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
        <CriminalsTable criminals={filteredCriminals} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCriminals.map(criminal => (
            <CriminalCard key={criminal.id} criminal={criminal} />
          ))}
        </div>
      )}

      {filteredCriminals.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucun dossier trouve</p>
        </div>
      )}
    </div>
  );
}

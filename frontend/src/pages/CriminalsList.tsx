import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useCriminals } from '@/contexts/CriminalsContext';
import { CriminalsTable } from '@/components/criminals/CriminalsTable';
import { CriminalCard } from '@/components/criminals/CriminalCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, LayoutGrid, List, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnimatedNumber, SectionHeader } from '@/components/hud';
import { usePermissions } from '@/hooks/usePermissions';

export default function CriminalsList() {
  const navigate = useNavigate();
  const { criminals, crimeTypes, pagination, isLoading, fetchCriminals } = useCriminals();
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();
  const { can } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [caseNumberQuery, setCaseNumberQuery] = useState('');
  const [crimeTypeFilter, setCrimeTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dangerFilter, setDangerFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(isMobile ? 'grid' : 'table');
  const [page, setPage] = useState(1);
  const pageSize = viewMode === 'grid' ? 9 : 10;
  const filters = useMemo(() => Object.fromEntries(Object.entries({
    name: searchQuery.trim(), caseNumber: caseNumberQuery.trim(),
    crimeTypeId: crimeTypeFilter, status: statusFilter, dangerLevel: dangerFilter,
  }).filter(([, value]) => value)), [searchQuery, caseNumberQuery, crimeTypeFilter, statusFilter, dangerFilter]);

  useEffect(() => { if (isMobile) setViewMode('grid'); }, [isMobile]);
  useEffect(() => { setPage(1); }, [searchQuery, caseNumberQuery, crimeTypeFilter, statusFilter, dangerFilter, viewMode]);
  useEffect(() => {
    void fetchCriminals(page, filters, pageSize);
    // fetchCriminals is a context action whose identity changes on render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters, pageSize]);

  const totalPages = Math.max(1, pagination.totalPages);
  const currentPage = pagination.page || page;
  const clearFilters = () => { setSearchQuery(''); setCaseNumberQuery(''); setCrimeTypeFilter(''); setStatusFilter(''); setDangerFilter(''); };

  return <div className="space-y-6">
    <div className="page-heading flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="eyebrow-label">REGISTRE OPERATIONNEL</p><h1 className="display-heading">DOSSIERS CRIMINELS</h1><p className="text-sm text-muted-foreground"><AnimatedNumber value={pagination.total} className="font-mono text-foreground" /> dossier(s) correspondant(s)</p></div>
      {can('criminals', 'create') && <Button onClick={() => navigate('/criminals/new')}><Plus className="mr-2 h-4 w-4" />Nouveau dossier</Button>}
    </div>
    <div className="criminal-filter-bar flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Rechercher par nom" placeholder="Rechercher par nom..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
      <Input aria-label="Numéro de dossier" placeholder="N° dossier" value={caseNumberQuery} onChange={(e) => setCaseNumberQuery(e.target.value)} className="sm:w-40" />
      <select aria-label="Filtrer par type d’infraction" value={crimeTypeFilter} onChange={(e) => setCrimeTypeFilter(e.target.value)} className="hud-input h-10 rounded-sm border border-input bg-surface-elevated px-3 text-sm sm:w-44"><option value="">Tous les types</option>{crimeTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select>
      <select aria-label="Filtrer par situation" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="hud-input h-10 rounded-sm border border-input bg-surface-elevated px-3 text-sm sm:w-36"><option value="">Toutes situations</option>{['ARRESTED', 'ACTIVE', 'RELEASED', 'DECEASED', 'UNKNOWN'].map((v) => <option key={v} value={v}>{v}</option>)}</select>
      <select aria-label="Filtrer par niveau de danger" value={dangerFilter} onChange={(e) => setDangerFilter(e.target.value)} className="hud-input h-10 rounded-sm border border-input bg-surface-elevated px-3 text-sm sm:w-36"><option value="">Tous dangers</option>{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((v) => <option key={v} value={v}>{v}</option>)}</select>
      <div className="view-toggle flex border border-border" role="group" aria-label="Mode d’affichage"><Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="icon" aria-label="Afficher en tableau" aria-pressed={viewMode === 'table'} onClick={() => setViewMode('table')}><List className="h-4 w-4" /></Button><Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" aria-label="Afficher en fiches" aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button></div>
    </div>
    {Object.keys(filters).length > 0 && <div className="active-filter-chips"><span className="text-xs text-muted-foreground">Filtres actifs</span><Button type="button" variant="ghost" size="sm" onClick={clearFilters}>Effacer <X className="ml-1 h-3 w-3" /></Button></div>}
    <motion.div layout={!prefersReducedMotion} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.22 }}>
      {viewMode === 'table' ? <CriminalsTable criminals={criminals} /> : <motion.div layout className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{criminals.map((criminal, index) => <motion.div key={criminal.id} layout={!prefersReducedMotion} initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.2, delay: prefersReducedMotion ? 0 : index * 0.04 }}><CriminalCard criminal={criminal} /></motion.div>)}</motion.div>}
    </motion.div>
    {!isLoading && criminals.length === 0 && <div className="py-12 text-center"><div className="empty-state"><SectionHeader title="AUCUN DOSSIER" description="Aucun dossier ne correspond aux filtres sélectionnés." /></div></div>}
    <div className="flex items-center justify-between"><Button variant="outline" disabled={currentPage <= 1 || isLoading} onClick={() => setPage(Math.max(1, currentPage - 1))}>Précédent</Button><span className="text-sm text-muted-foreground">Page {currentPage} / {totalPages}</span><Button variant="outline" disabled={currentPage >= totalPages || isLoading} onClick={() => setPage(Math.min(totalPages, currentPage + 1))}>Suivant</Button></div>
  </div>;
}

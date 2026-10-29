import { useState } from 'react';
import { CriminalsTable } from '@/components/criminals/CriminalsTable';
import { CriminalCard } from '@/components/criminals/CriminalCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, RotateCcw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCriminalSearch } from '@/hooks/useCriminalSearch';
import { AnimatedNumber, SectionHeader } from '@/components/hud';

export default function SearchPage() {
  const isMobile = useIsMobile();
  const { results, pagination, loading, search, reset } = useCriminalSearch();
  const [searchName, setSearchName] = useState('');
  const [searchCaseNumber, setSearchCaseNumber] = useState('');
  const [searchCrimeType, setSearchCrimeType] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [searchDanger, setSearchDanger] = useState('');
  const [crimeTypes, setCrimeTypes] = useState<Array<{ id: string; name: string }>>([]);

  const loadCrimeTypes = async () => {
    if (crimeTypes.length) return;
    const { crimeTypesAPI } = await import('@/services/api');
    const response = await crimeTypesAPI.getAll();
    if (response.success) setCrimeTypes(response.data);
  };

  const filters = () => Object.fromEntries(Object.entries({
    name: searchName.trim(), caseNumber: searchCaseNumber.trim(), crimeTypeId: searchCrimeType,
    status: searchStatus, dangerLevel: searchDanger,
  }).filter(([, value]) => value));

  const runSearch = (page = 1) => void search(filters(), page, isMobile ? 9 : 10);
  const handleReset = () => {
    setSearchName(''); setSearchCaseNumber(''); setSearchCrimeType(''); setSearchStatus(''); setSearchDanger(''); reset();
  };

  return (
    <div className="space-y-6">
      <div className="page-heading">
        <p className="eyebrow-label">INTERROGATION DU REGISTRE</p>
        <h1 className="display-heading">RECHERCHE AVANCÉE</h1>
        <p className="text-sm text-muted-foreground">Filtrez les dossiers autorisés par identité et critères opérationnels.</p>
      </div>
      <Card className="glass-card">
        <CardHeader><CardTitle>CRITÈRES DE RECHERCHE</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2"><Label htmlFor="searchName">Nom / prénom</Label><Input id="searchName" value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="Ex. Jean Dupont" /></div>
            <div className="space-y-2"><Label htmlFor="searchCaseNumber">N° dossier</Label><Input id="searchCaseNumber" value={searchCaseNumber} onChange={(e) => setSearchCaseNumber(e.target.value)} placeholder="Ex. 2026-000001" /></div>
            <div className="space-y-2"><Label>Type d’infraction</Label><select onFocus={() => void loadCrimeTypes()} aria-label="Filtrer par type d’infraction" value={searchCrimeType} onChange={(e) => setSearchCrimeType(e.target.value)} className="hud-input flex h-10 w-full rounded-sm border border-input bg-surface-elevated px-3 text-sm"><option value="">Tous les types</option>{crimeTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></div>
            <div className="space-y-2"><Label>Situation de la personne</Label><select aria-label="Filtrer par situation" value={searchStatus} onChange={(e) => setSearchStatus(e.target.value)} className="hud-input flex h-10 w-full rounded-sm border border-input bg-surface-elevated px-3 text-sm"><option value="">Toutes</option>{['ARRESTED', 'ACTIVE', 'RELEASED', 'DECEASED', 'UNKNOWN'].map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
            <div className="space-y-2"><Label>Niveau de danger</Label><select aria-label="Filtrer par niveau de danger" value={searchDanger} onChange={(e) => setSearchDanger(e.target.value)} className="hud-input flex h-10 w-full rounded-sm border border-input bg-surface-elevated px-3 text-sm"><option value="">Tous</option>{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((level) => <option key={level} value={level}>{level}</option>)}</select></div>
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row">
            <Button onClick={() => runSearch()} disabled={loading}><Search className="mr-2 h-4 w-4" />Rechercher</Button>
            <Button variant="outline" onClick={handleReset}><RotateCcw className="mr-2 h-4 w-4" />Réinitialiser</Button>
          </div>
        </CardContent>
      </Card>
      {results !== null && <div className="space-y-4">
        <h2 className="text-lg font-semibold">RÉSULTATS · <AnimatedNumber value={pagination.total} className="font-mono text-primary" /> DOSSIER(S)</h2>
        {results.length ? (isMobile ? <div className="grid gap-4 sm:grid-cols-2">{results.map((criminal) => <CriminalCard key={criminal.id} criminal={criminal} />)}</div> : <CriminalsTable criminals={results} />) : <Card className="glass-card"><CardContent className="py-12 text-center"><SectionHeader title="AUCUN RÉSULTAT" description="Aucun dossier ne correspond aux critères actifs." /></CardContent></Card>}
        <div className="flex items-center justify-between"><Button variant="outline" disabled={pagination.page <= 1 || loading} onClick={() => runSearch(pagination.page - 1)}>Précédent</Button><span className="text-sm text-muted-foreground">Page {pagination.page} / {pagination.totalPages}</span><Button variant="outline" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => runSearch(pagination.page + 1)}>Suivant</Button></div>
      </div>}
    </div>
  );
}

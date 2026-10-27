import { useState } from 'react';
import { useCriminals } from '@/contexts/CriminalsContext';
import { CriminalsTable } from '@/components/criminals/CriminalsTable';
import { CriminalCard } from '@/components/criminals/CriminalCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, RotateCcw } from 'lucide-react';
import { Criminal } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnimatedNumber, SectionHeader } from '@/components/hud';

export default function SearchPage() {
  const { criminals, crimeTypes } = useCriminals();
  const isMobile = useIsMobile();
  const [searchName, setSearchName] = useState('');
  const [searchFileNumber, setSearchFileNumber] = useState('');
  const [searchCrimeType, setSearchCrimeType] = useState<string>('all');
  const [searchStatus, setSearchStatus] = useState<string>('all');
  const [results, setResults] = useState<Criminal[] | null>(null);

  const handleSearch = () => {
    let filtered = criminals;

    if (searchName) {
      const lowerName = searchName.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.firstName.toLowerCase().includes(lowerName) ||
          c.lastName.toLowerCase().includes(lowerName)
      );
    }

    if (searchFileNumber) {
      filtered = filtered.filter(c =>
        c.caseNumber?.toLowerCase().includes(searchFileNumber.toLowerCase())
      );
    }

    if (searchCrimeType !== 'all') {
      filtered = filtered.filter(c => c.crimeType?.id === searchCrimeType);
    }

    if (searchStatus !== 'all') {
      filtered = filtered.filter(c => c.status === searchStatus);
    }

    setResults(filtered);
  };

  const handleReset = () => {
    setSearchName('');
    setSearchFileNumber('');
    setSearchCrimeType('all');
    setSearchStatus('all');
    setResults(null);
  };

  return (
    <div className="space-y-6">
      <div className="page-heading">
        <p className="eyebrow-label">INTERROGATION DU REGISTRE</p>
        <h1 className="display-heading">RECHERCHE AVANCEE</h1>
        <p className="text-sm text-muted-foreground">Filtrez les dossiers autorises par identite et criteres operationnels.</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>CRITERES DE RECHERCHE</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="searchName">Nom / Prénom</Label>
              <Input
                id="searchName"
                placeholder="Ex: Diallo, Moussa..."
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="searchFileNumber">N° Dossier</Label>
              <Input
                id="searchFileNumber"
                placeholder="Ex: DKR-2024-001"
                value={searchFileNumber}
                onChange={e => setSearchFileNumber(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Type de crime</Label>
              <select
                aria-label="Filtrer par type de crime"
                value={searchCrimeType}
                onChange={(event) => setSearchCrimeType(event.target.value)}
                className="hud-input flex h-10 w-full rounded-sm border border-input bg-surface-elevated px-3 py-2 text-sm"
              >
                <option value="all">Tous les types</option>
                {crimeTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <select
                aria-label="Filtrer par statut"
                value={searchStatus}
                onChange={(event) => setSearchStatus(event.target.value)}
                className="hud-input flex h-10 w-full rounded-sm border border-input bg-surface-elevated px-3 py-2 text-sm"
              >
                <option value="all">Tous les statuts</option>
                <option value="ARRESTED">Arrete</option>
                <option value="ACTIVE">Recherche</option>
                <option value="RELEASED">Libere</option>
                <option value="DECEASED">Decede</option>
                <option value="UNKNOWN">Inconnu</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row">
            <Button onClick={handleSearch} className="w-full sm:w-auto">
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </Button>
            <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {results !== null && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            RESULTATS · <AnimatedNumber value={results.length} className="font-mono text-primary" /> DOSSIER(S)
          </h2>
          {results.length > 0 ? (
            isMobile ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {results.map((criminal) => (
                  <CriminalCard key={criminal.id} criminal={criminal} />
                ))}
              </div>
            ) : (
              <CriminalsTable criminals={results} />
            )
          ) : (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <SectionHeader title="AUCUN RESULTAT" description="Aucun dossier ne correspond aux criteres actifs." />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}


import { useState } from 'react';
import { useCriminals } from '@/contexts/CriminalsContext';
import { CriminalsTable } from '@/components/criminals/CriminalsTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, RotateCcw } from 'lucide-react';
import { Criminal } from '@/types';

export default function SearchPage() {
  const { criminals, crimeTypes } = useCriminals();
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
      filtered = filtered.filter(c => c.crimeType.id === searchCrimeType);
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recherche avancée</h1>
        <p className="text-muted-foreground">Recherchez des dossiers criminels avec des filtres précis</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Critères de recherche</CardTitle>
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
              <Select value={searchCrimeType} onValueChange={setSearchCrimeType}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Tous les types" />
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
                    <SelectItem value="" disabled>Aucun type disponible</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={searchStatus} onValueChange={setSearchStatus}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="arrested">Arrêté</SelectItem>
                  <SelectItem value="wanted">Recherché</SelectItem>
                  <SelectItem value="released">Libéré</SelectItem>
                  <SelectItem value="deceased">Décédé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
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
            Résultats ({results.length} dossier{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''})
          </h2>
          {results.length > 0 ? (
            <CriminalsTable criminals={results} />
          ) : (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucun dossier ne correspond à vos critères</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

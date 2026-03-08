import { useParams, useNavigate } from 'react-router-dom';
import { useCriminals } from '@/contexts/CriminalsContext';
import { CriminalForm } from '@/components/criminals/CriminalForm';
import { Button } from '@/components/ui/button';

export default function CriminalEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { criminals, isLoading } = useCriminals();

  const criminal = criminals.find(c => c.id === id);

  if (!criminal && isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chargement du dossier...</p>
      </div>
    );
  }

  if (!criminal) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Dossier non trouvé</p>
        <Button variant="link" onClick={() => navigate('/criminals')}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Modifier le dossier</h1>
        <p className="text-muted-foreground">
          {criminal.lastName} {criminal.firstName} - {criminal.caseNumber || criminal.fileNumber}
        </p>
      </div>
      <CriminalForm criminal={criminal} isEditing />
    </div>
  );
}

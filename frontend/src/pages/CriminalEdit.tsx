import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { criminalsAPI } from '@/services/api';
import { Criminal } from '@/types';
import { useCriminals } from '@/contexts/CriminalsContext';
import { CriminalForm } from '@/components/criminals/CriminalForm';
import { Button } from '@/components/ui/button';

export default function CriminalEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { criminals, isLoading } = useCriminals();
  const [loadedCriminal, setLoadedCriminal] = useState<Criminal>();
  const [loadingDetail, setLoadingDetail] = useState(false);

  const listedCriminal = criminals.find(c => c.id === id);
  const criminal = listedCriminal || loadedCriminal;

  useEffect(() => {
    if (!id || listedCriminal) return;
    let active = true;
    setLoadingDetail(true);
    criminalsAPI.getById(id).then((response) => { if (active && response.success) setLoadedCriminal(response.data); })
      .catch(() => undefined).finally(() => { if (active) setLoadingDetail(false); });
    return () => { active = false; };
  }, [id, listedCriminal]);

  if (!criminal && (isLoading || loadingDetail || criminals.length === 0)) {
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

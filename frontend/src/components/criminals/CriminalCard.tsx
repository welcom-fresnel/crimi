import { Criminal } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { Eye, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DangerGauge } from '@/components/hud';
import { CriminalPhoto } from './CriminalPhoto';
import { usePermissions } from '@/hooks/usePermissions';

interface CriminalCardProps {
  criminal: Criminal;
}

export function CriminalCard({ criminal }: CriminalCardProps) {
  const navigate = useNavigate();
  const { can } = usePermissions();

  return (
    <Card className={`criminal-record-card glass-card status-frame-${criminal.status.toLowerCase()}`}>
      <CardContent className="p-4">
        <div className="flex gap-3">
            <CriminalPhoto criminalId={criminal.id} hasPhoto={Boolean(criminal.photo)} version={criminal.updatedAt} alt={`${criminal.firstName} ${criminal.lastName}`} className="criminal-record-photo h-20 w-20 flex-shrink-0 bg-surface-elevated" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-bold uppercase tracking-[0.03em] text-foreground truncate">
                  {criminal.lastName} {criminal.firstName}
                </h3>
                <p className="font-mono text-xs text-muted-foreground">{criminal.caseNumber || criminal.fileNumber}</p>
              </div>
              <StatusBadge status={criminal.status} />
            </div>
            <div className="mt-2"><DangerGauge level={criminal.dangerLevel} /></div>
            <div className="mt-2 space-y-1">
              <p className="text-sm">
                <span className="text-muted-foreground">Crime :</span>{' '}
                <span className="font-medium">{criminal.crimeType?.name || 'Type inconnu'}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Lieu :</span> {criminal.arrestLocation}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t">
          {can('criminals', 'update') && <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => navigate(`/criminals/${criminal.id}`)}
          >
            <Eye className="h-4 w-4" />
            Ouvrir
          </Button>}
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => navigate(`/criminals/${criminal.id}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Modifier
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

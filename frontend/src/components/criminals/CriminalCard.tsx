import { Criminal } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { Eye, Pencil, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CriminalCardProps {
  criminal: Criminal;
}

export function CriminalCard({ criminal }: CriminalCardProps) {
  const navigate = useNavigate();
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  const photoSrc = criminal.photoUrl ?? (criminal.photo ? `${apiBase}${criminal.photo}` : undefined);

  return (
    <Card className="glass-card hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
            <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            {photoSrc ? (
              <img
                src={photoSrc}
                alt={`${criminal.firstName} ${criminal.lastName}`}
                className="h-full w-full object-cover rounded-lg"
              />
            ) : (
              <User className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground truncate">
                  {criminal.lastName} {criminal.firstName}
                </h3>
                <p className="text-sm text-muted-foreground">{criminal.caseNumber || criminal.fileNumber}</p>
              </div>
              <StatusBadge status={criminal.status} />
            </div>
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
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => navigate(`/criminals/${criminal.id}`)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Voir
          </Button>
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

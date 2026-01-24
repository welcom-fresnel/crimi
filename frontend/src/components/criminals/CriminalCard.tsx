import { Criminal } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { Eye, Pencil, Trash2, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CriminalCardProps {
  criminal: Criminal;
  onDelete?: (id: string) => void;
}

export function CriminalCard({ criminal, onDelete }: CriminalCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="glass-card hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            {criminal.photoUrl ? (
              <img
                src={criminal.photoUrl}
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
                <span className="font-medium">{criminal.crimeType.name}</span>
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
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete?.(criminal.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

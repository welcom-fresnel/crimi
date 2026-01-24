import { Criminal } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CriminalsTableProps {
  criminals: Criminal[];
  onDelete?: (id: string) => void;
}

export function CriminalsTable({ criminals, onDelete }: CriminalsTableProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Dossier</TableHead>
            <TableHead>Nom complet</TableHead>
            <TableHead>Type de crime</TableHead>
            <TableHead>Date d'arrestation</TableHead>
            <TableHead>Lieu</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {criminals.map(criminal => (
            <TableRow key={criminal.id}>
              <TableCell className="font-medium">{criminal.caseNumber || criminal.fileNumber}</TableCell>
              <TableCell>
                {criminal.lastName} {criminal.firstName}
              </TableCell>
              <TableCell>{criminal.crimeType?.name || 'Type inconnu'}</TableCell>
              <TableCell>
                {(criminal.arrestDate || criminal.crimeDate) ? (
                  format(new Date(criminal.arrestDate || criminal.crimeDate!), 'dd MMM yyyy', { locale: fr })
                ) : (
                  <span className="text-muted-foreground">Non renseignée</span>
                )}
              </TableCell>
              <TableCell>{criminal.arrestLocation || criminal.crimeLocation || '-'}</TableCell>
              <TableCell>
                <StatusBadge status={criminal.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/criminals/${criminal.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/criminals/${criminal.id}/edit`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete?.(criminal.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

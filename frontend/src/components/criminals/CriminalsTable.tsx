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
import { Eye, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DangerGauge } from '@/components/hud';
import { usePermissions } from '@/hooks/usePermissions';

interface CriminalsTableProps {
  criminals: Criminal[];
}

export function CriminalsTable({ criminals }: CriminalsTableProps) {
  const navigate = useNavigate();
  const { can } = usePermissions();

  const formatDateSafe = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return format(date, 'dd MMM yyyy', { locale: fr });
  };

  return (
    <div className="criminals-table-shell hud-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">N° Dossier</TableHead>
              <TableHead className="min-w-[120px]">Nom</TableHead>
              <TableHead className="hidden sm:table-cell min-w-[100px]">Type</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[120px]">Date</TableHead>
              <TableHead className="hidden md:table-cell min-w-[80px]">Lieu</TableHead>
              <TableHead className="min-w-[80px]">Statut</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[110px]">Danger</TableHead>
              <TableHead className="text-right min-w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {criminals.map(criminal => (
              <TableRow key={criminal.id}>
                <TableCell className="font-medium text-xs sm:text-sm">
                  <span className="font-mono text-xs">{criminal.caseNumber || criminal.fileNumber}</span>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium text-sm">
                      {criminal.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground sm:hidden">
                      {criminal.firstName}
                    </div>
                    <div className="hidden sm:block text-sm">
                      {criminal.firstName}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm">
                  {criminal.crimeType?.name || 'Type inconnu'}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  {(criminal.arrestDate || criminal.crimeDate) ? (
                    formatDateSafe(criminal.arrestDate || criminal.crimeDate!) || (
                      <span className="text-muted-foreground text-xs">Non renseignee</span>
                    )
                  ) : (
                    <span className="text-muted-foreground text-xs">Non renseignee</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  {criminal.arrestLocation || criminal.crimeLocation || '-'}
                </TableCell>
                <TableCell>
                  <StatusBadge status={criminal.status} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <DangerGauge level={criminal.dangerLevel} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {can('criminals', 'update') && <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Ouvrir le dossier ${criminal.caseNumber || criminal.fileNumber}`}
                      onClick={() => navigate(`/criminals/${criminal.id}`)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hidden sm:flex"
                      aria-label={`Modifier le dossier ${criminal.caseNumber || criminal.fileNumber}`}
                      onClick={() => navigate(`/criminals/${criminal.id}/edit`)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

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

interface CriminalsTableProps {
  criminals: Criminal[];
}

export function CriminalsTable({ criminals }: CriminalsTableProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border bg-card">
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
              <TableHead className="text-right min-w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {criminals.map(criminal => (
              <TableRow key={criminal.id}>
                <TableCell className="font-medium text-xs sm:text-sm">
                  {criminal.caseNumber || criminal.fileNumber}
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
                    format(new Date(criminal.arrestDate || criminal.crimeDate!), 'dd MMM yyyy', { locale: fr })
                  ) : (
                    <span className="text-muted-foreground text-xs">Non renseignée</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  {criminal.arrestLocation || criminal.crimeLocation || '-'}
                </TableCell>
                <TableCell>
                  <StatusBadge status={criminal.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => navigate(`/criminals/${criminal.id}`)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hidden sm:flex"
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

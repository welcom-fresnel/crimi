import { useCriminals } from '@/contexts/CriminalsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function HistoryPage() {
  const { auditLogs } = useCriminals();

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="h-4 w-4" />;
      case 'update':
        return <Pencil className="h-4 w-4" />;
      case 'delete':
        return <Trash2 className="h-4 w-4" />;
      case 'view':
        return <Eye className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getActionBadge = (action: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      create: { label: 'Création', variant: 'default' },
      update: { label: 'Modification', variant: 'secondary' },
      delete: { label: 'Suppression', variant: 'destructive' },
      view: { label: 'Consultation', variant: 'outline' },
    };
    const { label, variant } = config[action] || { label: action, variant: 'outline' as const };
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Historique des actions</h1>
        <p className="text-muted-foreground">Traçabilité complète des opérations effectuées</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Journal d'activité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Date & Heure</TableHead>
                  <TableHead className="min-w-[100px]">Utilisateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="min-w-[80px]">Dossier</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[150px]">Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs && auditLogs.length > 0 ? (
                  auditLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm">
                          {format(new Date(log.createdAt || log.timestamp), "dd/MM/yyyy", { locale: fr })}
                          <br />
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(log.createdAt || log.timestamp), "HH:mm", { locale: fr })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-medium text-primary">
                              {(log.userName || log.user?.username || 'U')
                                .split(' ')
                                .map((n: string) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)}
                            </span>
                          </div>
                          <span className="text-sm font-medium truncate max-w-[80px]">
                            {log.userName || log.user?.username || 'Utilisateur'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            {getActionIcon(log.action?.toLowerCase() || 'view')}
                            <span className="text-xs">
                              {getActionBadge(log.action?.toLowerCase() || 'view')}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm truncate max-w-[60px] block">
                          {log.criminalName || log.entityId || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {log.changes ? (
                          <span className="text-sm text-muted-foreground">
                            {typeof log.changes === 'object' 
                              ? Object.entries(log.changes)
                                  .map(([key, val]: [string, any]) => {
                                    if (val && typeof val === 'object' && ('old' in val || 'before' in val)) {
                                      return `${key}: ${val.old || val.before} → ${val.new || val.after}`;
                                    }
                                    return `${key}: modifié`;
                                  })
                                  .join(', ')
                              : 'Modifications effectuées'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Aucun log d'audit disponible
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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

interface ChangeValue {
  old?: unknown;
  new?: unknown;
  before?: unknown;
  after?: unknown;
}

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
      create: { label: 'Creation', variant: 'default' },
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
        <p className="text-muted-foreground">Tracabilite complete des operations effectuees</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Journal d'activite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:hidden">
            {auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <div key={log.id} className="rounded-lg border p-3 space-y-2 bg-background/70">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(log.createdAt || log.timestamp || Date.now()), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </div>
                    {getActionBadge((log.action || 'view').toLowerCase())}
                  </div>
                  <div className="text-sm font-medium truncate">
                    {log.userName || log.user?.username || 'Utilisateur'}
                  </div>
                  <div className="text-sm text-muted-foreground break-all">
                    {log.criminalName || log.entityId || '-'}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-sm text-muted-foreground">Aucun log d'audit disponible</p>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Date & Heure</TableHead>
                  <TableHead className="min-w-[100px]">Utilisateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="min-w-[80px]">Dossier</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[150px]">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm">
                          {format(new Date(log.createdAt || log.timestamp || Date.now()), 'dd/MM/yyyy', { locale: fr })}
                          <br />
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(log.createdAt || log.timestamp || Date.now()), 'HH:mm', { locale: fr })}
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
                            {getActionIcon((log.action || 'view').toLowerCase())}
                            <span className="text-xs">
                              {getActionBadge((log.action || 'view').toLowerCase())}
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
                                  .map(([key, value]) => {
                                    const change = value as ChangeValue;
                                    if (
                                      value &&
                                      typeof value === 'object' &&
                                      ('old' in value || 'before' in value)
                                    ) {
                                      return `${key}: ${change.old || change.before} -> ${change.new || change.after}`;
                                    }
                                    return `${key}: modifie`;
                                  })
                                  .join(', ')
                              : 'Modifications effectuees'}
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

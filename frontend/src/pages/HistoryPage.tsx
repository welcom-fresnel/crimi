import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { History, Plus, Pencil, Trash2, Eye, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { auditAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AuditEntry {
  id: string;
  action?: string;
  entity?: string;
  entityId?: string;
  userName?: string;
  user?: { username?: string };
  criminalName?: string;
  timestamp?: string;
  createdAt?: string;
  changes?: Record<string, unknown> | null;
}

const sensitiveKey = /(password|token|secret|fingerprint|photo|lastKnownAddress|phoneNumber)/i;
const sanitizeChanges = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizeChanges);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !sensitiveKey.test(key))
    .map(([key, child]) => [key, sanitizeChanges(child)]));
};
const safeChanges = (changes?: Record<string, unknown> | null) => sanitizeChanges(changes) as Record<string, unknown>;

const actionLabels: Record<string, string> = {
  CREATE: 'Création', UPDATE: 'Modification', DELETE: 'Suppression', LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion', DENIED: 'Refus', VIEW: 'Consultation',
};
const entityLabels: Record<string, string> = {
  CRIMINAL: 'Dossier', CRIME: 'Infraction', EVIDENCE: 'Preuve', USER: 'Utilisateur',
  CRIME_TYPE: 'Type d’infraction', ROLE: 'Rôle', PROFILE: 'Profil',
};

export default function HistoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('ADMIN') || false;
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [integrity, setIntegrity] = useState<string>();

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setLoading(true);
    auditAPI.getAll(page, 50, {
      action: actionFilter === 'all' ? undefined : actionFilter,
      entity: entityFilter === 'all' ? undefined : entityFilter,
    }).then((response) => {
      if (cancelled) return;
      setLogs((response.data || []) as AuditEntry[]);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotal(response.pagination?.total || 0);
    }).catch(() => {
      if (!cancelled) toast.error('Erreur', { description: 'Impossible de charger le journal d’audit.' });
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isAdmin, page, actionFilter, entityFilter]);

  const filteredLogs = useMemo(() => logs.filter((log) => {
    const query = searchQuery.trim().toLocaleLowerCase('fr');
    const matchesQuery = !query || [log.userName, log.user?.username, log.criminalName, log.entityId]
      .some((value) => value?.toLocaleLowerCase('fr').includes(query));
    return matchesQuery && (actionFilter === 'all' || log.action?.toUpperCase() === actionFilter)
      && (entityFilter === 'all' || log.entity?.toUpperCase() === entityFilter);
  }), [logs, searchQuery, actionFilter, entityFilter]);

  const verifyIntegrity = async () => {
    try {
      const response = await auditAPI.verify();
      const result = response.data;
      const invalid = result.firstInvalid && typeof result.firstInvalid === 'object'
        ? result.firstInvalid as { id?: string; action?: string; entity?: string }
        : undefined;
      setIntegrity(result.valid ? 'Chaîne valide : aucune altération détectée.' : `Première entrée invalide : ${invalid?.id || 'identifiant indisponible'} (${invalid?.action || 'action inconnue'} · ${invalid?.entity || 'entité inconnue'}).`);
    } catch {
      setIntegrity('La vérification du journal a échoué.');
    }
  };

  if (!isAdmin) return null;
  const dateFor = (log: AuditEntry) => {
    const value = log.createdAt || log.timestamp;
    return value && !Number.isNaN(new Date(value).getTime()) ? format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: fr }) : '—';
  };
  const displayChanges = (changes?: Record<string, unknown> | null) => {
    const safe = safeChanges(changes);
    return Object.keys(safe).length ? Object.entries(safe).map(([key, value]) => `${key}: ${typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : 'modifié'}`).join(', ') : '—';
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow-label">CONTROLE ET TRACABILITE</p>
        <h1 className="display-heading">HISTORIQUE DES ACTIONS</h1>
        <p className="text-sm text-muted-foreground">Journal de consultation et d’opérations du système.</p>
      </div>
      <div className="history-filter-bar">
        <Input aria-label="Rechercher dans l’historique" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Utilisateur ou identifiant..." />
        <select aria-label="Filtrer par action" value={actionFilter} onChange={(event) => { setPage(1); setActionFilter(event.target.value); }} className="hud-input h-10 rounded-sm border border-input bg-surface-elevated px-3 text-sm">
          <option value="all">Toutes les actions</option>
          {Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="Filtrer par entité" value={entityFilter} onChange={(event) => { setPage(1); setEntityFilter(event.target.value); }} className="hud-input h-10 rounded-sm border border-input bg-surface-elevated px-3 text-sm">
          <option value="all">Toutes les entités</option>
          {Object.entries(entityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <Button variant="outline" onClick={() => void verifyIntegrity()}><ShieldCheck className="mr-2 h-4 w-4" />Vérifier l'intégrité du journal</Button>
      </div>
      {integrity && <p role="status" className="rounded border p-3 text-sm">{integrity}</p>}
      <Card className="glass-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Journal d’activité · {total} entrée(s)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Date & heure</TableHead><TableHead>Utilisateur</TableHead><TableHead>Action</TableHead><TableHead>Entité</TableHead><TableHead>Détails</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const action = log.action?.toUpperCase() || '';
                  const Icon = action === 'CREATE' ? Plus : action === 'UPDATE' ? Pencil : action === 'DELETE' ? Trash2 : Eye;
                  return <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">{dateFor(log)}</TableCell>
                    <TableCell>{log.userName || log.user?.username || 'Utilisateur'}</TableCell>
                    <TableCell><span className="inline-flex items-center gap-2"><Icon className="h-4 w-4" /><Badge variant="outline">{actionLabels[action] || action || 'Action'}</Badge></span></TableCell>
                    <TableCell>{entityLabels[log.entity?.toUpperCase() || ''] || log.entity || '—'} {log.entityId ? `· ${log.entityId}` : ''}</TableCell>
                    <TableCell className="max-w-[360px] truncate text-muted-foreground">{displayChanges(log.changes)}</TableCell>
                  </TableRow>;
                })}
                {!filteredLogs.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">{loading ? 'Chargement du journal…' : 'Aucune entrée ne correspond aux filtres.'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Précédent</Button>
            <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
            <Button variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Suivant</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

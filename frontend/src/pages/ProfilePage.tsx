import { FormEvent, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { auditAPI, authAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AuditLogItem {
  id: string;
  action?: string;
  entity?: string;
  entityId?: string;
  timestamp?: string;
  createdAt?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [form, setForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const loadMyLogs = async () => {
    try {
      const response = await auditAPI.getMine(1, 100);
      if (response.success) {
        setLogs((response.data || []) as AuditLogItem[]);
      }
    } catch (error) {
      console.error('Erreur chargement historique personnel:', error);
      toast.error('Erreur', {
        description: "Impossible de charger l'historique personnel.",
      });
    }
  };

  useEffect(() => {
    void loadMyLogs();
  }, []);

  const onChangePassword = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.oldPassword || !form.newPassword) {
      toast.error('Champs requis', {
        description: 'Veuillez renseigner les deux mots de passe.',
      });
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error('Confirmation invalide', {
        description: 'Le nouveau mot de passe et la confirmation ne correspondent pas.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await authAPI.changePassword({
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });

      if (response.success) {
        toast.success('Mot de passe modifie', {
          description: 'Votre mot de passe a ete change avec succes.',
        });
        setForm({
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        await loadMyLogs();
      }
    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      toast.error('Erreur', {
        description: "Impossible de changer le mot de passe. Verifiez l'ancien mot de passe.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const rolesLabel = user?.roles?.join(', ') || 'Aucun role';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mon profil</h1>
        <p className="text-muted-foreground">
          Consultez vos informations, changez votre mot de passe et suivez vos activites.
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Informations personnelles (lecture seule)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nom d'utilisateur</Label>
            <Input value={user?.username || ''} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ''} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Prenom</Label>
            <Input value={user?.profile?.firstName || ''} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input value={user?.profile?.lastName || ''} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Service</Label>
            <Input value={user?.profile?.service || ''} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Grade</Label>
            <Input value={user?.profile?.grade || ''} readOnly />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Roles</Label>
            <Input value={rolesLabel} readOnly />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Changer le mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onChangePassword} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Ancien mot de passe</Label>
              <Input
                id="oldPassword"
                type="password"
                value={form.oldPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, oldPassword: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                required
                minLength={6}
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Modification...' : 'Modifier mon mot de passe'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Mon historique d'activites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {logs.map((log) => {
              const action = (log.action || '').toUpperCase();
              const label =
                action === 'CREATE'
                  ? 'Creation'
                  : action === 'UPDATE'
                    ? 'Modification'
                    : action === 'DELETE'
                      ? 'Suppression'
                      : action === 'LOGIN'
                        ? 'Connexion'
                        : action === 'LOGOUT'
                          ? 'Deconnexion'
                          : action || 'Action';

              const dateValue = log.timestamp || log.createdAt;

              return (
                <div key={log.id} className="rounded-lg border bg-background/60 p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.entity || 'SYSTEME'} {log.entityId ? `· ${log.entityId}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{action || '-'}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dateValue
                        ? format(new Date(dateValue), 'dd/MM/yyyy HH:mm', { locale: fr })
                        : '-'}
                    </p>
                  </div>
                </div>
              );
            })}
            {logs.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune activite enregistree pour le moment.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

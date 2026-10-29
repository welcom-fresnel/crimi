import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI, RoleItem, UserListItem, usersAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface CreateAgentForm {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  service: string;
  grade: string;
  roleId: string;
}

const initialForm: CreateAgentForm = {
  username: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  service: '',
  grade: '',
  roleId: '',
};

export default function AdminUsers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [form, setForm] = useState<CreateAgentForm>(initialForm);

  const isAdmin = user?.roles?.includes('ADMIN');

  const assignableRoles = useMemo(
    () => roles.filter((role) => role.name === 'AGENT' || role.name === 'VIEWER'),
    [roles],
  );

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersResp, rolesResp] = await Promise.all([
        usersAPI.getAll(1, 200),
        usersAPI.getRoles(),
      ]);

      if (usersResp.success) {
        setUsers(usersResp.data || []);
      }
      if (rolesResp.success) {
        setRoles(rolesResp.data || []);
        if (!form.roleId && rolesResp.data?.length) {
          const defaultRole =
            rolesResp.data.find((role) => role.name === 'AGENT') ||
            rolesResp.data.find((role) => role.name === 'VIEWER');
          if (defaultRole) {
            setForm((prev) => ({ ...prev, roleId: defaultRole.id }));
          }
        }
      }
    } catch (error) {
      console.error('Erreur de chargement des agents:', error);
      toast.error('Erreur', {
        description: 'Impossible de charger les utilisateurs',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      toast.error('Acces refuse', { description: 'Cette section est reservee aux administrateurs.' });
      navigate('/dashboard', { replace: true });
      return;
    }

    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const onFormChange = (key: keyof CreateAgentForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onCreateAgent = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.roleId) {
      toast.error('Role requis', { description: 'Selectionnez un role pour le nouvel agent.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await authAPI.register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        service: form.service.trim() || undefined,
        grade: form.grade.trim() || undefined,
        roleIds: [form.roleId],
      });

      if (response.success) {
        toast.success('Agent cree', {
          description: 'Le compte a ete cree avec succes.',
        });
        setForm((prev) => ({ ...initialForm, roleId: prev.roleId }));
        await loadData();
      }
    } catch (error) {
      console.error('Erreur de creation agent:', error);
      toast.error('Erreur', {
        description: 'Creation du compte impossible. Verifiez les informations.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onToggleStatus = async (targetUser: UserListItem) => {
    try {
      const response = await usersAPI.toggleStatus(targetUser.id);
      if (response.success) {
        toast.success('Statut mis a jour', {
          description: `${targetUser.username} est maintenant ${response.data?.isActive ? 'actif' : 'inactif'}.`,
        });
        await loadData();
      }
    } catch (error) {
      console.error('Erreur toggle statut:', error);
      toast.error('Erreur', { description: 'Impossible de modifier le statut.' });
    }
  };

  const onDeleteUser = async (targetUser: UserListItem) => {
    if (!window.confirm(`Supprimer le compte ${targetUser.username} ?`)) {
      return;
    }

    try {
      const response = await usersAPI.delete(targetUser.id);
      if (response.success) {
        toast.success('Utilisateur supprime', {
          description: `${targetUser.username} a ete supprime.`,
        });
        await loadData();
      }
    } catch (error) {
      console.error('Erreur suppression utilisateur:', error);
      toast.error('Erreur', { description: 'Suppression impossible.' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow-label">CONTROLE DES ACCES</p>
        <h1 className="display-heading">GESTION DES AGENTS</h1>
        <p className="text-sm text-muted-foreground">
          Creez et gerez les comptes agents depuis cette interface.
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Ajouter un agent</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreateAgent} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => onFormChange('username', e.target.value)}
                required
                minLength={12}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => onFormChange('email', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">Prenom</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => onFormChange('firstName', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => onFormChange('lastName', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service">Service</Label>
              <Input
                id="service"
                value={form.service}
                onChange={(e) => onFormChange('service', e.target.value)}
                placeholder="Police Judiciaire"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Input
                id="grade"
                value={form.grade}
                onChange={(e) => onFormChange('grade', e.target.value)}
                placeholder="Inspecteur"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe initial</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => onFormChange('password', e.target.value)}
                required
                minLength={12}
              />
              <p className="text-xs text-muted-foreground">Au moins 12 caractères.</p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                id="roleId"
                value={form.roleId}
                onChange={(event) => onFormChange('roleId', event.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="" disabled>Selectionner un role</option>
                {assignableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creation...' : 'Creer le compte agent'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Utilisateurs ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : (
            <div className="space-y-3">
              {users.map((item) => {
                const roleNames = (item.userRoles || [])
                  .map((userRole) => userRole.role?.name)
                  .filter(Boolean)
                  .join(', ');

                return (
                  <div
                    key={item.id}
                    className="agent-record-card flex flex-col gap-3 border border-border bg-surface p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-display text-lg font-semibold uppercase tracking-[0.04em]">{item.profile?.firstName || ''} {item.profile?.lastName || ''}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.username} · {item.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.profile?.service || 'Service non defini'} · {roleNames || 'Aucun role'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.isActive ? 'default' : 'secondary'} className={item.isActive ? 'agent-online-badge' : ''}>
                        {item.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => onToggleStatus(item)}>
                        {item.isActive ? 'Desactiver' : 'Activer'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDeleteUser(item)}
                        disabled={item.id === user?.id}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                );
              })}
              {users.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucun utilisateur trouve.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { FormEvent, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const { user, mustChangePassword, refreshProfile } = useAuth();
  const forcePasswordChange = new URLSearchParams(useLocation().search).get('forcePasswordChange') === '1';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

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

    if (form.newPassword.length < 12) {
      toast.error('Mot de passe trop court', { description: 'Le nouveau mot de passe doit contenir au moins 12 caractères.' });
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
        await refreshProfile();
      }
    } catch {
      console.error('Échec du changement de mot de passe.');
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
        <p className="eyebrow-label">IDENTITE DE SESSION</p>
        <h1 className="display-heading">PROFIL AGENT</h1>
        <p className="text-sm text-muted-foreground">
          Consultez vos informations, changez votre mot de passe et suivez vos activites.
        </p>
      </div>

      {(mustChangePassword || forcePasswordChange) && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm font-medium">Vous devez changer votre mot de passe avant de continuer</div>}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>IDENTITE AGENT · LECTURE SEULE</CardTitle>
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
          <CardTitle>SECURITE DU COMPTE</CardTitle>
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
                minLength={12}
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
                minLength={12}
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

    </div>
  );
}

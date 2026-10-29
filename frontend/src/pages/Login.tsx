import { AxiosError } from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface ApiErrorPayload {
  message?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await login(username, password);
      toast.success('Connexion reussie', {
        description: 'Bienvenue dans le systeme SGAC.',
      });
      navigate('/dashboard');
    } catch (err: unknown) {
      let message = 'Identifiants incorrects.';
      if (err instanceof AxiosError<ApiErrorPayload>) {
        message = err.response?.status === 429
          ? 'Trop de tentatives de connexion. Réessayez dans quelques minutes.'
          : 'Identifiants invalides';
      } else {
        message = 'Identifiants invalides';
      }

      toast.error('Echec de connexion', {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-screen relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-6">
      <div className="login-scan-line" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-md px-2">
        <div className="mb-6 text-center">
          <div className="login-shield mx-auto mb-4 flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
            <Shield className="h-8 w-8 text-primary sm:h-10 sm:w-10" />
          </div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.24em] text-info">RESEAU SECURISE · CG</p>
          <h1 className="font-display text-4xl font-bold tracking-[0.12em] text-foreground sm:text-5xl">SGEC</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.08em] text-muted-foreground">Acces restreint · Personnel autorise uniquement</p>
        </div>

        <Card className="login-panel overflow-hidden">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="h-4 w-[2px] bg-primary" /> Authentification agent
              </CardTitle>
              <CardDescription>Identifiez-vous pour ouvrir une session securisee.</CardDescription>
            </CardHeader>
          </div>
          <CardContent className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Identifiant agent</Label>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  type="text"
                  placeholder="admin ou agent1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting || isLoading}>
                {(isSubmitting || isLoading) ? 'Verification...' : "S'AUTHENTIFIER"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">Reserve aux agents autorises uniquement</p>
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <div className="flex items-start gap-3 text-sm text-danger">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-none" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l4.516 8.03c.75 1.333-.213 2.971-1.742 2.971H5.483C3.954 14.1 2.992 12.463 3.742 11.13l4.515-8.03zM9 8a1 1 0 112 0v3a1 1 0 11-2 0V8zm1 7a1.25 1.25 0 100-2.5A1.25 1.25 0 0010 15z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="font-semibold text-destructive">SYSTEME SECURISE - ACCES RESTREINT</div>
                  <div className="text-xs text-muted-foreground mt-1">Toute tentative d'acces non autorisee est passible de poursuites judiciaires. Reserve aux agents autorises uniquement.</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">CONFIDENTIEL · SGEC · REPUBLIQUE DU CONGO</p>
      </div>
    </div>
  );
}

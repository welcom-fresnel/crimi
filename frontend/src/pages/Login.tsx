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
        message = err.response?.data?.message || err.message || message;
      } else if (err instanceof Error) {
        message = err.message;
      }

      toast.error('Echec de connexion', {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg className="w-full h-full opacity-10" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <rect width="80" height="80" fill="none" />
              <rect x="0" y="0" width="1" height="80" fill="currentColor" />
              <rect x="0" y="0" width="80" height="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" className="text-slate-800" />
        </svg>
      </div>

      <div className="w-full max-w-md mx-auto px-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-primary mb-4 shadow-lg">
            <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white text-foreground">SGAC</h1>
          <p className="text-xs sm:text-sm text-muted-foreground tracking-wider">Systeme de Gestion des Antecedents Criminels</p>
        </div>

        <Card className="overflow-hidden shadow-2xl rounded-xl border border-white/5 bg-black/50 backdrop-blur-md">
          <div className="p-6">
            <CardHeader>
              <CardTitle className="text-lg text-white">Connexion</CardTitle>
              <CardDescription>Accedez a votre espace securise</CardDescription>
            </CardHeader>
          </div>
          <CardContent className="pt-0 px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">Nom d'utilisateur</Label>
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
                <Label htmlFor="password" className="text-white">Mot de passe</Label>
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

              <Button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg tracking-wider uppercase shadow-md" disabled={isSubmitting || isLoading}>
                {(isSubmitting || isLoading) ? 'Connexion...' : 'SE CONNECTER'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">Reserve aux agents autorises uniquement</p>
            </div>

            <div className="mt-6 border-t border-muted-foreground/20 pt-4">
              <div className="flex items-start gap-3 text-sm text-red-400">
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

        <p className="mt-8 text-center text-xs text-muted-foreground">(c) 2026 Division Technique de la Police Nationale.</p>
      </div>
    </div>
  );
}

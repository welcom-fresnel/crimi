import { useCriminals } from '@/contexts/CriminalsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, UserX, AlertTriangle, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Dashboard() {
  const { criminals } = useCriminals();
  const { user } = useAuth();
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

  const stats = {
    total: criminals.length,
    arrested: criminals.filter((c) => c.status === 'ARRESTED').length,
    wanted: criminals.filter((c) => c.status === 'ACTIVE').length,
    released: criminals.filter((c) => c.status === 'RELEASED').length,
    deceased: criminals.filter((c) => c.status === 'DECEASED').length,
  };

  const statCards = [
    {
      title: 'Total criminels',
      value: stats.total,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Arretes',
      value: stats.arrested,
      icon: UserCheck,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      title: 'Recherches',
      value: stats.wanted,
      icon: AlertTriangle,
      color: 'text-warning-foreground',
      bg: 'bg-warning/10',
    },
    {
      title: 'Liberes',
      value: stats.released,
      icon: User,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      title: 'Decedes',
      value: stats.deceased,
      icon: UserX,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Bienvenue, {user?.profile?.firstName || user?.username}. Voici un apercu de l'activite.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.title} className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activite recente
            </CardTitle>
            <CardDescription>Dernieres actions dans le systeme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {criminals.length > 0 ? (
                criminals.slice(0, 5).map((criminal) => (
                  <div key={criminal.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                    {(() => {
                      const photoSrc = criminal.photoUrl ?? (criminal.photo ? `${apiBase}${criminal.photo}` : undefined);
                      return (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {photoSrc ? (
                            <img
                              src={photoSrc}
                              alt={`${criminal.firstName} ${criminal.lastName}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-medium text-primary">{criminal.caseNumber.slice(-2)}</span>
                          )}
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">
                          {criminal.firstName} {criminal.lastName}
                        </span>
                        <span className="text-muted-foreground ml-2">({criminal.caseNumber})</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(criminal.createdAt), "d MMM yyyy 'a' HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune activite recente</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Repartition par statut</CardTitle>
            <CardDescription>Vue d'ensemble des dossiers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Arretes', count: stats.arrested, color: 'bg-destructive' },
                { label: 'Recherches', count: stats.wanted, color: 'bg-warning' },
                { label: 'Liberes', count: stats.released, color: 'bg-success' },
                { label: 'Decedes', count: stats.deceased, color: 'bg-muted-foreground' },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{item.label}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{
                        width: `${stats.total > 0 ? (item.count / stats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

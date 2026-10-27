import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, ChevronRight, Clock3, ShieldCheck } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { PageTransition } from '@/components/hud/PageTransition';

interface AppLayoutProps {
  children: ReactNode;
}

const routeLabels: Record<string, string> = {
  dashboard: 'Tableau de bord',
  criminals: 'Dossiers criminels',
  new: 'Nouveau dossier',
  edit: 'Modification du dossier',
  search: 'Recherche avancee',
  history: 'Journal d’audit',
  profile: 'Profil agent',
  admin: 'Administration',
  users: 'Gestion des agents',
};

function useBrazzavilleClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(() => ({
    time: new Intl.DateTimeFormat('fr-CG', {
      timeZone: 'Africa/Brazzaville',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now),
    date: new Intl.DateTimeFormat('fr-CG', {
      timeZone: 'Africa/Brazzaville',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(now),
  }), [now]);
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const clock = useBrazzavilleClock();
  const currentPath = location.pathname.split('/').filter(Boolean);
  const currentSegment = currentPath.at(-1) || 'dashboard';
  const breadcrumb = routeLabels[currentSegment] || (currentPath.length > 1 ? 'Dossier criminel' : 'Tableau de bord');

  return (
    <SidebarProvider>
      <div className="app-shell flex min-h-screen w-full overflow-x-hidden">
        <AppSidebar />
        <main className="app-main flex min-w-0 flex-1 flex-col">
          <header className="command-topbar">
            <div className="command-topbar-leading">
              <SidebarTrigger aria-label="Ouvrir ou reduire la navigation" />
              <nav aria-label="Fil d’Ariane" className="command-breadcrumb">
                <span className="command-breadcrumb-root">SGEC</span>
                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
                <span aria-current="page" className="command-breadcrumb-current">{breadcrumb}</span>
              </nav>
            </div>

            <div className="command-topbar-status">
              <div className="command-clock" aria-label={`Heure de Brazzaville : ${clock.time}, ${clock.date}`}>
                <Clock3 aria-hidden="true" className="h-4 w-4 text-info" />
                <span className="command-clock-time">{clock.time}</span>
                <span className="command-clock-date">{clock.date}</span>
              </div>
              <span className="secure-session">
                <span className="secure-session-dot" aria-hidden="true" />
                SESSION SECURISEE
              </span>
              <button type="button" className="topbar-user" onClick={() => navigate('/profile')} aria-label="Ouvrir le profil agent">
                <span className="topbar-user-copy">
                  <span className="topbar-user-grade">{user?.profile?.grade || 'AGENT'}</span>
                  <span className="topbar-user-role">{user?.roles?.[0] || 'Personnel autorise'}</span>
                </span>
                <Avatar className="topbar-avatar">
                  <AvatarFallback>
                    {`${user?.profile?.firstName?.[0] || ''}${user?.profile?.lastName?.[0] || user?.username?.[0] || 'U'}`.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
              <span className="secure-user-mark" aria-hidden="true"><ShieldCheck className="h-4 w-4" /></span>
            </div>
          </header>

          <div className="command-content flex-1 overflow-auto px-3 py-4 sm:px-5 lg:px-7">
            <PageTransition key={location.pathname}>
              {children}
            </PageTransition>
          </div>

          <footer className="confidential-strip">
            <span><Activity aria-hidden="true" className="h-3 w-3" /> CONFIDENTIEL</span>
            <span>USAGE RESERVE AUX FORCES DE L’ORDRE</span>
            <span className="confidential-location">BRAZZAVILLE · CG</span>
          </footer>
        </main>
      </div>
    </SidebarProvider>
  );
}
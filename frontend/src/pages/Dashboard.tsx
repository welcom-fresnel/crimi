import { useCriminals } from '@/contexts/CriminalsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedNumber, HudCard, SectionHeader } from '@/components/hud';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, UserX, AlertTriangle, Clock, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { CriminalPhoto } from '@/components/criminals/CriminalPhoto';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Dashboard() {
  const { criminals } = useCriminals();
  const { user } = useAuth();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

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
      color: 'text-info',
      bg: 'bg-info/10',
    },
    {
      title: 'Recherches',
      value: stats.wanted,
      icon: AlertTriangle,
      color: 'text-danger',
      bg: 'bg-danger/10',
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

  const formatDateTime = (value?: string) => {
    if (!value) return 'Date inconnue';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date inconnue';
    return format(date, "d MMM yyyy 'a' HH:mm", { locale: fr });
  };

  return (
    <div className="dashboard-page space-y-6">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow-label">CENTRE DE COMMANDE · CONGO-BRAZZAVILLE</p>
          <h1 className="display-heading">TABLEAU DE BORD</h1>
          <p className="text-sm text-muted-foreground">Bienvenue, {user?.profile?.firstName || user?.username}. Vue operationnelle des dossiers.</p>
        </div>
        <div className="dashboard-live"><span className="secure-session-dot" /> FLUX OPERATIONNEL</div>
      </div>

      {stats.wanted > 0 && (
        <HudCard accent="red" className="wanted-alert-panel">
          <div className="wanted-alert-heading">
            <div className="wanted-alert-icon"><ShieldAlert aria-hidden="true" className="h-5 w-5" /></div>
            <div>
              <p className="eyebrow-label text-danger">ALERTES PRIORITAIRES</p>
              <h2 className="section-heading">{stats.wanted} DOSSIER{stats.wanted > 1 ? 'S' : ''} EN RECHERCHE</h2>
            </div>
          </div>
          <div className="wanted-alert-list">
            {criminals.filter((criminal) => criminal.status === 'ACTIVE').slice(0, 5).map((criminal) => (
              <button key={criminal.id} type="button" className="wanted-alert-row" onClick={() => navigate(`/criminals/${criminal.id}`)}>
                <span className="wanted-alert-live" aria-hidden="true" />
                <span className="font-medium">{criminal.lastName} {criminal.firstName}</span>
                <span className="font-mono text-xs text-muted-foreground">{criminal.caseNumber || criminal.fileNumber}</span>
                <ArrowUpRight aria-hidden="true" className="ml-auto h-4 w-4 text-danger" />
              </button>
            ))}
          </div>
        </HudCard>
      )}

      <div className="dashboard-stat-grid">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.24, delay: prefersReducedMotion ? 0 : index * 0.055 }}
          >
            <HudCard className="dashboard-stat-card">
              <div className="dashboard-stat-topline">
                <span className={`dashboard-stat-icon ${stat.color}`}><stat.icon aria-hidden="true" /></span>
                <span className="dashboard-stat-index">0{index + 1}</span>
              </div>
              <p className="dashboard-stat-label">{stat.title}</p>
              <AnimatedNumber value={stat.value} className={`dashboard-stat-value ${stat.color}`} />
            </HudCard>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <HudCard className="dashboard-panel">
          <div className="panel-heading">
            <SectionHeader title="Activite recente" description="Derniers dossiers ajoutes au systeme" />
            <Clock aria-hidden="true" className="h-4 w-4 text-info" />
          </div>
          <div className="activity-timeline">
            {criminals.length > 0 ? (
              criminals.slice(0, 5).map((criminal, index) => {
                return (
                  <motion.button
                    key={criminal.id}
                    type="button"
                    className="activity-row"
                    onClick={() => navigate(`/criminals/${criminal.id}`)}
                    initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.2, delay: prefersReducedMotion ? 0 : index * 0.045 }}
                  >
                    <span className={`activity-timeline-dot status-dot-${criminal.status.toLowerCase()}`} aria-hidden="true" />
                    <CriminalPhoto criminalId={criminal.id} hasPhoto={Boolean(criminal.photo)} version={criminal.updatedAt} alt="" className="activity-avatar" />
                    <span className="activity-copy">
                      <span className="activity-name">{criminal.lastName} {criminal.firstName}</span>
                      <span className="activity-case">{criminal.caseNumber || criminal.fileNumber} · {criminal.crimeType?.name || 'Type inconnu'}</span>
                    </span>
                    <time className="activity-time">{formatDateTime(criminal.createdAt)}</time>
                  </motion.button>
                );
              })
            ) : (
              <p className="empty-state">Aucune activite recente.</p>
            )}
          </div>
        </HudCard>

        <HudCard className="dashboard-panel">
          <SectionHeader title="Repartition par statut" description="Dossiers actifs dans le registre" />
          <div className="status-distribution">
            {[
              { label: 'Arretes', count: stats.arrested, color: 'info' },
              { label: 'Recherches', count: stats.wanted, color: 'danger' },
              { label: 'Liberes', count: stats.released, color: 'success' },
              { label: 'Decedes', count: stats.deceased, color: 'neutral' },
            ].map((item) => {
              const percentage = stats.total > 0 ? (item.count / stats.total) * 100 : 0;
              return (
                <div key={item.label} className="distribution-row">
                  <div className="distribution-labels">
                    <span>{item.label}</span>
                    <span className="font-mono">{item.count} · {Math.round(percentage)}%</span>
                  </div>
                  <div className="distribution-track" role="progressbar" aria-label={`${item.label}: ${Math.round(percentage)} pour cent`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentage)}>
                    <motion.div
                      className={`distribution-fill distribution-${item.color}`}
                      initial={prefersReducedMotion ? false : { width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </HudCard>
      </div>
    </div>
  );
}

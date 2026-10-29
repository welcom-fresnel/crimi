import { LayoutDashboard, Users, UserPlus, Search, History, LogOut, Shield, Settings, UserCog } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const menuItems = [
  { title: 'Tableau de bord', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Liste des criminels', url: '/criminals', icon: Users },
  { title: 'Ajouter un criminel', url: '/criminals/new', icon: UserPlus },
  { title: 'Recherche avancee', url: '/search', icon: Search },
  { title: 'Mon profil', url: '/profile', icon: Settings },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();
  const isAdmin = user?.roles?.includes('ADMIN');
  const displayMenuItems = [
    ...menuItems.filter((item) => item.url !== '/criminals/new' || can('criminals', 'create')),
    ...(isAdmin
      ? [
        { title: 'Historique', url: '/history', icon: History },
        { title: 'Gestion agents', url: '/admin/users', icon: UserCog },
      ]
      : []),
  ];

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase().slice(0, 2);
  };

  return (
    <Sidebar className="command-sidebar border-r-0">
      <SidebarHeader className="command-sidebar-header border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="brand-shield flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-sidebar-primary">
            <Shield className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="brand-title text-base font-bold text-sidebar-foreground">SGEC</h2>
            <p className="brand-subtitle text-[10px] text-sidebar-foreground/70">SYSTEME DE GESTION DES CRIMINELS</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">OPERATIONS</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {displayMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="command-nav-link relative flex items-center gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      activeClassName="is-active text-sidebar-primary-foreground font-semibold"
                    >
                      {(location.pathname === item.url ||
                        (item.url === '/criminals' && location.pathname.startsWith('/criminals/') && !location.pathname.endsWith('/new')) ||
                        (item.url !== '/criminals' && item.url !== '/criminals/new' && location.pathname.startsWith(`${item.url}/`))) && (
                        <motion.span layoutId="sgec-active-navigation" className="nav-active-marker" />
                      )}
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="command-sidebar-footer border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="agent-avatar h-9 w-9">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
              {user ? getInitials(user.profile?.firstName, user.profile?.lastName) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.profile?.firstName && user?.profile?.lastName
                ? `${user.profile.firstName} ${user.profile.lastName}`
                : user?.username || 'Utilisateur'}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {user?.profile?.grade || user?.profile?.service || 'Agent'}
            </p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Deconnexion
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Fermer la session securisee ?</AlertDialogTitle>
              <AlertDialogDescription>Vous serez deconnecte de SGEC sur ce poste.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Rester connecte</AlertDialogCancel>
              <AlertDialogAction onClick={logout}>Se deconnecter</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarFooter>
    </Sidebar>
  );
}

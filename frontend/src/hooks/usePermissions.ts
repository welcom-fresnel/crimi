import { useAuth } from '@/contexts/AuthContext';

/** L’API reste la seule autorité d’accès; ce repli ne sert qu’à présenter l’interface. */
export function usePermissions() {
  const { user } = useAuth();
  const can = (resource: string, action: string) => {
    if (user?.permissions) {
      return user.permissions.some((permission) =>
        permission.resource === resource && permission.actions.includes(action),
      );
    }
    const roles = user?.roles || [];
    if (roles.includes('ADMIN')) return true;
    if (resource !== 'criminals') return false;
    if (roles.includes('AGENT')) return ['create', 'read', 'update'].includes(action);
    return roles.includes('VIEWER') && action === 'read';
  };
  return { can };
}

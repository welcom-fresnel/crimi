import { CriminalStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: CriminalStatus;
  className?: string;
}

const statusConfig: Record<CriminalStatus, { label: string; className: string }> = {
  ARRESTED: { label: 'Arrete', className: 'status-badge status-arrested' },
  ACTIVE: { label: 'Recherche', className: 'status-badge status-wanted' },
  RELEASED: { label: 'Libere', className: 'status-badge status-released' },
  DECEASED: { label: 'Decede', className: 'status-badge status-deceased' },
  UNKNOWN: { label: 'Inconnu', className: 'status-badge status-deceased' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.UNKNOWN;
  return <span className={cn(config.className, className)}>{config.label}</span>;
}

import { CriminalStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: CriminalStatus;
  className?: string;
}

const statusConfig: Record<CriminalStatus, { label: string; className: string }> = {
  ARRESTED: { label: 'ARRETE', className: 'status-arrested' },
  ACTIVE: { label: 'RECHERCHE', className: 'status-wanted' },
  RELEASED: { label: 'LIBERE', className: 'status-released' },
  DECEASED: { label: 'DECEDE', className: 'status-deceased' },
  UNKNOWN: { label: 'INCONNU', className: 'status-deceased' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.UNKNOWN;
  return (
    <span className={cn('status-badge', config.className, className)} role="status">
      <span className="status-badge-dot" aria-hidden="true" />
      {config.label}
    </span>
  );
}

import { CriminalStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: CriminalStatus | string;
  className?: string;
}

// Mapping des statuts backend vers les statuts frontend
const normalizeStatus = (status: string): CriminalStatus => {
  const upperStatus = status.toUpperCase();
  if (upperStatus === 'ARRESTED') return 'arrested';
  if (upperStatus === 'ACTIVE') return 'wanted';
  if (upperStatus === 'DECEASED') return 'deceased';
  if (upperStatus === 'UNKNOWN') return 'released';
  // Fallback pour les anciens statuts
  return status as CriminalStatus;
};

const statusConfig: Record<CriminalStatus, { label: string; className: string }> = {
  arrested: { label: 'Arrêté', className: 'status-badge status-arrested' },
  wanted: { label: 'Recherché', className: 'status-badge status-wanted' },
  released: { label: 'Libéré', className: 'status-badge status-released' },
  deceased: { label: 'Décédé', className: 'status-badge status-deceased' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = normalizeStatus(status);
  const config = statusConfig[normalizedStatus] || statusConfig.arrested;
  return <span className={cn(config.className, className)}>{config.label}</span>;
}

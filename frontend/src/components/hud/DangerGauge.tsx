import { cn } from '@/lib/utils';

export type DangerLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;

interface DangerGaugeProps {
  level?: DangerLevel | null;
  className?: string;
}

const dangerConfig: Record<string, { label: string; segments: number; tone: string }> = {
  LOW: { label: 'Faible', segments: 1, tone: 'low' },
  MEDIUM: { label: 'Moyen', segments: 2, tone: 'medium' },
  HIGH: { label: 'Eleve', segments: 3, tone: 'high' },
  CRITICAL: { label: 'Critique', segments: 4, tone: 'critical' },
};

export function DangerGauge({ level, className }: DangerGaugeProps) {
  const config = dangerConfig[level?.toUpperCase() || ''] || { label: 'Non precise', segments: 0, tone: 'unknown' };

  return (
    <span className={cn('danger-gauge', `danger-gauge-${config.tone}`, className)} aria-label={`Niveau de danger : ${config.label}`}>
      <span className="danger-gauge-segments" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className={index < config.segments ? 'danger-gauge-segment is-active' : 'danger-gauge-segment'} />
        ))}
      </span>
      <span className="danger-gauge-label">{config.label}</span>
    </span>
  );
}

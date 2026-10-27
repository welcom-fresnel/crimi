import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface HudCardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: 'amber' | 'cyan' | 'red';
}

export function HudCard({ className, accent = 'amber', ...props }: HudCardProps) {
  return (
    <div
      data-hud-card=""
      data-accent={accent}
      className={cn('hud-card', className)}
      {...props}
    />
  );
}

import { useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  locale?: string;
}

export function AnimatedNumber({ value, className, locale = 'fr-FR' }: AnimatedNumberProps) {
  const prefersReducedMotion = useReducedMotion();
  const motionValue = useMotionValue(prefersReducedMotion ? value : 0);
  const roundedValue = useTransform(motionValue, (current) => Math.round(current).toLocaleString(locale));

  useEffect(() => {
    if (prefersReducedMotion) {
      motionValue.set(value);
      return;
    }

    const animation = animate(motionValue, value, {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => animation.stop();
  }, [motionValue, prefersReducedMotion, value]);

  return <motion.span className={className}>{roundedValue}</motion.span>;
}

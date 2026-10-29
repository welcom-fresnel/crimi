import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDebouncedRefresh } from './debounced-refresh';

describe('rafraîchissement temps réel débouncé', () => {
  afterEach(() => vi.useRealTimers());

  it('ne déclenche qu’un rafraîchissement après plusieurs événements rapprochés', () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const scheduler = createDebouncedRefresh(refresh, 1500);
    scheduler.schedule();
    vi.advanceTimersByTime(500);
    scheduler.schedule();
    vi.advanceTimersByTime(500);
    scheduler.schedule();
    vi.advanceTimersByTime(1499);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

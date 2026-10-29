import { useEffect, useState } from 'react';
import { criminalsAPI } from '@/services/api';

const MAX_CACHE_ENTRIES = 100;
const photoCache = new Map<string, string>();

const cacheKey = (criminalId: string, version?: string) => `${criminalId}:${version || ''}`;

const remember = (key: string, url: string) => {
  const oldUrl = photoCache.get(key);
  if (oldUrl) URL.revokeObjectURL(oldUrl);
  photoCache.delete(key);
  photoCache.set(key, url);
  while (photoCache.size > MAX_CACHE_ENTRIES) {
    const oldest = photoCache.keys().next().value as string | undefined;
    if (!oldest) break;
    const oldestUrl = photoCache.get(oldest);
    if (oldestUrl) URL.revokeObjectURL(oldestUrl);
    photoCache.delete(oldest);
  }
};

export const invalidateCriminalPhoto = (criminalId: string) => {
  for (const [key, url] of photoCache) {
    if (key.startsWith(`${criminalId}:`)) {
      URL.revokeObjectURL(url);
      photoCache.delete(key);
    }
  }
  window.dispatchEvent(new CustomEvent('criminal-photo:invalidated', { detail: { criminalId } }));
};

export function useCriminalPhoto(
  criminalId: string,
  hasPhoto: boolean,
  version?: string,
  context?: 'detail',
) {
  const [imageUrl, setImageUrl] = useState<string>();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [loadEnabled, setLoadEnabled] = useState(context === 'detail');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setImageUrl(undefined);
    setLoadEnabled(context === 'detail');
  }, [criminalId, version, hasPhoto, context]);

  useEffect(() => {
    const onInvalidated = (event: Event) => {
      if ((event as CustomEvent<{ criminalId: string }>).detail?.criminalId === criminalId) {
        setImageUrl(undefined);
        setReloadKey((value) => value + 1);
      }
    };
    window.addEventListener('criminal-photo:invalidated', onInvalidated);
    return () => window.removeEventListener('criminal-photo:invalidated', onInvalidated);
  }, [criminalId]);

  useEffect(() => {
    if (loadEnabled) return;
    if (typeof IntersectionObserver === 'undefined') {
      setLoadEnabled(true);
      return;
    }
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setLoadEnabled(true);
        observer.disconnect();
      }
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [target, loadEnabled]);

  useEffect(() => {
    if (!hasPhoto || !loadEnabled || !criminalId) return;
    const key = cacheKey(criminalId, version);
    const cached = photoCache.get(key);
    if (cached) {
      photoCache.delete(key);
      photoCache.set(key, cached);
      setImageUrl(cached);
      return;
    }

    const controller = new AbortController();
    criminalsAPI.getPhoto(criminalId, context, controller.signal).then((blob) => {
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      remember(key, url);
      setImageUrl(url);
    }).catch(() => {
      if (!controller.signal.aborted) setImageUrl(undefined);
    });

    return () => controller.abort();
  }, [criminalId, hasPhoto, version, context, loadEnabled, reloadKey]);

  return { imageUrl, setTarget };
}

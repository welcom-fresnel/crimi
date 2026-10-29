import { describe, expect, it, vi } from 'vitest';
import { apiClient, criminalsAPI, handleApiAuthError } from './api';

describe('intercepteur d’authentification Axios', () => {
  it('ne déclenche pas de déconnexion pour un 401 login', () => {
    const handler = vi.fn();
    window.addEventListener('auth:unauthorized', handler);
    handleApiAuthError({ response: { status: 401 }, config: { url: '/auth/login' } });
    expect(handler).not.toHaveBeenCalled();
    window.removeEventListener('auth:unauthorized', handler);
  });

  it('signale le changement de mot de passe obligatoire', () => {
    const handler = vi.fn();
    window.addEventListener('auth:password-change-required', handler);
    handleApiAuthError({ response: { status: 403, data: { code: 'PASSWORD_CHANGE_REQUIRED' } } });
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener('auth:password-change-required', handler);
  });

  it('demande les photos avec Authorization et ajoute le contexte uniquement au détail', async () => {
    localStorage.setItem('token', 'test-token');
    const requests: Array<{ url?: string; headers: { Authorization?: string } }> = [];
    apiClient.defaults.adapter = async (config) => {
      requests.push({ url: config.url, headers: config.headers as { Authorization?: string } });
      return { data: new Blob(['image']), status: 200, statusText: 'OK', headers: {}, config };
    };
    try {
      await criminalsAPI.getPhoto('criminal-1', 'detail');
      await criminalsAPI.getPhoto('criminal-2');
      expect(requests[0].url).toBe('/criminals/criminal-1/photo?context=detail');
      expect(requests[1].url).toBe('/criminals/criminal-2/photo');
      expect(requests.every((request) => request.headers.Authorization === 'Bearer test-token')).toBe(true);
      expect(requests.every((request) => !request.url?.includes('/uploads/'))).toBe(true);
    } finally {
      delete apiClient.defaults.adapter;
      localStorage.removeItem('token');
    }
  });
});

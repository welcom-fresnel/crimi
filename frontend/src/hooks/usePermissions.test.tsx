import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from './usePermissions';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
const mockedUseAuth = vi.mocked(useAuth);

describe('usePermissions', () => {
  beforeEach(() => mockedUseAuth.mockReset());

  it.each([
    ['ADMIN', 'users', 'delete', true],
    ['AGENT', 'criminals', 'update', true],
    ['AGENT', 'users', 'read', false],
    ['VIEWER', 'criminals', 'read', true],
    ['VIEWER', 'criminals', 'create', false],
  ])('repli %s / %s / %s => %s', (role, resource, action, expected) => {
    mockedUseAuth.mockReturnValue({ user: { roles: [role], permissions: undefined } } as never);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can(resource, action)).toBe(expected);
  });

  it('privilégie les permissions envoyées par le serveur', () => {
    mockedUseAuth.mockReturnValue({ user: { roles: ['ADMIN'], permissions: [{ resource: 'criminals', actions: ['read'] }] } } as never);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('criminals', 'read')).toBe(true);
    expect(result.current.can('users', 'delete')).toBe(false);
  });
});

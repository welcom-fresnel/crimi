import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CriminalPhoto } from './CriminalPhoto';
import { criminalsAPI } from '@/services/api';

vi.mock('@/services/api', () => ({ criminalsAPI: { getPhoto: vi.fn() } }));
const getPhoto = vi.mocked(criminalsAPI.getPhoto);

describe('CriminalPhoto', () => {
  beforeEach(() => {
    getPhoto.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:photo-test');
  });

  it('charge la photo détail immédiatement avec le contexte detail', async () => {
    getPhoto.mockResolvedValue(new Blob(['photo']));
    render(<CriminalPhoto criminalId="c1" hasPhoto alt="Portrait" context="detail" />);
    await waitFor(() => expect(getPhoto).toHaveBeenCalledWith('c1', 'detail', expect.any(AbortSignal)));
    expect((await screen.findByRole('img', { name: 'Portrait' })).getAttribute('src')).toBe('blob:photo-test');
  });

  it('n’utilise aucun chemin /uploads et affiche le repli après erreur', async () => {
    getPhoto.mockRejectedValue({ message: 'Erreur réseau' });
    render(<CriminalPhoto criminalId="c2" hasPhoto alt="Portrait" />);
    await waitFor(() => expect(getPhoto).toHaveBeenCalledWith('c2', undefined, expect.any(AbortSignal)));
    expect(screen.queryByRole('img')).toBeNull();
    expect(getPhoto.mock.calls[0][0]).not.toContain('/uploads');
  });

  it('n’envoie pas le contexte detail pour les vignettes', async () => {
    getPhoto.mockResolvedValue(new Blob(['photo']));
    render(<CriminalPhoto criminalId="c3" hasPhoto alt="Vignette" />);
    await waitFor(() => expect(getPhoto).toHaveBeenCalled());
    expect(getPhoto.mock.calls[0][1]).toBeUndefined();
  });
});

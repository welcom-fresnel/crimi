import { describe, expect, it } from 'vitest';
import { buildCriminalDiff } from './criminal-diff';
import type { Criminal } from '@/types';

const original = {
  id: 'c1', firstName: 'Jean', lastName: 'Dupont', alias: null, dateOfBirth: '2000-01-01T00:00:00.000Z',
  nationality: 'Congolaise', crimeDate: '2025-02-03T12:00:00.000Z', crimeLocation: 'Brazzaville',
  description: 'Description initiale', status: 'ACTIVE', dangerLevel: 'LOW', arrestation: {
    arrestDate: '2025-02-04T08:00:00.000Z', arrestLocation: 'Pointe-Noire', arrestingUnit: 'Unité A',
  },
} as unknown as Criminal;

describe('buildCriminalDiff', () => {
  it('omet les champs inchangés', () => {
    expect(buildCriminalDiff(original, { firstName: ' Jean ', crimeLocation: 'Brazzaville' })).toEqual({});
  });

  it('considère une chaîne vide équivalente à une valeur absente', () => {
    expect(buildCriminalDiff(original, { alias: '' })).toEqual({});
  });

  it('normalise les dates au jour', () => {
    expect(buildCriminalDiff(original, { crimeDate: '2025-02-03' })).toEqual({});
  });

  it('ne conserve que les sous-champs modifiés de l’arrestation', () => {
    expect(buildCriminalDiff(original, { arrestDate: '2025-02-04', arrestLocation: '  ', arrestingUnit: 'Unité B' }))
      .toEqual({ arrestation: { arrestLocation: '', arrestingUnit: 'Unité B' } });
  });
});

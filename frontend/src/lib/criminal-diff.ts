import type { Criminal } from '@/types';

export interface CriminalFormValues {
  firstName?: string;
  lastName?: string;
  alias?: string;
  birthDate?: string;
  placeOfBirth?: string;
  nationality?: string;
  gender?: string;
  crimeTypeId?: string;
  crimeDate?: string;
  crimeLocation?: string;
  description?: string;
  status?: string;
  dangerLevel?: string;
  lastKnownAddress?: string;
  phoneNumber?: string;
  arrestDate?: string;
  arrestLocation?: string;
  arrestingUnit?: string;
  arrestingOfficer?: string;
  warrantNumber?: string;
  arrestationNotes?: string;
}

type CriminalPatch = Partial<Omit<CriminalFormValues, 'birthDate' | 'arrestDate' | 'arrestLocation' | 'arrestingUnit' | 'arrestingOfficer' | 'warrantNumber' | 'arrestationNotes'>> & {
  dateOfBirth?: string;
  arrestation?: {
    arrestDate?: string;
    arrestLocation?: string;
    arrestingUnit?: string;
    arrestingOfficer?: string;
    warrantNumber?: string;
    notes?: string;
  };
};

const normalize = (value: unknown, date = false): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const stringValue = String(value).trim();
  if (!stringValue) return undefined;
  if (date) {
    const day = stringValue.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (day) return day;
    const parsed = new Date(stringValue);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return stringValue;
};

export function buildCriminalDiff(original: Criminal, formValues: CriminalFormValues): CriminalPatch {
  const result: CriminalPatch = {};
  const fields: Array<[keyof CriminalFormValues, keyof CriminalPatch, unknown, boolean?]> = [
    ['firstName', 'firstName', original.firstName],
    ['lastName', 'lastName', original.lastName],
    ['alias', 'alias', original.alias],
    ['birthDate', 'dateOfBirth', original.dateOfBirth || original.birthDate, true],
    ['placeOfBirth', 'placeOfBirth', original.placeOfBirth],
    ['nationality', 'nationality', original.nationality],
    ['gender', 'gender', original.gender],
    ['crimeTypeId', 'crimeTypeId', original.crimeTypeId || original.crimeType?.id],
    ['crimeDate', 'crimeDate', original.crimeDate, true],
    ['crimeLocation', 'crimeLocation', original.crimeLocation],
    ['description', 'description', original.description ?? original.notes],
    ['status', 'status', original.status],
    ['dangerLevel', 'dangerLevel', original.dangerLevel],
    ['lastKnownAddress', 'lastKnownAddress', original.lastKnownAddress],
    ['phoneNumber', 'phoneNumber', original.phoneNumber],
  ];

  for (const [formKey, patchKey, originalValue, isDate] of fields) {
    if (formValues[formKey] === undefined) continue;
    const nextValue = normalize(formValues[formKey], isDate);
    if (nextValue !== normalize(originalValue, isDate)) {
      (result as Record<string, unknown>)[patchKey] = nextValue ?? '';
    }
  }

  const arrestFields: Array<[keyof CriminalFormValues, string, unknown, boolean?]> = [
    ['arrestDate', 'arrestDate', original.arrestation?.arrestDate || original.arrestDate, true],
    ['arrestLocation', 'arrestLocation', original.arrestation?.arrestLocation || original.arrestLocation],
    ['arrestingUnit', 'arrestingUnit', original.arrestation?.arrestingUnit],
    ['arrestingOfficer', 'arrestingOfficer', original.arrestation?.arrestingOfficer],
    ['warrantNumber', 'warrantNumber', original.arrestation?.warrantNumber],
    ['arrestationNotes', 'notes', original.arrestation?.notes],
  ];
  const arrestation: Record<string, string> = {};
  for (const [formKey, key, originalValue, isDate] of arrestFields) {
    if (formValues[formKey] === undefined) continue;
    const nextValue = normalize(formValues[formKey], isDate);
    if (nextValue !== normalize(originalValue, isDate)) arrestation[key] = nextValue ?? '';
  }
  if (Object.keys(arrestation).length) result.arrestation = arrestation;
  return result;
}

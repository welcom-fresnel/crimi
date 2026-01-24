export type UserRole = 'admin' | 'agent';

export type CriminalStatus = 'arrested' | 'wanted' | 'released' | 'deceased';

export interface User {
  id: string;
  email: string;
  fullName: string;
  badgeNumber: string;
  station: string;
  role: UserRole;
}

export interface CrimeType {
  id: string;
  name: string;
  description?: string;
}

export interface Criminal {
  id: string;
  caseNumber: string; // Backend utilise caseNumber
  fileNumber?: string; // Ancien nom, gardé pour compatibilité
  firstName: string;
  lastName: string;
  alias?: string;
  birthDate?: string;
  dateOfBirth?: string;
  nationality?: string;
  photoUrl?: string;
  photo?: string;
  crimeType: CrimeType;
  crimeTypeId?: string;
  arrestDate?: string;
  crimeDate?: string;
  arrestLocation?: string;
  crimeLocation?: string;
  status: CriminalStatus | string; // Peut être ACTIVE, ARRESTED, etc.
  dangerLevel?: string;
  notes?: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'view';
  criminalId?: string;
  criminalName?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  createdAt: string;
}

export interface DashboardStats {
  totalCriminals: number;
  arrestedCount: number;
  wantedCount: number;
  releasedCount: number;
  recentActivity: AuditLog[];
}

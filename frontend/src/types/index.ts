export type UserRole = 'admin' | 'agent';

export type CriminalStatus = 'ARRESTED' | 'ACTIVE' | 'RELEASED' | 'DECEASED' | 'UNKNOWN';

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

export interface Evidence {
  id: string;
  title?: string;
  description?: string;
  fileUrls: string[];
  createdAt: string;
  createdBy?: {
    username?: string;
  };
}

export interface Arrestation {
  id: string;
  arrestDate?: string;
  arrestLocation?: string;
  arrestingUnit?: string;
  arrestingOfficer?: string;
  warrantNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Criminal {
  id: string;
  caseNumber: string; // Backend utilise caseNumber
  fileNumber?: string; // Ancien nom, garde pour compatibilite
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
  status: CriminalStatus;
  dangerLevel?: string;
  notes?: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  evidences?: Evidence[];
  arrestation?: Arrestation;
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
  deceasedCount: number;
  recentActivity: AuditLog[];
}

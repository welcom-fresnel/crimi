/**
 * Types et interfaces TypeScript pour l'application
 */

import { Request } from 'express';

// ==================== TYPES D'AUTHENTIFICATION ====================

export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
  roles: string[];
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ==================== TYPES DE DONNÉES ====================

export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type CriminalStatus = 'ACTIVE' | 'ARRESTED' | 'RELEASED' | 'DECEASED' | 'UNKNOWN';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
export type EntityType = 'CRIMINAL' | 'CRIME' | 'USER' | 'CRIME_TYPE' | 'ROLE' | 'PROFILE';

// ==================== INTERFACES DE REQUÊTE ====================

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  service?: string;
  grade?: string;
  roleIds: string[];
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  service?: string;
  grade?: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface CreateCriminalDto {
  caseNumber: string;
  firstName: string;
  lastName: string;
  alias?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  gender?: Gender;
  photo?: string;
  fingerprint?: string;
  // Crime principal (compatibilité)
  crimeTypeId?: string;
  crimeDate?: string;
  crimeLocation?: string;
  description?: string;
  status?: CriminalStatus;
  dangerLevel?: Severity;
  // Crimes multiples (nouveau)
  crimes?: CreateCrimeDto[];
  lastKnownAddress?: string;
  phoneNumber?: string;
  arrestation?: CreateArrestationDto;
}

export interface UpdateCriminalDto {
  firstName?: string;
  lastName?: string;
  alias?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  gender?: Gender;
  photo?: string;
  fingerprint?: string;
  crimeTypeId?: string;
  crimeDate?: string;
  crimeLocation?: string;
  description?: string;
  status?: CriminalStatus;
  dangerLevel?: Severity;
  lastKnownAddress?: string;
  phoneNumber?: string;
  arrestation?: UpdateArrestationDto;
}

export interface CreateArrestationDto {
  arrestDate?: string;
  arrestLocation?: string;
  arrestingUnit?: string;
  arrestingOfficer?: string;
  warrantNumber?: string;
  notes?: string;
}

export interface UpdateArrestationDto {
  arrestDate?: string | null;
  arrestLocation?: string | null;
  arrestingUnit?: string | null;
  arrestingOfficer?: string | null;
  warrantNumber?: string | null;
  notes?: string | null;
}

export interface CreateEvidenceDto {
  title?: string;
  description?: string;
  fileUrls?: string[];
}

export interface CreateCrimeDto {
  crimeTypeId: string;
  crimeDate?: string;
  crimeLocation?: string;
  description: string;
  status?: CriminalStatus;
  dangerLevel?: Severity;
}

export interface CreateCrimeTypeDto {
  name: string;
  code: string;
  description?: string;
  severity: Severity;
}

export interface UpdateCrimeTypeDto {
  name?: string;
  code?: string;
  description?: string;
  severity?: Severity;
}

export interface SearchCriminalDto {
  name?: string;
  caseNumber?: string;
  crimeTypeId?: string;
  status?: CriminalStatus;
  dangerLevel?: Severity;
  page?: number;
  limit?: number;
}

// ==================== INTERFACES DE RÉPONSE ====================

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: string;
      username: string;
      email: string;
      roles: string[];
      profile: {
        firstName: string;
        lastName: string;
        service?: string;
        grade?: string;
      };
    };
  };
}

// ==================== INTERFACES D'AUDIT ====================

export interface AuditLogData {
  userId: string;
  action: AuditAction;
  entity: EntityType;
  entityId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditChanges {
  before?: Record<string, any>;
  after?: Record<string, any>;
}

// ==================== PERMISSIONS ====================

export interface Permission {
  resource: string;
  actions: string[];
}

export interface RolePermissions {
  [key: string]: Permission[];
}


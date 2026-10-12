/**
 * Service de gestion des criminels
 */

import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/ApiError';
import { CreateCriminalDto, UpdateCriminalDto, SearchCriminalDto, CreateEvidenceDto, UpdateEvidenceDto, CreateCrimeDto } from '../types';
import fs from 'fs';
import path from 'path';

const mapArrestationInput = (data?: CreateCriminalDto['arrestation'] | UpdateCriminalDto['arrestation']) => {
  if (!data) return undefined;
  return {
    arrestDate: data.arrestDate ? new Date(data.arrestDate) : data.arrestDate === null ? null : undefined,
    arrestLocation: data.arrestLocation,
    arrestingUnit: data.arrestingUnit,
    arrestingOfficer: data.arrestingOfficer,
    warrantNumber: data.warrantNumber,
    notes: data.notes,
  };
};

const toDateOrNull = (value?: string) => {
  if (value === undefined) return undefined;
  return value ? new Date(value) : null;
};

const evidenceCategories = new Set(['WEAPON', 'DOCUMENT', 'DIGITAL', 'BIOLOGICAL', 'OTHER']);

const parseEvidenceDate = (value?: string | null) => {
  if (value === undefined) return undefined;
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, 'La date de collecte est invalide');
  }
  return date;
};

const deleteFileIfSafe = (fileUrl?: string) => {
  if (!fileUrl) return;
  const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
  const absolutePath = path.resolve(process.cwd(), relativePath);
  const uploadsRoot = path.resolve(process.cwd(), 'uploads');
  if (absolutePath.startsWith(uploadsRoot) && fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
    } catch (_) {}
  }
};

class CriminalService {
  /**
   * Creer un nouveau criminel
   */
  async createCriminal(data: CreateCriminalDto, createdById: string) {
    const crimesInput = Array.isArray(data.crimes) ? data.crimes.filter(Boolean) : [];
    const primaryCrime: CreateCrimeDto | null = crimesInput.length > 0
      ? crimesInput[0]
      : data.crimeTypeId && data.description
        ? {
            crimeTypeId: data.crimeTypeId,
            crimeDate: data.crimeDate,
            crimeLocation: data.crimeLocation,
            description: data.description,
            status: data.status,
            dangerLevel: data.dangerLevel,
          }
        : null;

    if (!primaryCrime) {
      throw new ApiError(400, 'Au moins un crime est requis');
    }

    const existingCriminal = await prisma.criminal.findUnique({
      where: { caseNumber: data.caseNumber },
    });

    if (existingCriminal) {
      throw new ApiError(409, 'Ce numero de dossier existe deja');
    }

    const crimeType = await prisma.crimeType.findUnique({
      where: { id: primaryCrime.crimeTypeId },
    });

    if (!crimeType) {
      throw new ApiError(404, 'Type de crime non trouve');
    }

    const criminal = await prisma.$transaction(async (tx) => {
      const createdCriminal = await tx.criminal.create({
        data: {
          caseNumber: data.caseNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          alias: data.alias,
          dateOfBirth: toDateOrNull(data.dateOfBirth),
          placeOfBirth: data.placeOfBirth,
          nationality: data.nationality,
          gender: data.gender,
          photo: data.photo,
          fingerprint: data.fingerprint,
          crimeTypeId: primaryCrime.crimeTypeId,
          crimeDate: toDateOrNull(primaryCrime.crimeDate),
          crimeLocation: primaryCrime.crimeLocation,
          description: primaryCrime.description,
          status: primaryCrime.status,
          dangerLevel: primaryCrime.dangerLevel,
          lastKnownAddress: data.lastKnownAddress,
          phoneNumber: data.phoneNumber,
          createdById,
          arrestation: data.arrestation
            ? {
                create: {
                  ...mapArrestationInput(data.arrestation),
                  createdById,
                },
              }
            : undefined,
        },
      });

      const crimesToCreate = crimesInput.length > 0 ? crimesInput : [primaryCrime];

      await tx.crime.createMany({
        data: crimesToCreate.map((crime) => ({
          criminalId: createdCriminal.id,
          crimeTypeId: crime.crimeTypeId,
          crimeDate: crime.crimeDate ? new Date(crime.crimeDate) : null,
          crimeLocation: crime.crimeLocation,
          description: crime.description,
          status: crime.status || 'ACTIVE',
          dangerLevel: crime.dangerLevel,
          createdById,
        })),
      });

      return createdCriminal;
    });

    return prisma.criminal.findUnique({
      where: { id: criminal.id },
      include: {
        crimeType: true,
        crimes: {
          include: {
            crimeType: true,
            createdBy: { select: { username: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        createdBy: {
          include: {
            profile: true,
          },
        },
        evidences: {
          orderBy: { createdAt: 'desc' },
        },
        arrestation: true,
      },
    });
  }

  /**
   * Save photo URL for a criminal and return updated record
   */
  async saveCriminalPhoto(
    id: string,
    photoUrl: string,
    updatedById: string,
    roles: string[]
  ) {
    const criminal = await prisma.criminal.findUnique({ where: { id } });
    if (!criminal) {
      throw new ApiError(404, 'Criminel non trouve');
    }

    if (criminal.deletedAt) {
      throw new ApiError(404, 'Criminel non trouve');
    }

    if (criminal.deletedAt) {
      throw new ApiError(404, 'Criminel non trouve');
    }

    const isAdmin = roles.includes('ADMIN');
    if (!isAdmin && criminal.photo) {
      throw new ApiError(
        403,
        'Modification non autorisée: la photo est déjà renseignée'
      );
    }

    const updated = await prisma.criminal.update({
      where: { id },
      data: { photo: photoUrl, updatedById },
      include: {
        crimeType: true,
        updatedBy: { select: { username: true, profile: true } },
        evidences: {
          orderBy: { createdAt: 'desc' },
        },
        arrestation: true,
      },
    });

    if (criminal.photo && criminal.photo !== photoUrl) {
      deleteFileIfSafe(criminal.photo);
    }

    return updated;
  }

  /**
   * Ajouter une piece a conviction
   */
  async addEvidence(id: string, data: CreateEvidenceDto, createdById: string) {
    const criminal = await prisma.criminal.findUnique({
      where: { id },
    });

    if (!criminal) {
      throw new ApiError(404, 'Criminel non trouve');
    }

    if (criminal.deletedAt) {
      throw new ApiError(404, 'Criminel non trouve');
    }

    if (!data.title && !data.description && (!data.fileUrls || data.fileUrls.length === 0)) {
      throw new ApiError(400, 'Veuillez fournir une description ou au moins un fichier de preuve');
    }

    const category = data.category || 'OTHER';
    if (!evidenceCategories.has(category)) {
      throw new ApiError(400, 'La categorie de preuve est invalide');
    }

    const evidence = await prisma.evidence.create({
      data: {
        criminalId: id,
        title: data.title,
        description: data.description,
        category,
        collectedAt: parseEvidenceDate(data.collectedAt),
        collectedAtLocation: data.collectedAtLocation || null,
        fileUrls: data.fileUrls || [],
        createdById,
      },
      include: {
        createdBy: {
          select: {
            username: true,
          },
        },
      },
    });

    return evidence;
  }

  async getEvidenceById(evidenceId: string) {
    const evidence = await prisma.evidence.findUnique({ where: { id: evidenceId } });
    if (!evidence) {
      throw new ApiError(404, 'Piece a conviction non trouvee');
    }
    return evidence;
  }

  async updateEvidence(criminalId: string, evidenceId: string, data: UpdateEvidenceDto) {
    const evidence = await this.getEvidenceById(evidenceId);
    if (evidence.criminalId !== criminalId) {
      throw new ApiError(404, 'Piece a conviction non trouvee');
    }

    if (data.category !== undefined && !evidenceCategories.has(data.category)) {
      throw new ApiError(400, 'La categorie de preuve est invalide');
    }

    return prisma.evidence.update({
      where: { id: evidenceId },
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        collectedAt: parseEvidenceDate(data.collectedAt),
        collectedAtLocation: data.collectedAtLocation,
      },
      include: {
        createdBy: { select: { username: true } },
      },
    });
  }

  /**
   * Obtenir tous les criminels avec pagination
   */
  async getAllCriminals(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [criminals, total] = await Promise.all([
      prisma.criminal.findMany({
        where: { deletedAt: null },
        skip,
        take: limit,
        include: {
          crimeType: true,
          crimes: {
            include: {
              crimeType: true,
              createdBy: { select: { username: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          createdBy: {
            select: {
              username: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          evidences: {
            orderBy: { createdAt: 'desc' },
          },
          arrestation: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.criminal.count({ where: { deletedAt: null } }),
    ]);

    return {
      criminals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtenir un criminel par ID
   */
  async getCriminalById(id: string) {
    const criminal = await prisma.criminal.findUnique({
      where: { id },
      include: {
        crimeType: true,
        crimes: {
          include: {
            crimeType: true,
            createdBy: { select: { username: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        createdBy: {
          select: {
            username: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                service: true,
                grade: true,
              },
            },
          },
        },
        updatedBy: {
          select: {
            username: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        evidences: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: {
                username: true,
              },
            },
          },
        },
        arrestation: true,
      },
    });

    if (!criminal || criminal.deletedAt) {
      throw new ApiError(404, 'Criminel non trouve');
    }

    return criminal;
  }

  /**
   * Mettre a jour un criminel
   */
  async updateCriminal(
    id: string,
    data: UpdateCriminalDto,
    updatedById: string,
    roles: string[]
  ) {
    const criminal = await prisma.criminal.findUnique({
      where: { id },
      include: { arrestation: true },
    });

    if (!criminal) {
      throw new ApiError(404, 'Criminel non trouve');
    }

    const isAdmin = roles.includes('ADMIN');
    const canFill = (value: any): boolean => value === null || value === undefined || value === '';
    const blockedFields: string[] = [];
    const allowedData: UpdateCriminalDto = {};

    if (!isAdmin) {
      const handleField = (field: keyof UpdateCriminalDto, value: any, currentValue: any) => {
        if (value === undefined) return;
        if (canFill(currentValue)) {
          (allowedData as any)[field] = value;
        } else {
          blockedFields.push(String(field));
        }
      };

      handleField('firstName', data.firstName, criminal.firstName);
      handleField('lastName', data.lastName, criminal.lastName);
      handleField('alias', data.alias, criminal.alias);
      handleField('dateOfBirth', data.dateOfBirth, criminal.dateOfBirth);
      handleField('placeOfBirth', data.placeOfBirth, criminal.placeOfBirth);
      handleField('nationality', data.nationality, criminal.nationality);
      handleField('gender', data.gender, criminal.gender);
      handleField('photo', data.photo, criminal.photo);
      handleField('fingerprint', data.fingerprint, criminal.fingerprint);
      handleField('crimeTypeId', data.crimeTypeId, criminal.crimeTypeId);
      handleField('crimeDate', data.crimeDate, criminal.crimeDate);
      handleField('crimeLocation', data.crimeLocation, criminal.crimeLocation);
      handleField('description', data.description, criminal.description);
      handleField('status', data.status, criminal.status);
      handleField('dangerLevel', data.dangerLevel, criminal.dangerLevel);
      handleField('lastKnownAddress', data.lastKnownAddress, criminal.lastKnownAddress);
      handleField('phoneNumber', data.phoneNumber, criminal.phoneNumber);

      if (data.arrestation !== undefined) {
        if (!criminal.arrestation) {
          allowedData.arrestation = data.arrestation;
        } else if (data.arrestation) {
          const allowedArrestation: any = {};
          const currentArrestation = criminal.arrestation as any;
          type ArrestationUpdate = NonNullable<UpdateCriminalDto['arrestation']>;
          const handleArrestation = (field: keyof ArrestationUpdate, value: any) => {
            if (value === undefined) return;
            if (canFill(currentArrestation[field])) {
              allowedArrestation[field] = value;
            } else {
              blockedFields.push(`arrestation.${String(field)}`);
            }
          };

          handleArrestation('arrestDate', data.arrestation.arrestDate);
          handleArrestation('arrestLocation', data.arrestation.arrestLocation);
          handleArrestation('arrestingUnit', data.arrestation.arrestingUnit);
          handleArrestation('arrestingOfficer', data.arrestation.arrestingOfficer);
          handleArrestation('warrantNumber', data.arrestation.warrantNumber);
          handleArrestation('notes', data.arrestation.notes);

          if (Object.keys(allowedArrestation).length > 0) {
            allowedData.arrestation = allowedArrestation;
          }
        }
      }

      if (blockedFields.length > 0) {
        throw new ApiError(
          403,
          `Modification non autorisée des champs déjà renseignés: ${blockedFields.join(', ')}`
        );
      }

      if (Object.keys(allowedData).length === 0) {
        throw new ApiError(400, 'Aucun champ modifiable');
      }
    }

    const effectiveData = isAdmin ? data : allowedData;

    if (effectiveData.crimeTypeId) {
      const crimeType = await prisma.crimeType.findUnique({
        where: { id: effectiveData.crimeTypeId },
      });

      if (!crimeType) {
        throw new ApiError(404, 'Type de crime non trouve');
      }
    }

    const mappedArrestation = mapArrestationInput(effectiveData.arrestation) || {};

    const updatedCriminal = await prisma.criminal.update({
      where: { id },
      data: {
        ...effectiveData,
        dateOfBirth: effectiveData.dateOfBirth ? new Date(effectiveData.dateOfBirth) : undefined,
        crimeDate: effectiveData.crimeDate ? new Date(effectiveData.crimeDate) : undefined,
        updatedById,
        arrestation: effectiveData.arrestation
          ? {
              upsert: {
                create: {
                  ...mappedArrestation,
                  createdById: updatedById,
                },
                update: mappedArrestation || {},
              },
            }
          : undefined,
      },
      include: {
        crimeType: true,
        crimes: {
          include: {
            crimeType: true,
            createdBy: { select: { username: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        updatedBy: {
          select: {
            username: true,
            profile: true,
          },
        },
        evidences: {
          orderBy: { createdAt: 'desc' },
        },
        arrestation: true,
      },
    });

    return updatedCriminal;
  }

  /**
   * Rechercher des criminels
   */
  async searchCriminals(searchParams: SearchCriminalDto) {
    const { name, caseNumber, crimeTypeId, status, dangerLevel, page = 1, limit = 10 } = searchParams;

    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (name) {
      where.OR = [
        { firstName: { contains: name, mode: 'insensitive' } },
        { lastName: { contains: name, mode: 'insensitive' } },
        { alias: { contains: name, mode: 'insensitive' } },
      ];
    }

    if (caseNumber) {
      where.caseNumber = { contains: caseNumber, mode: 'insensitive' };
    }

    if (crimeTypeId || status || dangerLevel) {
      where.crimes = {
        some: {
          ...(crimeTypeId ? { crimeTypeId } : {}),
          ...(status ? { status } : {}),
          ...(dangerLevel ? { dangerLevel } : {}),
        },
      };
    }

    const [criminals, total] = await Promise.all([
      prisma.criminal.findMany({
        where,
        skip,
        take: limit,
        include: {
          crimeType: true,
          crimes: {
            include: {
              crimeType: true,
              createdBy: { select: { username: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          createdBy: {
            select: {
              username: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          evidences: {
            orderBy: { createdAt: 'desc' },
          },
          arrestation: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.criminal.count({ where }),
    ]);

    return {
      criminals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Ajouter un crime à un criminel existant
   */
  async addCrime(id: string, data: CreateCrimeDto, createdById: string) {
    const criminal = await prisma.criminal.findUnique({
      where: { id },
    });

    if (!criminal || criminal.deletedAt) {
      throw new ApiError(404, 'Criminel non trouve');
    }

    const crimeType = await prisma.crimeType.findUnique({
      where: { id: data.crimeTypeId },
    });

    if (!crimeType) {
      throw new ApiError(404, 'Type de crime non trouve');
    }

    const crime = await prisma.crime.create({
      data: {
        criminalId: id,
        crimeTypeId: data.crimeTypeId,
        crimeDate: data.crimeDate ? new Date(data.crimeDate) : null,
        crimeLocation: data.crimeLocation,
        description: data.description,
        status: data.status || 'ACTIVE',
        dangerLevel: data.dangerLevel,
        createdById,
      },
      include: {
        crimeType: true,
        createdBy: { select: { username: true } },
      },
    });

    return crime;
  }

  /**
   * Supprimer (soft delete) un criminel et nettoyer les fichiers
   */
  async deleteCriminal(id: string, deletedById: string) {
    const criminal = await prisma.criminal.findUnique({
      where: { id },
      include: {
        evidences: true,
      },
    });

    if (!criminal || criminal.deletedAt) {
      throw new ApiError(404, 'Criminel non trouve');
    }

    await prisma.criminal.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: deletedById,
      },
    });

    deleteFileIfSafe(criminal.photo || undefined);
    criminal.evidences.forEach((evidence) => {
      (evidence.fileUrls || []).forEach((url) => deleteFileIfSafe(url));
    });

    return { message: 'Criminel supprimé avec succès' };
  }
}

export const criminalService = new CriminalService();

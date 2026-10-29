/**
 * Service de gestion des criminels
 */

import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/ApiError';
import { CreateCriminalDto, UpdateCriminalDto, SearchCriminalDto, CreateEvidenceDto, UpdateEvidenceDto, CreateCrimeDto } from '../types';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

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

export const deleteFileIfSafe = (fileUrl?: string) => {
  if (!fileUrl) return;
  const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
  const absolutePath = path.resolve(process.cwd(), relativePath);
  const uploadsRoot = path.resolve(process.cwd(), 'uploads');
  if (absolutePath.startsWith(`${uploadsRoot}${path.sep}`) && fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
    } catch (_) {}
  }
};

class CriminalService {
  async assertCriminalActive(id: string) {
    const criminal = await prisma.criminal.findUnique({ where: { id } });
    if (!criminal || criminal.deletedAt) throw new ApiError(404, 'Criminel non trouve');
    return criminal;
  }
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

    if (data.caseNumber) {
      const existingCriminal = await prisma.criminal.findUnique({ where: { caseNumber: data.caseNumber } });
      if (existingCriminal) throw new ApiError(409, 'Ce numero de dossier existe deja');
    }

    const crimeType = await prisma.crimeType.findUnique({
      where: { id: primaryCrime.crimeTypeId },
    });

    if (!crimeType) {
      throw new ApiError(404, 'Type de crime non trouve');
    }

    const criminal = await prisma.$transaction(async (tx) => {
      let caseNumber = data.caseNumber;
      if (!caseNumber) {
        do {
          const [sequenceRow] = await tx.$queryRaw<Array<{ value: string }>>`SELECT nextval('criminal_case_number_seq')::text AS value`;
          if (Number(sequenceRow.value) > 999999) throw new ApiError(503, 'La séquence des numéros de dossier a atteint sa capacité');
          caseNumber = `${new Date().getFullYear()}-${String(sequenceRow.value).padStart(6, '0')}`;
        } while (await tx.criminal.findUnique({ where: { caseNumber }, select: { id: true } }));
      }
      const createdCriminal = await tx.criminal.create({
        data: {
          caseNumber,
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
          personSituation: data.personSituation,
          offenseState: data.offenseState,
          createdById,
          arrestation: data.arrestation
            ? {
                create: {
                  ...mapArrestationInput(data.arrestation),
                  createdById,
                },
              }
            : undefined,
        } as any,
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
    }).catch((error: unknown) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new ApiError(409, 'Ce numero de dossier existe deja');
      throw error;
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
    const criminal = await this.assertCriminalActive(id);

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
      const oldPath = path.resolve(process.cwd(), criminal.photo.replace(/^\//, ''));
      const archiveDir = path.resolve(process.cwd(), 'uploads', 'archive', 'photos');
      fs.mkdirSync(archiveDir, { recursive: true });
      if (oldPath.startsWith(`${path.resolve(process.cwd(), 'uploads', 'photos')}${path.sep}`) && fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, path.join(archiveDir, `${randomUUID()}-${path.basename(oldPath)}`));
      }
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

    const evidence = await (prisma.evidence as any).create({
      data: {
        criminalId: id,
        title: data.title,
        description: data.description,
        category,
        collectedAt: parseEvidenceDate(data.collectedAt),
        collectedAtLocation: data.collectedAtLocation || null,
        fileUrls: data.fileUrls || [],
        fileHashes: data.fileHashes || [],
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
    const evidence = await prisma.evidence.findUnique({ where: { id: evidenceId }, include: { criminal: { select: { id: true, deletedAt: true } } } });
    if (!evidence) {
      throw new ApiError(404, 'Piece a conviction non trouvee');
    }
    await this.assertCriminalActive(evidence.criminalId);
    return evidence;
  }

  async getEvidenceFile(criminalId: string, evidenceId: string, fileIndex: number) {
    await this.assertCriminalActive(criminalId);
    const evidence = await this.getEvidenceById(evidenceId);
    if (evidence.criminalId !== criminalId || !Number.isSafeInteger(fileIndex)) {
      throw new ApiError(404, 'Fichier de preuve non trouve');
    }

    const fileUrl = evidence.fileUrls[fileIndex];
    if (!fileUrl?.startsWith('/uploads/evidences/')) {
      throw new ApiError(404, 'Fichier de preuve non trouve');
    }

    const evidenceRoot = path.resolve(process.cwd(), 'uploads', 'evidences');
    const filePath = path.resolve(evidenceRoot, path.basename(fileUrl));
    if (!filePath.startsWith(`${evidenceRoot}${path.sep}`) || !fs.existsSync(filePath)) {
      throw new ApiError(404, 'Fichier de preuve non trouve');
    }

    return { filePath, fileName: path.basename(filePath) };
  }

  async updateEvidence(criminalId: string, evidenceId: string, data: UpdateEvidenceDto) {
    await this.assertCriminalActive(criminalId);
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
    await this.assertCriminalActive(id);
    const criminal = await prisma.criminal.findUnique({
      where: { id },
      include: { arrestation: true },
    });

    if (!criminal) {
      throw new ApiError(404, 'Criminel non trouve');
    }

    const isAdmin = roles.includes('ADMIN');
    const canFill = (value: any): boolean => value === null || value === undefined || value === '';
    const normalized = (field: string, value: any): unknown => {
      if (value === null || value === undefined) return value;
      if (/date/i.test(field)) {
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? String(value).trim() : date.toISOString().slice(0, 10);
      }
      return typeof value === 'string' ? value.trim() : value;
    };
    const blockedFields: string[] = [];
    const allowedData: UpdateCriminalDto = {};

    if (!isAdmin) {
      const handleField = (field: keyof UpdateCriminalDto, value: any, currentValue: any) => {
        if (value === undefined) return;
        if (normalized(String(field), value) === normalized(String(field), currentValue)) return;
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
      handleField('personSituation', data.personSituation, (criminal as any).personSituation);
      handleField('offenseState', data.offenseState, (criminal as any).offenseState);

      if (data.arrestation !== undefined) {
        if (!criminal.arrestation) {
          allowedData.arrestation = data.arrestation;
        } else if (data.arrestation) {
          const allowedArrestation: any = {};
          const currentArrestation = criminal.arrestation as any;
          type ArrestationUpdate = NonNullable<UpdateCriminalDto['arrestation']>;
          const handleArrestation = (field: keyof ArrestationUpdate, value: any) => {
            if (value === undefined) return;
            if (normalized(String(field), value) === normalized(String(field), currentArrestation[field])) return;
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
        return this.getCriminalById(id);
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

    const scalarData = {
      firstName: effectiveData.firstName, lastName: effectiveData.lastName, alias: effectiveData.alias,
      dateOfBirth: effectiveData.dateOfBirth ? new Date(effectiveData.dateOfBirth) : undefined,
      placeOfBirth: effectiveData.placeOfBirth, nationality: effectiveData.nationality, gender: effectiveData.gender,
      photo: effectiveData.photo, fingerprint: effectiveData.fingerprint, crimeTypeId: effectiveData.crimeTypeId,
      crimeDate: effectiveData.crimeDate ? new Date(effectiveData.crimeDate) : undefined,
      crimeLocation: effectiveData.crimeLocation, description: effectiveData.description, status: effectiveData.status,
      dangerLevel: effectiveData.dangerLevel, lastKnownAddress: effectiveData.lastKnownAddress, phoneNumber: effectiveData.phoneNumber,
      personSituation: effectiveData.personSituation, offenseState: effectiveData.offenseState,
    };
    const updatedCriminal = await prisma.criminal.update({
      where: { id },
      data: {
        ...scalarData,
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
      } as any,
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

    if (name) where.AND = name.trim().split(/\s+/).filter(Boolean).map((term) => ({ OR: [
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName: { contains: term, mode: 'insensitive' } },
      { alias: { contains: term, mode: 'insensitive' } },
    ] }));

    if (caseNumber) {
      where.caseNumber = { contains: caseNumber, mode: 'insensitive' };
    }

    // Les filtres interrogent les crimes associés et les champs hérités affichés sur le dossier.
    if (crimeTypeId || status || dangerLevel) where.AND = [ ...(where.AND || []), { OR: [
      { ...(crimeTypeId ? { crimeTypeId } : {}), ...(status ? { status } : {}), ...(dangerLevel ? { dangerLevel } : {}) },
      { crimes: { some: { ...(crimeTypeId ? { crimeTypeId } : {}), ...(status ? { status } : {}), ...(dangerLevel ? { dangerLevel } : {}) } } },
    ] } ];

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
   * Supprimer logiquement un criminel.
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


    return { message: 'Criminel supprimé avec succès' };
  }
}

export const criminalService = new CriminalService();

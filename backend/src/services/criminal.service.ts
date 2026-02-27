/**
 * Service de gestion des criminels
 */

import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/ApiError';
import { CreateCriminalDto, UpdateCriminalDto, SearchCriminalDto, CreateEvidenceDto } from '../types';

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

class CriminalService {
  /**
   * Creer un nouveau criminel
   */
  async createCriminal(data: CreateCriminalDto, createdById: string) {
    const existingCriminal = await prisma.criminal.findUnique({
      where: { caseNumber: data.caseNumber },
    });

    if (existingCriminal) {
      throw new ApiError(409, 'Ce numero de dossier existe deja');
    }

    const crimeType = await prisma.crimeType.findUnique({
      where: { id: data.crimeTypeId },
    });

    if (!crimeType) {
      throw new ApiError(404, 'Type de crime non trouve');
    }

    const criminal = await prisma.criminal.create({
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        crimeDate: data.crimeDate ? new Date(data.crimeDate) : null,
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
      include: {
        crimeType: true,
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

    return criminal;
  }

  /**
   * Save photo URL for a criminal and return updated record
   */
  async saveCriminalPhoto(id: string, photoUrl: string, updatedById: string) {
    const criminal = await prisma.criminal.findUnique({ where: { id } });
    if (!criminal) {
      throw new ApiError(404, 'Criminel non trouve');
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

    if (!data.title && !data.description && (!data.fileUrls || data.fileUrls.length === 0)) {
      throw new ApiError(400, 'Veuillez fournir une description ou au moins un fichier de preuve');
    }

    const evidence = await prisma.evidence.create({
      data: {
        criminalId: id,
        title: data.title,
        description: data.description,
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

  /**
   * Obtenir tous les criminels avec pagination
   */
  async getAllCriminals(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [criminals, total] = await Promise.all([
      prisma.criminal.findMany({
        skip,
        take: limit,
        include: {
          crimeType: true,
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
      prisma.criminal.count(),
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

    if (!criminal) {
      throw new ApiError(404, 'Criminel non trouve');
    }

    return criminal;
  }

  /**
   * Mettre a jour un criminel
   */
  async updateCriminal(id: string, data: UpdateCriminalDto, updatedById: string) {
    const criminal = await prisma.criminal.findUnique({
      where: { id },
    });

    if (!criminal) {
      throw new ApiError(404, 'Criminel non trouve');
    }

    if (data.crimeTypeId) {
      const crimeType = await prisma.crimeType.findUnique({
        where: { id: data.crimeTypeId },
      });

      if (!crimeType) {
        throw new ApiError(404, 'Type de crime non trouve');
      }
    }

    const mappedArrestation = mapArrestationInput(data.arrestation) || {};

    const updatedCriminal = await prisma.criminal.update({
      where: { id },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        crimeDate: data.crimeDate ? new Date(data.crimeDate) : undefined,
        updatedById,
        arrestation: data.arrestation
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

    const where: any = {};

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

    if (crimeTypeId) {
      where.crimeTypeId = crimeTypeId;
    }

    if (status) {
      where.status = status;
    }

    if (dangerLevel) {
      where.dangerLevel = dangerLevel;
    }

    const [criminals, total] = await Promise.all([
      prisma.criminal.findMany({
        where,
        skip,
        take: limit,
        include: {
          crimeType: true,
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
}

export const criminalService = new CriminalService();

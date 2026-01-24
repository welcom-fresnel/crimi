/**
 * Service de gestion des criminels
 */

import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/ApiError';
import { CreateCriminalDto, UpdateCriminalDto, SearchCriminalDto } from '../types';

class CriminalService {
  /**
   * Créer un nouveau criminel
   */
  async createCriminal(data: CreateCriminalDto, createdById: string) {
    // Vérifier si le numéro de dossier existe déjà
    const existingCriminal = await prisma.criminal.findUnique({
      where: { caseNumber: data.caseNumber },
    });

    if (existingCriminal) {
      throw new ApiError(409, 'Ce numéro de dossier existe déjà');
    }

    // Vérifier si le type de crime existe
    const crimeType = await prisma.crimeType.findUnique({
      where: { id: data.crimeTypeId },
    });

    if (!crimeType) {
      throw new ApiError(404, 'Type de crime non trouvé');
    }

    // Créer le criminel
    const criminal = await prisma.criminal.create({
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        crimeDate: data.crimeDate ? new Date(data.crimeDate) : null,
        createdById,
      },
      include: {
        crimeType: true,
        createdBy: {
          include: {
            profile: true,
          },
        },
      },
    });

    return criminal;
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
      },
    });

    if (!criminal) {
      throw new ApiError(404, 'Criminel non trouvé');
    }

    return criminal;
  }

  /**
   * Mettre à jour un criminel
   */
  async updateCriminal(id: string, data: UpdateCriminalDto, updatedById: string) {
    // Vérifier si le criminel existe
    const criminal = await prisma.criminal.findUnique({
      where: { id },
    });

    if (!criminal) {
      throw new ApiError(404, 'Criminel non trouvé');
    }

    // Si le type de crime change, vérifier qu'il existe
    if (data.crimeTypeId) {
      const crimeType = await prisma.crimeType.findUnique({
        where: { id: data.crimeTypeId },
      });

      if (!crimeType) {
        throw new ApiError(404, 'Type de crime non trouvé');
      }
    }

    // Mettre à jour le criminel
    const updatedCriminal = await prisma.criminal.update({
      where: { id },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        crimeDate: data.crimeDate ? new Date(data.crimeDate) : undefined,
        updatedById,
      },
      include: {
        crimeType: true,
        updatedBy: {
          select: {
            username: true,
            profile: true,
          },
        },
      },
    });

    return updatedCriminal;
  }

  /**
   * Supprimer un criminel
   */
  async deleteCriminal(id: string) {
    // Vérifier si le criminel existe
    const criminal = await prisma.criminal.findUnique({
      where: { id },
    });

    if (!criminal) {
      throw new ApiError(404, 'Criminel non trouvé');
    }

    // Supprimer le criminel
    await prisma.criminal.delete({
      where: { id },
    });

    return { message: 'Criminel supprimé avec succès' };
  }

  /**
   * Rechercher des criminels
   */
  async searchCriminals(searchParams: SearchCriminalDto) {
    const { name, caseNumber, crimeTypeId, status, dangerLevel, page = 1, limit = 10 } = searchParams;
    
    const skip = (page - 1) * limit;
    
    // Construire les conditions de recherche
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

    // Rechercher les criminels
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


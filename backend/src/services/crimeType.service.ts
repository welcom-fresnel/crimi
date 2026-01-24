/**
 * Service de gestion des types de crimes
 */

import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/ApiError';
import { CreateCrimeTypeDto, UpdateCrimeTypeDto } from '../types';

class CrimeTypeService {
  /**
   * Créer un nouveau type de crime
   */
  async createCrimeType(data: CreateCrimeTypeDto) {
    // Vérifier si le code ou le nom existe déjà
    const existingCrimeType = await prisma.crimeType.findFirst({
      where: {
        OR: [
          { code: data.code },
          { name: data.name },
        ],
      },
    });

    if (existingCrimeType) {
      throw new ApiError(409, 'Ce type de crime existe déjà');
    }

    const crimeType = await prisma.crimeType.create({
      data,
    });

    return crimeType;
  }

  /**
   * Obtenir tous les types de crimes
   */
  async getAllCrimeTypes() {
    const crimeTypes = await prisma.crimeType.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            criminals: true,
          },
        },
      },
    });

    return crimeTypes;
  }

  /**
   * Obtenir un type de crime par ID
   */
  async getCrimeTypeById(id: string) {
    const crimeType = await prisma.crimeType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            criminals: true,
          },
        },
      },
    });

    if (!crimeType) {
      throw new ApiError(404, 'Type de crime non trouvé');
    }

    return crimeType;
  }

  /**
   * Mettre à jour un type de crime
   */
  async updateCrimeType(id: string, data: UpdateCrimeTypeDto) {
    // Vérifier si le type de crime existe
    const crimeType = await prisma.crimeType.findUnique({
      where: { id },
    });

    if (!crimeType) {
      throw new ApiError(404, 'Type de crime non trouvé');
    }

    // Vérifier les doublons si le code ou le nom change
    if (data.code || data.name) {
      const existingCrimeType = await prisma.crimeType.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                data.code ? { code: data.code } : {},
                data.name ? { name: data.name } : {},
              ],
            },
          ],
        },
      });

      if (existingCrimeType) {
        throw new ApiError(409, 'Un type de crime avec ce code ou ce nom existe déjà');
      }
    }

    const updatedCrimeType = await prisma.crimeType.update({
      where: { id },
      data,
    });

    return updatedCrimeType;
  }

  /**
   * Supprimer un type de crime
   */
  async deleteCrimeType(id: string) {
    // Vérifier si le type de crime existe
    const crimeType = await prisma.crimeType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            criminals: true,
          },
        },
      },
    });

    if (!crimeType) {
      throw new ApiError(404, 'Type de crime non trouvé');
    }

    // Vérifier si des criminels sont associés
    if (crimeType._count.criminals > 0) {
      throw new ApiError(
        400,
        `Impossible de supprimer ce type de crime car ${crimeType._count.criminals} criminel(s) y sont associés`
      );
    }

    await prisma.crimeType.delete({
      where: { id },
    });

    return { message: 'Type de crime supprimé avec succès' };
  }
}

export const crimeTypeService = new CrimeTypeService();


/**
 * Service de gestion des utilisateurs
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/ApiError';
import { UpdateUserDto } from '../types';

class UserService {
  /**
   * Obtenir la liste des roles disponibles
   */
  async getRoles() {
    return prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Obtenir tous les utilisateurs
   */
  async getAllUsers(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          profile: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtenir un utilisateur par ID
   */
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, 'Utilisateur non trouvé');
    }

    return user;
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(id: string, data: UpdateUserDto) {
    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new ApiError(404, 'Utilisateur non trouvé');
    }

    // Vérifier les doublons si le username ou l'email change
    if (data.username || data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                data.username ? { username: data.username } : {},
                data.email ? { email: data.email } : {},
              ],
            },
          ],
        },
      });

      if (existingUser) {
        throw new ApiError(409, 'Nom d\'utilisateur ou email déjà utilisé');
      }
    }

    // Préparer les données de mise à jour
    const updateData: any = {};

    if (data.username) updateData.username = data.username;
    if (data.email) updateData.email = data.email;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    // Mise à jour du profil si des données sont fournies
    const profileData: any = {};
    if (data.firstName) profileData.firstName = data.firstName;
    if (data.lastName) profileData.lastName = data.lastName;
    if (data.phoneNumber !== undefined) profileData.phoneNumber = data.phoneNumber;
    if (data.service !== undefined) profileData.service = data.service;
    if (data.grade !== undefined) profileData.grade = data.grade;

    if (Object.keys(profileData).length > 0) {
      updateData.profile = {
        update: profileData,
      };
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return updatedUser;
  }

  /**
   * Désactiver/activer un utilisateur
   */
  async toggleUserStatus(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new ApiError(404, 'Utilisateur non trouvé');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
      },
    });

    return updatedUser;
  }

  /**
   * Supprimer un utilisateur
   */
  async deleteUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new ApiError(404, 'Utilisateur non trouvé');
    }

    await prisma.user.delete({
      where: { id },
    });

    return { message: 'Utilisateur supprimé avec succès' };
  }
}

export const userService = new UserService();


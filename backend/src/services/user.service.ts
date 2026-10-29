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
  async updateUser(id: string, data: UpdateUserDto, actorId: string, actorRoles: string[]) {
    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new ApiError(404, 'Utilisateur non trouvé');
    }
    if (id === actorId && actorRoles.includes('ADMIN') && data.isActive === false) throw new ApiError(409, 'Un administrateur ne peut pas désactiver son propre compte');

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
    if (data.roleIds !== undefined) {
      const roles = await prisma.role.count({ where: { id: { in: data.roleIds } } });
      if (roles !== data.roleIds.length) throw new ApiError(400, 'Un ou plusieurs roles sont invalides');
      updateData.userRoles = { deleteMany: {}, create: data.roleIds.map((roleId) => ({ roleId })) };
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(72814021)`;
      const current = await tx.user.findUnique({ where: { id }, include: { userRoles: { include: { role: true } } } });
      if (!current) throw new ApiError(404, 'Utilisateur non trouvé');
      const currentlyAdmin = current.userRoles.some((userRole) => userRole.role.name === 'ADMIN');
      const remainsAdmin = data.roleIds === undefined ? currentlyAdmin : (await tx.role.findMany({ where: { id: { in: data.roleIds }, name: 'ADMIN' }, select: { id: true } })).length > 0;
      if (current.isActive && currentlyAdmin && (data.isActive === false || !remainsAdmin)) {
        const otherAdmins = await tx.user.count({ where: { id: { not: id }, isActive: true, userRoles: { some: { role: { name: 'ADMIN' } } } } });
        if (otherAdmins === 0) throw new ApiError(409, 'Impossible de désactiver le dernier administrateur actif');
      }
      return tx.user.update({ where: { id }, data: updateData, select: {
        id: true, username: true, email: true, isActive: true, createdAt: true, updatedAt: true, profile: true,
        userRoles: { include: { role: true } },
      } });
    });

    return updatedUser;
  }

  /**
   * Désactiver/activer un utilisateur
   */
  async toggleUserStatus(id: string, actorId: string, actorRoles: string[]) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new ApiError(404, 'Utilisateur non trouvé');
    }

    if (id === actorId && actorRoles.includes('ADMIN')) throw new ApiError(409, 'Un administrateur ne peut pas désactiver son propre compte');
    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(72814021)`;
      const current = await tx.user.findUnique({ where: { id }, include: { userRoles: { include: { role: true } } } });
      if (!current) throw new ApiError(404, 'Utilisateur non trouvé');
      if (current.isActive && current.userRoles.some((userRole) => userRole.role.name === 'ADMIN')) {
        const otherAdmins = await tx.user.count({ where: { id: { not: id }, isActive: true, userRoles: { some: { role: { name: 'ADMIN' } } } } });
        if (otherAdmins === 0) throw new ApiError(409, 'Impossible de désactiver le dernier administrateur actif');
      }
      return tx.user.update({ where: { id }, data: { isActive: !current.isActive }, select: { id: true, username: true, email: true, isActive: true } });
    });

    return updatedUser;
  }

  /**
   * Supprimer un utilisateur
   */
  async deleteUser(id: string, actorId: string, actorRoles: string[]) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new ApiError(404, 'Utilisateur non trouvé');
    }

    if (id === actorId && actorRoles.includes('ADMIN')) throw new ApiError(409, 'Un administrateur ne peut pas supprimer son propre compte');
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(72814021)`;
      const current = await tx.user.findUnique({ where: { id }, include: { userRoles: { include: { role: true } } } });
      if (!current) throw new ApiError(404, 'Utilisateur non trouvé');
      if (current.isActive && current.userRoles.some((userRole) => userRole.role.name === 'ADMIN')) {
        const otherAdmins = await tx.user.count({ where: { id: { not: id }, isActive: true, userRoles: { some: { role: { name: 'ADMIN' } } } } });
        if (otherAdmins === 0) throw new ApiError(409, 'Impossible de supprimer le dernier administrateur actif');
      }
      const related = await Promise.all([
        tx.criminal.count({ where: { createdById: id } }), tx.criminal.count({ where: { updatedById: id } }),
        tx.evidence.count({ where: { createdById: id } }), tx.crime.count({ where: { createdById: id } }),
        tx.crime.count({ where: { updatedById: id } }), tx.arrestation.count({ where: { createdById: id } }),
        tx.auditLog.count({ where: { userId: id } }),
        (tx as any).procedure.count({ where: { createdById: id } }),
        (tx as any).decision.count({ where: { decidedById: id } }),
        (tx as any).validation.count({ where: { OR: [{ submittedById: id }, { reviewerId: id }] } }),
        (tx as any).demande.count({ where: { OR: [{ createdById: id }, { reviewerId: id }] } }),
        (tx as any).dossierVersion.count({ where: { createdById: id } }),
        (tx as any).resultatPublie.count({ where: { publishedById: id } }),
      ]);
      if (related.some((count) => count > 0)) throw new ApiError(409, 'Suppression impossible : des données sont liées à ce compte. Désactivez le compte à la place.');
      await tx.user.delete({ where: { id } });
    });
    return { message: 'Utilisateur supprimé avec succès' };
  }

}

export const userService = new UserService();


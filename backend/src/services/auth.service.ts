/**
 * Service d'authentification
 */

import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/ApiError';
import { config } from '../config';
import { CreateUserDto, LoginDto, JwtPayload } from '../types';
import { getMergedPermissions } from './permission.service';

class AuthService {
  /**
   * Inscrire un nouvel utilisateur
   */
  async register(data: CreateUserDto) {
    if (!Array.isArray(data.roleIds) || data.roleIds.length === 0) {
      throw new ApiError(400, 'Au moins un role est requis');
    }

    const rolesCount = await prisma.role.count({
      where: { id: { in: data.roleIds } },
    });

    if (rolesCount !== data.roleIds.length) {
      throw new ApiError(400, 'Un ou plusieurs roles sont invalides');
    }
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: data.username },
          { email: data.email },
        ],
      },
    });

    if (existingUser) {
      throw new ApiError(409, 'Nom d\'utilisateur ou email déjà utilisé');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Créer l'utilisateur avec son profil
    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        profile: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            phoneNumber: data.phoneNumber,
            service: data.service,
            grade: data.grade,
          },
        },
        userRoles: {
          create: data.roleIds.map(roleId => ({
            roleId,
          })),
        },
      },
      include: {
        profile: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Retourner l'utilisateur sans le mot de passe
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Connecter un utilisateur
   */
  async login(data: LoginDto) {
    // Trouver l'utilisateur
    const user = await (prisma.user as any).findUnique({
      where: { username: data.username },
      include: {
        profile: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(401, 'Identifiants invalides');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new ApiError(429, 'Trop de tentatives. Réessayez plus tard.', 'TOO_MANY_ATTEMPTS');
    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid || !user.isActive) {
      if (user.isActive) {
        const failureCount = await prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${user.id} FOR UPDATE`;
          const current: any = await (tx.user as any).findUnique({ where: { id: user.id }, select: { failedLoginCount: true } });
          const failedLoginCount = (current?.failedLoginCount || 0) + 1;
          await (tx.user as any).update({ where: { id: user.id }, data: {
            failedLoginCount,
            lockedUntil: failedLoginCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
          } });
          return failedLoginCount;
        });
        if (failureCount >= 5) throw new ApiError(429, 'Trop de tentatives. Réessayez plus tard.', 'TOO_MANY_ATTEMPTS');
      }
      throw new ApiError(401, 'Identifiants invalides');
    }

    if (user.failedLoginCount !== 0 || user.lockedUntil) await (prisma.user as any).update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });

    // Générer le token JWT
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      roles: user.userRoles.map((ur: any) => ur.role.name),
    };

    if (!config.jwtSecret) {
      throw new Error('JWT_SECRET n\'est pas configuré');
    }

    const token = jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn, algorithm: 'HS256' } as SignOptions
    );

    const roles = user.userRoles.map((ur: any) => ur.role.name);
    return {
      token,
      mustChangePassword: Boolean(user.mustChangePassword),
      permissions: getMergedPermissions(roles),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles,
        mustChangePassword: Boolean(user.mustChangePassword),
        profile: {
          firstName: user.profile?.firstName,
          lastName: user.profile?.lastName,
          service: user.profile?.service,
          grade: user.profile?.grade,
        },
      },
    };
  }

  /**
   * Changer le mot de passe d'un utilisateur
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'Utilisateur non trouvé');
    }

    // Vérifier l'ancien mot de passe
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      throw new ApiError(401, 'Ancien mot de passe incorrect');
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await (prisma.user as any).update({
      where: { id: userId },
      data: { password: hashedPassword, mustChangePassword: false, failedLoginCount: 0, lockedUntil: null },
    });

    return { message: 'Mot de passe modifié avec succès' };
  }
}

export const authService = new AuthService();


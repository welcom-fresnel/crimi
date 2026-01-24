/**
 * Service d'authentification
 */

import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/ApiError';
import { config } from '../config';
import { CreateUserDto, LoginDto, JwtPayload } from '../types';

class AuthService {
  /**
   * Inscrire un nouvel utilisateur
   */
  async register(data: CreateUserDto) {
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
    const user = await prisma.user.findUnique({
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

    // Vérifier si l'utilisateur est actif
    if (!user.isActive) {
      throw new ApiError(403, 'Compte désactivé');
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw new ApiError(401, 'Identifiants invalides');
    }

    // Générer le token JWT
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      roles: user.userRoles.map(ur => ur.role.name),
    };

    if (!config.jwtSecret) {
      throw new Error('JWT_SECRET n\'est pas configuré');
    }

    const token = jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as SignOptions
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.userRoles.map(ur => ur.role.name),
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
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Mot de passe modifié avec succès' };
  }
}

export const authService = new AuthService();


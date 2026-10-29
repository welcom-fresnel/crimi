/**
 * Script de seed pour initialiser la base de données
 */

import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ROLE_PERMISSIONS } from '../src/config/permissions';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seed de la base de données...\n');

  // ==================== CRÉATION DES RÔLES ====================
  console.log('📝 Création des rôles...');

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: { permissions: ROLE_PERMISSIONS.ADMIN as unknown as Prisma.InputJsonValue },
    create: {
      name: 'ADMIN',
      description: 'Administrateur système avec tous les droits',
      permissions: ROLE_PERMISSIONS.ADMIN as unknown as Prisma.InputJsonValue,
    },
  });

  const agentRole = await prisma.role.upsert({
    where: { name: 'AGENT' },
    update: { permissions: ROLE_PERMISSIONS.AGENT as unknown as Prisma.InputJsonValue },
    create: {
      name: 'AGENT',
      description: 'Agent de sécurité avec droits de gestion des criminels',
      permissions: ROLE_PERMISSIONS.AGENT as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.role.upsert({
    where: { name: 'VIEWER' },
    update: { permissions: ROLE_PERMISSIONS.VIEWER as unknown as Prisma.InputJsonValue },
    create: {
      name: 'VIEWER',
      description: 'Utilisateur en lecture seule',
      permissions: ROLE_PERMISSIONS.VIEWER as unknown as Prisma.InputJsonValue,
    },
  });

  console.log('✅ Rôles créés avec succès\n');

  // ==================== CRÉATION DES UTILISATEURS ====================
  console.log('👤 Création des utilisateurs...');

  const seedPassword = process.env.SEED_ADMIN_PASSWORD || randomBytes(24).toString('base64url');
  if (process.env.NODE_ENV === 'production' && seedPassword.length < 12) throw new Error('SEED_ADMIN_PASSWORD doit contenir au moins 12 caractères en production');
  if (!process.env.SEED_ADMIN_PASSWORD) console.log(`Mot de passe administrateur initial (à conserver une seule fois): ${seedPassword}`);
  const hashedPassword = await bcrypt.hash(seedPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@securit-afrique.com' },
    update: { password: hashedPassword, mustChangePassword: true },
    create: {
      username: 'admin',
      email: 'admin@securit-afrique.com',
      password: hashedPassword,
      isActive: true,
      mustChangePassword: true,
      profile: {
        create: {
          firstName: 'Super',
          lastName: 'Administrateur',
          phoneNumber: '+237 690 000 000',
          service: 'Administration Centrale',
          grade: 'Commissaire Principal',
        },
      },
      userRoles: {
        create: {
          roleId: adminRole.id,
        },
      },
    },
  });

  const agentUser = await prisma.user.upsert({
    where: { email: 'agent@securit-afrique.com' },
    update: {},
    create: {
      username: 'agent1',
      email: 'agent@securit-afrique.com',
      password: hashedPassword,
      isActive: true,
      profile: {
        create: {
          firstName: 'Jean',
          lastName: 'Dupont',
          phoneNumber: '+237 690 111 111',
          service: 'Police Judiciaire',
          grade: 'Inspecteur',
        },
      },
      userRoles: {
        create: {
          roleId: agentRole.id,
        },
      },
    },
  });

  console.log('✅ Utilisateurs créés avec succès\n');

  // ==================== CRÉATION DES TYPES DE CRIMES ====================
  console.log('🔍 Création des types de crimes...');

  const crimeTypes = [
    {
      name: 'Vol à main armée',
      code: 'VOLAR001',
      description: 'Vol commis avec usage ou menace d\'arme',
      severity: 'HIGH',
    },
    {
      name: 'Homicide volontaire',
      code: 'MEUR001',
      description: 'Meurtre avec préméditation',
      severity: 'CRITICAL',
    },
    {
      name: 'Trafic de stupéfiants',
      code: 'DRUG001',
      description: 'Commerce illégal de drogues',
      severity: 'HIGH',
    },
    {
      name: 'Kidnapping',
      code: 'KIDN001',
      description: 'Enlèvement de personne',
      severity: 'CRITICAL',
    },
    {
      name: 'Fraude',
      code: 'FRAU001',
      description: 'Escroquerie et fraude financière',
      severity: 'MEDIUM',
    },
    {
      name: 'Vol simple',
      code: 'VOL001',
      description: 'Vol sans violence',
      severity: 'LOW',
    },
    {
      name: 'Cybercriminalité',
      code: 'CYBER001',
      description: 'Crimes informatiques',
      severity: 'MEDIUM',
    },
    {
      name: 'Terrorisme',
      code: 'TERR001',
      description: 'Actes de terrorisme',
      severity: 'CRITICAL',
    },
  ];

  for (const crimeType of crimeTypes) {
    await prisma.crimeType.upsert({
      where: { code: crimeType.code },
      update: {},
      create: crimeType as any,
    });
  }

  console.log('✅ Types de crimes créés avec succès\n');

  // ==================== CRÉATION D'EXEMPLES DE CRIMINELS ====================
  console.log('👮 Création d\'exemples de criminels...');

  const drugCrimeType = await prisma.crimeType.findUnique({
    where: { code: 'DRUG001' },
  });

  const murderCrimeType = await prisma.crimeType.findUnique({
    where: { code: 'MEUR001' },
  });

  if (drugCrimeType && murderCrimeType) {
    await prisma.criminal.upsert({
      where: { caseNumber: 'CR-2024-001' },
      update: {},
      create: {
        caseNumber: 'CR-2024-001',
        firstName: 'Michel',
        lastName: 'Kamga',
        alias: 'Le Boss',
        dateOfBirth: new Date('1985-05-15'),
        placeOfBirth: 'Douala',
        nationality: 'Camerounaise',
        gender: 'MALE',
        crimeTypeId: drugCrimeType.id,
        crimeDate: new Date('2024-01-15'),
        crimeLocation: 'Yaoundé, Quartier Bastos',
        description: 'Trafic international de stupéfiants. Suspect arrêté avec 50kg de cocaïne.',
        status: 'ARRESTED',
        dangerLevel: 'HIGH',
        lastKnownAddress: 'Yaoundé, Cameroun',
        createdById: adminUser.id,
      },
    });

    const criminal1 = await prisma.criminal.findUnique({
      where: { caseNumber: 'CR-2024-001' },
    });

    if (criminal1) {
      const existingCrime1 = await prisma.crime.findFirst({
        where: { criminalId: criminal1.id },
      });
      if (!existingCrime1) {
        await prisma.crime.create({
          data: {
            criminalId: criminal1.id,
            crimeTypeId: drugCrimeType.id,
            crimeDate: new Date('2024-01-15'),
            crimeLocation: 'Yaoundé, Quartier Bastos',
            description: 'Trafic international de stupéfiants. Suspect arrêté avec 50kg de cocaïne.',
            status: 'ARRESTED',
            dangerLevel: 'HIGH',
            createdById: adminUser.id,
          },
        });
      }
    }

    await prisma.criminal.upsert({
      where: { caseNumber: 'CR-2024-002' },
      update: {},
      create: {
        caseNumber: 'CR-2024-002',
        firstName: 'Paul',
        lastName: 'Nguema',
        alias: 'Le Fantôme',
        dateOfBirth: new Date('1990-08-20'),
        placeOfBirth: 'Libreville',
        nationality: 'Gabonaise',
        gender: 'MALE',
        crimeTypeId: murderCrimeType.id,
        crimeDate: new Date('2024-02-10'),
        crimeLocation: 'Libreville, Gabon',
        description: 'Meurtre prémédité. Suspect toujours en fuite, considéré comme très dangereux.',
        status: 'ACTIVE',
        dangerLevel: 'CRITICAL',
        lastKnownAddress: 'Libreville, Gabon',
        createdById: agentUser.id,
      },
    });

    const criminal2 = await prisma.criminal.findUnique({
      where: { caseNumber: 'CR-2024-002' },
    });

    if (criminal2) {
      const existingCrime2 = await prisma.crime.findFirst({
        where: { criminalId: criminal2.id },
      });
      if (!existingCrime2) {
        await prisma.crime.create({
          data: {
            criminalId: criminal2.id,
            crimeTypeId: murderCrimeType.id,
            crimeDate: new Date('2024-02-10'),
            crimeLocation: 'Libreville, Gabon',
            description: 'Meurtre prémédité. Suspect toujours en fuite, considéré comme très dangereux.',
            status: 'ACTIVE',
            dangerLevel: 'CRITICAL',
            createdById: agentUser.id,
          },
        });
      }
    }
  }

  console.log('✅ Exemples de criminels créés avec succès\n');

  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Seed terminé avec succès!');
  console.log('═══════════════════════════════════════════════════');
  console.log('\n📋 Compte administrateur initial:');
  console.log('   Identifiant de connexion: admin');
  console.log('   Email: admin@securit-afrique.com');
  console.log('   Mot de passe: utilisez SEED_ADMIN_PASSWORD ou le mot de passe aléatoire affiché au début du seed.');
  console.log('═══════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


const dotenv = require('dotenv');
const { spawnSync } = require('node:child_process');
dotenv.config();

const testUrl = process.env.DATABASE_URL_TEST;
const normalUrl = process.env.DATABASE_URL;
if (!testUrl) {
  console.error('DATABASE_URL_TEST est obligatoire pour les tests.');
  process.exit(1);
}
try {
  const target = new URL(testUrl);
  const current = normalUrl ? new URL(normalUrl) : null;
  if (current && (testUrl === normalUrl || (target.host === current.host && target.pathname === current.pathname))) {
    console.error('DATABASE_URL_TEST doit désigner une base distincte de DATABASE_URL.');
    process.exit(1);
  }
} catch {
  console.error('DATABASE_URL_TEST n’est pas une URL valide.');
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: testUrl };
const run = (args) => {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
};
run(['node_modules/prisma/build/index.js', 'generate', '--schema', 'prisma/schema.prisma']);
run(['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma']);
run(['node_modules/ts-node/dist/bin.js', 'prisma/seed.ts']);
run(['node_modules/vitest/vitest.mjs', 'run']);

import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

const envPathCandidates = [
  path.resolve(import.meta.dirname, '../../../.env'),
  path.resolve(import.meta.dirname, '../../../../.env'),
  path.resolve(import.meta.dirname, '../../../../../.env'),
];

const rootEnvPath = envPathCandidates.find((candidate) => fs.existsSync(candidate));

if (rootEnvPath) {
  dotenv.config({ path: rootEnvPath });
}

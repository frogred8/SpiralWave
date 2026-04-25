import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

const envPathCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(__dirname, '../../../../.env'),
  path.resolve(__dirname, '../../../../../.env'),
];

const rootEnvPath = envPathCandidates.find((candidate) => fs.existsSync(candidate));

if (rootEnvPath) {
  dotenv.config({ path: rootEnvPath });
}

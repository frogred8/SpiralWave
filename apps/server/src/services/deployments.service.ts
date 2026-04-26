import fs from 'node:fs/promises';
import path from 'node:path';
import type { DeploymentEntry, DeploymentsResponse } from '@repo/shared';

function getDeploymentsFilePath() {
  return process.env.DEPLOYMENTS_FILE || path.resolve(process.cwd(), 'deployments.json');
}

function isDeploymentEntry(value: unknown): value is DeploymentEntry {
  if (!value || typeof value !== 'object') return false;

  const entry = value as Partial<DeploymentEntry>;
  return typeof entry.id === 'string'
    && typeof entry.title === 'string'
    && typeof entry.url === 'string'
    && typeof entry.status === 'string'
    && typeof entry.released_at === 'string';
}

export const DeploymentsService = {
  async getDeployments(): Promise<DeploymentsResponse> {
    try {
      const raw = await fs.readFile(getDeploymentsFilePath(), 'utf8');
      const parsed = JSON.parse(raw);
      const deployments = Array.isArray(parsed)
        ? parsed.filter(isDeploymentEntry)
        : [];

      return {
        deployments: deployments
          .filter((deployment) => deployment.status === 'active')
          .sort((a, b) => Date.parse(b.released_at) - Date.parse(a.released_at))
      };
    } catch (err: any) {
      if (err?.code !== 'ENOENT') {
        console.error('Failed to read deployments:', err);
      }

      return { deployments: [] };
    }
  }
};

import fs from 'node:fs/promises';
import path from 'node:path';
import type { DeploymentEntry, DeploymentsResponse } from '@repo/shared';

function getDeploymentsFilePath() {
  return process.env.DEPLOYMENTS_FILE || path.resolve(process.cwd()+'../../../', 'deployments.json');
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

let cachedDeployments: DeploymentsResponse | null = null;
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const DeploymentsService = {
  async getDeployments(): Promise<DeploymentsResponse> {
    if (cachedDeployments && Date.now() - lastCacheTime < CACHE_DURATION) {
      return cachedDeployments;
    }
    try {
      const deployments = await this.readDeployments();
      cachedDeployments = { deployments: deployments };
      lastCacheTime = Date.now();
      return cachedDeployments;
    } catch (err: any) {
      if (err?.code !== 'ENOENT') {
        console.error('Failed to read deployments:', err);
      }
      return { deployments: [] };
    }
  },

  async readDeployments(): Promise<DeploymentEntry[]> {
    const raw = await fs.readFile(getDeploymentsFilePath(), 'utf8');
    const parsed = JSON.parse(raw);
    const deployments = Array.isArray(parsed)
      ? parsed.filter(isDeploymentEntry)
      : [];
    return deployments;
  },

  clearDeploymentsCache() {
    cachedDeployments = null;
    lastCacheTime = 0;
  }

};

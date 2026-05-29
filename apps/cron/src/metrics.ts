import cron from 'node-cron';
import fs from 'node:fs';
import path from 'node:path';

type DeploymentEntry = {
    id: string;
    url?: string;
};

type ServerMetricsResponse = {
    start?: number;
    end?: number;
    '/start'?: number;
    '/end'?: number;
};

type StoredRouteMetrics = {
    '/start': number;
    '/end': number;
};

type StoredMetrics = Record<string, Record<string, StoredRouteMetrics>>;

const METRICS_CRON = '*/5 * * * *';
const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..', '..');

function findProjectFile(fileName: string) {
    const candidates = [
        path.resolve(process.cwd(), fileName),
        path.resolve(process.cwd(), '..', fileName),
        path.resolve(process.cwd(), '..', '..', fileName),
        path.resolve(import.meta.dirname, '..', '..', '..', fileName),
        path.resolve(import.meta.dirname, '..', '..', '..', '..', fileName),
    ];

    return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function getDateKey(date: Date) {
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function getDeploymentsFilePath() {
    return process.env.METRICS_DEPLOYMENTS_FILE || process.env.DEPLOYMENTS_SOURCE_FILE || findProjectFile('deployments.json');
}

function getMetricsFilePath() {
    return process.env.METRICS_OUTPUT_FILE || path.join(PROJECT_ROOT, 'deployment-metrics.json');
}

function readDeployments(filePath: string): DeploymentEntry[] {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const deployments = JSON.parse(content) as DeploymentEntry[];
        return Array.isArray(deployments) ? deployments.filter((deployment) => deployment.id && deployment.url) : [];
    } catch (error) {
        console.error('deployments.json 조회 실패:', error);
        return [];
    }
}

function readStoredMetrics(filePath: string): StoredMetrics {
    if (!fs.existsSync(filePath)) {
        return {};
    }

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const metrics = JSON.parse(content) as StoredMetrics;
        return metrics && typeof metrics === 'object' && !Array.isArray(metrics) ? metrics : {};
    } catch (error) {
        console.error('metrics 파일 조회 실패:', error);
        return {};
    }
}

function normalizeMetrics(data: ServerMetricsResponse): StoredRouteMetrics | null {
    const start = typeof data.start === 'number' ? data.start : data['/start'];
    const end = typeof data.end === 'number' ? data.end : data['/end'];

    if (typeof start !== 'number' || typeof end !== 'number') {
        return null;
    }

    return {
        '/start': start,
        '/end': end,
    };
}

async function fetchDeploymentMetrics(deployment: DeploymentEntry): Promise<StoredRouteMetrics | null> {
    if (!deployment.url) {
        return null;
    }

    try {
        const metricsUrl = new URL('/metrics', deployment.url).toString();
        const response = await fetch(metricsUrl);
        if (!response.ok) {
            console.error(`metrics 조회 실패: ${deployment.id} ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json() as ServerMetricsResponse;
        const metrics = normalizeMetrics(data);
        if (!metrics) {
            console.error(`metrics 응답 형식 오류: ${deployment.id}`);
        }
        return metrics;
    } catch (error) {
        console.error(`metrics 조회 중 오류: ${deployment.id}`, error);
        return null;
    }
}

export async function collectDeploymentMetrics() {
    const deploymentsFilePath = getDeploymentsFilePath();
    const metricsFilePath = getMetricsFilePath();
    const deployments = readDeployments(deploymentsFilePath);
    const collectedEntries = await Promise.all(
        deployments.map(async (deployment) => ({
            id: deployment.id,
            metrics: await fetchDeploymentMetrics(deployment),
        }))
    );

    const dailyMetrics: Record<string, StoredRouteMetrics> = {};
    for (const entry of collectedEntries) {
        if (entry.metrics) {
            dailyMetrics[entry.id] = entry.metrics;
        }
    }

    const dateKey = getDateKey(new Date());
    const storedMetrics = readStoredMetrics(metricsFilePath);
    storedMetrics[dateKey] = {
        ...(storedMetrics[dateKey] || {}),
        ...dailyMetrics,
    };

    fs.mkdirSync(path.dirname(metricsFilePath), { recursive: true });
    fs.writeFileSync(metricsFilePath, JSON.stringify(storedMetrics, null, 2) + '\n');
    console.log(`metrics 저장 완료: ${metricsFilePath}`);
}

export function startDeploymentMetricsJob() {
    cron.schedule(METRICS_CRON, () => {
        void collectDeploymentMetrics();
    });

    console.log(`Deployment metrics cron scheduled: ${METRICS_CRON}`);
}

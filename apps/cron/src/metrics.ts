import cron from 'node-cron';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

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
    '/start': number[];
    '/end': number[];
};

type CollectedRouteMetrics = {
    '/start': number;
    '/end': number;
};

type StoredMetrics = Record<string, Record<string, StoredRouteMetrics>>;

const METRICS_CRON = '*/5 * * * *';
const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const execFileAsync = promisify(execFile);

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
    return process.env.METRICS_OUTPUT_FILE || path.join(PROJECT_ROOT, 'metrics.json');
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

function toNumberArray(value: unknown): number[] {
    if (Array.isArray(value)) {
        return value.filter((item): item is number => typeof item === 'number');
    }

    return typeof value === 'number' ? [value] : [];
}

function normalizeStoredMetrics(metrics: unknown): StoredMetrics {
    if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) {
        return {};
    }

    const normalized: StoredMetrics = {};
    for (const [dateKey, dailyValue] of Object.entries(metrics)) {
        if (!dailyValue || typeof dailyValue !== 'object' || Array.isArray(dailyValue)) {
            continue;
        }

        normalized[dateKey] = {};
        for (const [deploymentId, routeValue] of Object.entries(dailyValue)) {
            if (!routeValue || typeof routeValue !== 'object' || Array.isArray(routeValue)) {
                continue;
            }

            const routeMetrics = routeValue as Record<string, unknown>;
            normalized[dateKey][deploymentId] = {
                '/start': toNumberArray(routeMetrics['/start']),
                '/end': toNumberArray(routeMetrics['/end']),
            };
        }
    }

    return normalized;
}

function readStoredMetrics(filePath: string): StoredMetrics {
    if (!fs.existsSync(filePath)) {
        return {};
    }

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return normalizeStoredMetrics(JSON.parse(content));
    } catch (error) {
        console.error('metrics 파일 조회 실패:', error);
        return {};
    }
}

function normalizeMetrics(data: ServerMetricsResponse): CollectedRouteMetrics | null {
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

async function fetchDeploymentMetrics(deployment: DeploymentEntry): Promise<CollectedRouteMetrics | null> {
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

    const dailyMetrics: Record<string, CollectedRouteMetrics> = {};
    for (const entry of collectedEntries) {
        if (entry.metrics) {
            dailyMetrics[entry.id] = entry.metrics;
        }
    }

    const dateKey = getDateKey(new Date());
    const storedMetrics = readStoredMetrics(metricsFilePath);
    storedMetrics[dateKey] = storedMetrics[dateKey] || {};
    for (const [deploymentId, metrics] of Object.entries(dailyMetrics)) {
        const storedRouteMetrics = storedMetrics[dateKey][deploymentId] || { '/start': [], '/end': [] };
        storedRouteMetrics['/start'].push(metrics['/start']);
        storedRouteMetrics['/end'].push(metrics['/end']);
        storedMetrics[dateKey][deploymentId] = storedRouteMetrics;
    }

    fs.mkdirSync(path.dirname(metricsFilePath), { recursive: true });
    fs.writeFileSync(metricsFilePath, JSON.stringify(storedMetrics, null, 2) + '\n');
    //console.log(`metrics 저장 완료: ${metricsFilePath}`);

    await commitMetricsFileToMain(metricsFilePath);
}

export function startDeploymentMetricsJob() {
    cron.schedule(METRICS_CRON, () => {
        void collectDeploymentMetrics();
    });

    console.log(`Deployment metrics cron scheduled: ${METRICS_CRON}`);
}

async function commitMetricsFileToMain(metricsFilePath: string) {
    const relativeMetricsPath = path.relative(PROJECT_ROOT, metricsFilePath);
    if (relativeMetricsPath.startsWith('..') || path.isAbsolute(relativeMetricsPath)) {
        console.error(`metrics 파일이 git 프로젝트 밖에 있어 커밋하지 않습니다: ${metricsFilePath}`);
        return;
    }

    try {
        const branchResult = await execFileAsync('git', ['-C', PROJECT_ROOT, 'branch', '--show-current']);
        const currentBranch = branchResult.stdout.trim();
        if (currentBranch !== 'main') {
            console.error(`현재 브랜치가 main이 아니어서 metrics 커밋을 건너뜁니다: ${currentBranch}`);
            return;
        }

        const dateKey = getDateKey(new Date());
        const lastCommitResult = await execFileAsync('git', [
            '-C',
            PROJECT_ROOT,
            'log',
            '-1',
            '--format=%s',
            '--',
            relativeMetricsPath,
        ]);
        if (lastCommitResult.stdout.trim() === `chore: Update metrics [${dateKey}]`) {
            return;
        }

        await execFileAsync('git', ['-C', PROJECT_ROOT, 'add', relativeMetricsPath]);
        const statusResult = await execFileAsync('git', ['-C', PROJECT_ROOT, 'status', '--porcelain', '--', relativeMetricsPath]);
        if (!statusResult.stdout.trim()) {
            console.log('metrics 변경사항이 없어 커밋을 건너뜁니다.');
            return;
        }

        await execFileAsync('git', [
            '-C',
            PROJECT_ROOT,
            'commit',
            '-m',
            `chore: Update metrics [${dateKey}]`,
            '--',
            relativeMetricsPath,
        ]);
        await execFileAsync('git', ['-C', PROJECT_ROOT, 'pull', '--rebase', 'origin', 'main']);
        await execFileAsync('git', ['-C', PROJECT_ROOT, 'push', 'origin', 'main']);
        console.log('metrics 변경사항을 main에 커밋하고 push했습니다.');
    } catch (error) {
        console.error('metrics git 커밋 실패:', error);
    }
}

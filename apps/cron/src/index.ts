import cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Gemini SDK 초기화
const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3-flash-preview' });

// Gemini 응답 인터페이스
interface GeminiResponse {
    ok: boolean;
    text: string;
}

const gemini = {
    generateText: async (prompt: string): Promise<GeminiResponse> => {
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return { ok: true, text: response.text() };
        } catch (error) {
            console.error('Gemini API 호출 중 오류 발생:', error);
            return { ok: false, text: `[API ERROR] 분석에 실패했습니다: ${error}` };
        }
    }
};

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const REPO_URL = process.env.REPO_URL || 'https://github.com/frogred8/SpiralWave.git';
const TEMP_BASE_DIR = process.env.TEMP_DIR || path.join(process.cwd(), '.tmp');

console.log(`Start Cron (${new Date().toISOString()})`);
console.log(`SERVER_URL: ${SERVER_URL}`);

function convertDateFormat(date: Date): string {
    const pad = (n: any) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`;
};


await run();

// 매시 정각마다 실행 (초 분 시 일 월 요일)
cron.schedule('0 0 * * * *', async () => {
    try {
        await run();
    } catch (error) {
        console.error('오류 발생:', error);
    }
});

async function run() {
    const timestamp = convertDateFormat(new Date());
    console.log(`[${timestamp}] 크론 작업 시작...`);

    // 1. 데이터 API 호출
    const rawData = await getRawData();
    if (rawData === '') {
        console.error('데이터 API 호출 실패 또는 데이터 없음');
        return;
    }

    // 2. rawData를 분석하여 plan 생성
    const prompt = await buildPromptFromRawData(rawData);
    if (prompt === '') {
        console.error('Gemini 프롬프트 생성 실패');
        return;
    }

    // 2-1. 파일 저장
    savePromptToFile(prompt);

    const tempDir = path.join(TEMP_BASE_DIR, `spiralwave_${timestamp}`);
    const branchName = `cron_${timestamp}`;

    try {
        // 5. main 브랜치를 임시 폴더에 clone
        console.log(`[${timestamp}] 임시 폴더에 클론 중: ${tempDir}`);
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        await execAsync(`git clone -b main ${REPO_URL} ${tempDir}`);

        // 6. 날짜_시간 이름으로 브랜치를 생성
        console.log(`[${timestamp}] 브랜치 생성 중: ${branchName}`);
        await execAsync(`git checkout -b ${branchName}`, { cwd: tempDir });
        
        // 7. rawData와 plan을 README.md에 저장
        console.log(`[${timestamp}] README.md 업데이트 중`);
        const readmePath = path.join(tempDir, 'README.md');
        const readmeContent = `
# Automatic Update - ${timestamp}

## Raw User Feedback
\`\`\`
${rawData}
\`\`\`

## Gemini AI Plan
${prompt}
        `;
        fs.writeFileSync(readmePath, readmeContent);
        await execAsync(`git add README.md`, { cwd: tempDir });
        await execAsync(`git commit -m "docs: Update README with user feedback and AI plan [${timestamp}]"`, { cwd: tempDir });

        // 8. 플랜 기반으로 코드 생성 및 커밋
        await runGeminiCli(prompt, tempDir);

        // 9. 브랜치를 원격 저장소에 푸시
        console.log(`[${timestamp}] 원격 저장소에 푸시 중`);
        await execAsync(`git push origin ${branchName}`, { cwd: tempDir });
        console.log(`[${timestamp}] 작업 완료 및 푸시 성공: ${branchName}`);

    } catch (error) {
        console.error(`[${timestamp}] 작업 중 오류 발생:`, error);
    } finally {
        // 임시 폴더 삭제 (필요시 주석 해제)
        // if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

async function runGeminiCli(prompt: string, cwd: string) {
    console.log('gemini-cli 실행 중...');
    try {
        // 프롬프트 내의 큰따옴표를 이스케이프 처리하여 쉘 인자로 안전하게 전달
        const escapedPrompt = prompt.replace(/"/g, '\\"');
        const { stdout, stderr } = await execAsync(`gemini "${escapedPrompt}"`, { cwd });
        
        if (stdout) console.log('gemini-cli 결과:', stdout);
        if (stderr) console.error('gemini-cli 에러 출력:', stderr);
    } catch (error) {
        console.error('gemini-cli 실행 실패:', error);
    }
}

async function getRawData(): Promise<string> {
    const res = await fetch(`${SERVER_URL}/leaderboard`);
    if (!res.ok) {
        return '';
    }

    const data = await res.json() as { ranks: { msg: string }[] };
    const rawData = data.ranks.map(rank => rank.msg).join('\n');

    return rawData || '';
}

async function buildPromptFromRawData(rawData: string): Promise<string> {
    const res = await gemini.generateText(`
        @apps/client @apps/server 이건 유저들의 요구사항이 담긴 다국어 문자열이야. 이 요구사항을 영어로 번역 후 분석하고 정리해서, 코드 생성을 위한 플랜을 프롬프트 형태로 만들어: ${rawData}`);
    if (res.ok) {
        return res.text;
    }
    return '';
}

function savePromptToFile(prompt: string) {
    const fileName = `gemini_${convertDateFormat(new Date())}.log`;
    fs.writeFileSync(fileName, prompt);
    console.log(`저장 완료: ${fileName}`);
}

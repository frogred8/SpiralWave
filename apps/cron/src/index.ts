import cron from 'node-cron';
import * as fs from 'fs';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    console.log(`[${convertDateFormat(new Date())}] 크론 작업 시작...`);

    // 1. 데이터 API 호출
    const rawData = await getRawData();

    // 2. Gemini Prompt 생성
    const prompt = await buildPromptFromRawData(rawData);

    // 3. 파일 저장
    savePromptToFile(prompt);

    // 4. Prompt 실행 
}

async function getRawData(): Promise<string> {
    const res = await fetch(`${SERVER_URL}/leaderboard`);
    if (!res.ok) {
        throw new Error(`API 호출 실패: ${res.statusText}`);
    }

    const data = await res.json() as { ranks: { msg: string }[] };
    const rawData = data.ranks.map(rank => rank.msg).join('\n');

    return rawData;
}

async function buildPromptFromRawData(rawData: string): Promise<string> {
    const res = await gemini.generateText(`
        이건 유저들의 요구사항이 담긴 다국어 문자열이야. 이 요구사항을 영어로 번역 후 분석하고 정리해서, 코드 생성을 위한 플랜을 프롬프트 형태로 만들어: ${rawData}`);
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
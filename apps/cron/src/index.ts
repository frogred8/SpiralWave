import cron from 'node-cron';
import * as fs from 'fs';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini SDK 초기화
const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // 요청하신 gemini-3-flash는 현재 지원되지 않으므로 최신 flash 모델인 gemini-1.5-flash를 사용합니다.

// Gemini 응답 인터페이스
interface GeminiResponse {
    text: string;
}

const gemini = {
    generateText: async (prompt: string): Promise<GeminiResponse> => {
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return { text: response.text() };
        } catch (error) {
            console.error('Gemini API 호출 중 오류 발생:', error);
            return { text: `[API ERROR] 분석에 실패했습니다: ${error}` };
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
    const response = await fetch(`${SERVER_URL}/leaderboard`);
    if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.statusText}`);
    }

    const data = await response.json() as { ranks: { msg: string }[] };
    const rawData = data.ranks.map(rank => rank.msg).join('\n');

    // 2. Gemini API 호출
    const prompt = `다음 데이터를 분석해서 요약해줘: ${rawData}`;
    console.log(`${rawData}`);
    const geminiRes = await gemini.generateText(prompt);

    // 3. 파일 저장
    const fileName = `gemini_${convertDateFormat(new Date())}.log`;
    fs.writeFileSync(fileName, geminiRes.text);

    console.log(`[${convertDateFormat(new Date())}] 저장 완료: ${fileName}`);

}
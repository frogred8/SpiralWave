import cron from 'node-cron';
import * as fs from 'fs';
import 'dotenv/config';

// 가상의 Gemini SDK 인터페이스
interface GeminiResponse {
    text: string;
}

const gemini = {
    generateText: async (prompt: string): Promise<GeminiResponse> => {
        return { text: `[MOCK TS] 분석 결과: ${prompt.substring(0, 50)}...` };
    }
};

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

console.log('Cron TypeScript 서비스가 시작되었습니다. (매시 정각 실행)', new Date().toISOString());
console.log(`대상 서버 주소: ${SERVER_URL}`);

function convertDateFormat(date: Date): string {
    const pad = (n: any) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`;
};

// 매시 정각마다 실행 (초 분 시 일 월 요일)
cron.schedule('0 * * * * *', async () => {
    try {
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
        const geminiRes = await gemini.generateText(prompt); 

        // 3. 파일 저장
        const fileName = `gemini_log_${convertDateFormat(new Date())}.txt`;
        fs.writeFileSync(fileName, geminiRes.text);
        
        console.log(`[${convertDateFormat(new Date())}] 저장 완료: ${fileName}`);
    } catch (error) {
        console.error('오류 발생:', error);
    }
});

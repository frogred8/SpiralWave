import cron from 'node-cron';
import * as fs from 'fs';

// 가상의 Gemini SDK 인터페이스
interface GeminiResponse {
    text: string;
}

const gemini = {
    generateText: async (prompt: string): Promise<GeminiResponse> => {
        return { text: `[MOCK TS] 분석 결과: ${prompt.substring(0, 50)}...` };
    }
};

console.log('Cron TypeScript 서비스가 시작되었습니다. (매시 정각 실행)', new Date().toISOString());


function convertDateFormat(date: Date): string {
    const pad = (n: any) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`;
};

// 매시 정각마다 실행 (초 분 시 일 월 요일)
cron.schedule('0 * * * * *', async () => {
    try {
        console.log(`[${convertDateFormat(new Date())}] 크론 작업 시작...`);
        
        // 1. 데이터 API 호출
        // const apiRes = await axios.get('https://your-api-endpoint.com/data');
        // const rawData = JSON.stringify(apiRes.data);
        const rawData = "테스트용 TypeScript 원본 데이터";

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

import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    watch: {
      // Windows 환경에서 파일 변경 감지가 누락되는 문제를 해결하기 위해 폴링 방식을 사용합니다.
      usePolling: true,
      interval: 100, // 0.1초마다 파일 변경 확인
    },
    hmr: {
      overlay: true, // 에러 발생 시 브라우저에 화면 표시
    },
  },
  resolve: {
    extensions: ['.ts', '.js'], // 확장자 우선순위 설정
  },
});
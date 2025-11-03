/**
 * 개발 환경에서만 로그를 출력하는 유틸리티
 */
const isDev = import.meta.env.DEV;

export const debugLog = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
    }
  }
};

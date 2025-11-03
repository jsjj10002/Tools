import { describe, it, expect } from 'vitest';
import { normalizeError, ErrorType, getErrorMessage, safeExecute, AppError } from '../errorHandler';

describe('errorHandler', () => {
  describe('normalizeError', () => {
    it('네트워크 에러를 정확히 감지해야 함', () => {
      const error = new Error('Failed to fetch');
      const result = normalizeError(error);
      
      expect(result.type).toBe(ErrorType.NETWORK);
      expect(result.message).toContain('네트워크');
    });

    it('파일 처리 에러를 정확히 감지해야 함', () => {
      const error = new Error('PDF file is corrupted');
      const result = normalizeError(error);
      
      expect(result.type).toBe(ErrorType.FILE_PROCESSING);
      expect(result.originalError).toBe(error);
    });

    it('문자열 에러를 처리해야 함', () => {
      const error = 'Something went wrong';
      const result = normalizeError(error);
      
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe(error);
    });

    it('알 수 없는 에러 타입을 처리해야 함', () => {
      const error = { code: 500 };
      const result = normalizeError(error);
      
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.details).toEqual({ error });
    });
  });

  describe('getErrorMessage', () => {
    it('네트워크 에러 메시지를 반환해야 함', () => {
      const error: AppError = {
        type: ErrorType.NETWORK,
        message: 'Network error'
      };
      
      expect(getErrorMessage(error)).toBe('네트워크 연결을 확인해주세요.');
    });

    it('파일 처리 에러 메시지를 반환해야 함', () => {
      const error: AppError = {
        type: ErrorType.FILE_PROCESSING,
        message: 'Invalid file format'
      };
      
      expect(getErrorMessage(error)).toBe('Invalid file format');
    });
  });

  describe('safeExecute', () => {
    it('성공한 함수의 결과를 반환해야 함', async () => {
      const fn = async () => 'success';
      const result = await safeExecute(fn);
      
      expect(result.data).toBe('success');
      expect(result.error).toBeUndefined();
    });

    it('실패한 함수의 에러를 캐치해야 함', async () => {
      const fn = async () => {
        throw new Error('Test error');
      };
      const result = await safeExecute(fn);
      
      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe(ErrorType.UNKNOWN);
    });
  });
});

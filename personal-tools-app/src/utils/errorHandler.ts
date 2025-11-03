/**
 * 에러 처리 유틸리티
 * 애플리케이션 전반에서 일관된 에러 처리를 위한 유틸리티 함수들
 */

export enum ErrorType {
  NETWORK = 'NETWORK',
  FILE_PROCESSING = 'FILE_PROCESSING',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  code?: string;
  details?: Record<string, any>;
}

/**
 * 에러를 AppError 형식으로 변환
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof Error) {
    // 네트워크 에러 감지
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        type: ErrorType.NETWORK,
        message: '네트워크 연결에 문제가 발생했습니다.',
        originalError: error,
        code: 'NETWORK_ERROR'
      };
    }

    // 파일 처리 에러 감지
    if (error.message.includes('File') || error.message.includes('PDF') || error.message.includes('image')) {
      return {
        type: ErrorType.FILE_PROCESSING,
        message: error.message || '파일 처리 중 오류가 발생했습니다.',
        originalError: error,
        code: 'FILE_PROCESSING_ERROR'
      };
    }

    return {
      type: ErrorType.UNKNOWN,
      message: error.message || '알 수 없는 오류가 발생했습니다.',
      originalError: error,
      code: 'UNKNOWN_ERROR'
    };
  }

  if (typeof error === 'string') {
    return {
      type: ErrorType.UNKNOWN,
      message: error
    };
  }

  return {
    type: ErrorType.UNKNOWN,
    message: '알 수 없는 오류가 발생했습니다.',
    details: { error }
  };
}

/**
 * 사용자 친화적인 에러 메시지 생성
 */
export function getErrorMessage(error: AppError): string {
  switch (error.type) {
    case ErrorType.NETWORK:
      return '네트워크 연결을 확인해주세요.';
    case ErrorType.FILE_PROCESSING:
      return error.message;
    case ErrorType.VALIDATION:
      return error.message;
    default:
      return error.message || '오류가 발생했습니다. 다시 시도해주세요.';
  }
}

/**
 * 에러 로깅 (개발 환경에서만)
 */
export function logError(error: AppError, context?: string): void {
  if (import.meta.env.DEV) {
    const prefix = context ? `[${context}]` : '[Error]';
    console.error(`${prefix}`, {
      type: error.type,
      message: error.message,
      code: error.code,
      details: error.details,
      originalError: error.originalError
    });
  }

  // 프로덕션에서는 에러 추적 서비스로 전송 가능
  // 예: Sentry, LogRocket 등
  if (import.meta.env.PROD) {
    // TODO: 에러 추적 서비스 연동
    // trackError(error, context);
  }
}

/**
 * 안전한 에러 처리 래퍼
 * 비동기 함수를 실행하고 에러를 캐치하여 정규화된 에러로 변환
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<{ data?: T; error?: AppError }> {
  try {
    const data = await fn();
    return { data };
  } catch (error) {
    const appError = normalizeError(error);
    logError(appError, context);
    return { error: appError };
  }
}

/**
 * 동기 함수용 안전한 실행 래퍼
 */
export function safeExecuteSync<T>(
  fn: () => T,
  context?: string
): { data?: T; error?: AppError } {
  try {
    const data = fn();
    return { data };
  } catch (error) {
    const appError = normalizeError(error);
    logError(appError, context);
    return { error: appError };
  }
}

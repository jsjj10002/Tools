import { Component, ErrorInfo, ReactNode } from 'react';
import { AppError, normalizeError, getErrorMessage, logError } from '@/utils/errorHandler';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: AppError | null;
}

/**
 * 에러 바운더리 컴포넌트
 * React 컴포넌트 트리에서 발생한 에러를 캐치하여 UI에 표시
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const appError = normalizeError(error);
    return {
      hasError: true,
      error: appError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const appError = normalizeError(error);
    logError(appError, 'ErrorBoundary');
    
    if (this.props.onError) {
      this.props.onError(appError, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={styles.errorBoundary}>
          <div className={styles.errorContent}>
            <h2 className={styles.errorTitle}>오류가 발생했습니다</h2>
            <p className={styles.errorMessage}>
              {this.state.error ? getErrorMessage(this.state.error) : '알 수 없는 오류가 발생했습니다.'}
            </p>
            {import.meta.env.DEV && this.state.error?.originalError && (
              <details className={styles.errorDetails}>
                <summary>개발자 정보</summary>
                <pre>{this.state.error.originalError?.stack}</pre>
              </details>
            )}
            <button 
              className={styles.resetButton}
              onClick={this.handleReset}
            >
              다시 시도
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

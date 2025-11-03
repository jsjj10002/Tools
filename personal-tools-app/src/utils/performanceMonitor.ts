/**
 * 성능 모니터링 유틸리티
 * 개발 환경에서 성능 메트릭을 수집하고 분석하는 도구
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

export interface ComponentRenderMetric {
  componentName: string;
  renderTime: number;
  propsChanged: boolean;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private componentMetrics: ComponentRenderMetric[] = [];
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = import.meta.env.DEV;
  }

  /**
   * 성능 메트릭 기록
   */
  recordMetric(name: string, value: number, unit: string = 'ms'): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now()
    };

    this.metrics.push(metric);

    // 개발 환경에서만 콘솔에 출력
    console.log(`[Performance] ${name}: ${value}${unit}`);
  }

  /**
   * 컴포넌트 렌더링 시간 기록
   */
  recordComponentRender(
    componentName: string,
    renderTime: number,
    propsChanged: boolean = false
  ): void {
    if (!this.isEnabled) return;

    const metric: ComponentRenderMetric = {
      componentName,
      renderTime,
      propsChanged,
      timestamp: Date.now()
    };

    this.componentMetrics.push(metric);

    if (renderTime > 16) { // 60fps 기준
      console.warn(
        `[Performance] ${componentName} 렌더링 시간이 길습니다: ${renderTime}ms`
      );
    }
  }

  /**
   * 메트릭 통계 가져오기
   */
  getMetrics(): {
    metrics: PerformanceMetric[];
    componentMetrics: ComponentRenderMetric[];
    summary: {
      averageRenderTime: number;
      slowComponents: ComponentRenderMetric[];
      totalMetrics: number;
    };
  } {
    const averageRenderTime =
      this.componentMetrics.length > 0
        ? this.componentMetrics.reduce(
            (sum, m) => sum + m.renderTime,
            0
          ) / this.componentMetrics.length
        : 0;

    const slowComponents = this.componentMetrics.filter(
      (m) => m.renderTime > 16
    );

    return {
      metrics: this.metrics,
      componentMetrics: this.componentMetrics,
      summary: {
        averageRenderTime,
        slowComponents,
        totalMetrics: this.metrics.length
      }
    };
  }

  /**
   * 메트릭 초기화
   */
  clearMetrics(): void {
    this.metrics = [];
    this.componentMetrics = [];
  }

  /**
   * 성능 리포트 출력
   */
  printReport(): void {
    if (!this.isEnabled) return;

    const { summary } = this.getMetrics();

    console.group('📊 성능 리포트');
    console.log(`총 메트릭 수: ${summary.totalMetrics}`);
    console.log(`평균 렌더링 시간: ${summary.averageRenderTime.toFixed(2)}ms`);
    console.log(`느린 컴포넌트: ${summary.slowComponents.length}개`);

    if (summary.slowComponents.length > 0) {
      console.group('느린 컴포넌트 목록');
      summary.slowComponents.forEach((comp) => {
        console.log(`${comp.componentName}: ${comp.renderTime}ms`);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }
}

// 싱글톤 인스턴스
export const performanceMonitor = new PerformanceMonitor();

/**
 * 컴포넌트 렌더링 시간 측정 훅
 */
export function usePerformanceMonitor(componentName: string) {
  const startTime = performance.now();

  return {
    endRender: (propsChanged: boolean = false) => {
      const renderTime = performance.now() - startTime;
      performanceMonitor.recordComponentRender(
        componentName,
        renderTime,
        propsChanged
      );
      return renderTime;
    }
  };
}

/**
 * 함수 실행 시간 측정
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T
): T {
  const startTime = performance.now();
  const result = fn();
  const endTime = performance.now();
  
  performanceMonitor.recordMetric(name, endTime - startTime);
  return result;
}

/**
 * 비동기 함수 실행 시간 측정
 */
export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  
  performanceMonitor.recordMetric(name, endTime - startTime);
  return result;
}

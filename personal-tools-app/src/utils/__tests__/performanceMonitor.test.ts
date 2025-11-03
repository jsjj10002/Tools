import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  performanceMonitor,
  usePerformanceMonitor,
  measurePerformance,
  measureAsyncPerformance
} from '../performanceMonitor';

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    performanceMonitor.clearMetrics();
  });

  describe('recordMetric', () => {
    it('메트릭을 기록해야 함', () => {
      performanceMonitor.recordMetric('test-metric', 100, 'ms');

      const { metrics } = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('test-metric');
      expect(metrics[0].value).toBe(100);
    });
  });

  describe('recordComponentRender', () => {
    it('컴포넌트 렌더링 시간을 기록해야 함', () => {
      performanceMonitor.recordComponentRender('TestComponent', 50, true);

      const { componentMetrics } = performanceMonitor.getMetrics();
      expect(componentMetrics).toHaveLength(1);
      expect(componentMetrics[0].componentName).toBe('TestComponent');
      expect(componentMetrics[0].renderTime).toBe(50);
      expect(componentMetrics[0].propsChanged).toBe(true);
    });

    it('느린 렌더링을 감지해야 함', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      performanceMonitor.recordComponentRender('SlowComponent', 20);

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('getMetrics', () => {
    it('올바른 통계를 반환해야 함', () => {
      performanceMonitor.recordComponentRender('Component1', 10);
      performanceMonitor.recordComponentRender('Component2', 20);
      performanceMonitor.recordComponentRender('Component3', 30);

      const { summary } = performanceMonitor.getMetrics();

      expect(summary.averageRenderTime).toBe(20);
      expect(summary.slowComponents.length).toBeGreaterThan(0);
      expect(summary.totalMetrics).toBe(0); // recordMetric으로 추가한 메트릭만
    });
  });

  describe('clearMetrics', () => {
    it('모든 메트릭을 초기화해야 함', () => {
      performanceMonitor.recordMetric('test', 100);
      performanceMonitor.recordComponentRender('Component', 50);

      performanceMonitor.clearMetrics();

      const { metrics, componentMetrics } = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(0);
      expect(componentMetrics).toHaveLength(0);
    });
  });
});

describe('measurePerformance', () => {
  it('동기 함수의 실행 시간을 측정해야 함', () => {
    const fn = () => {
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum += i;
      }
      return sum;
    };

    const result = measurePerformance('test-function', fn);

    expect(result).toBe(499500);
    const { metrics } = performanceMonitor.getMetrics();
    expect(metrics.length).toBeGreaterThan(0);
  });
});

describe('measureAsyncPerformance', () => {
  it('비동기 함수의 실행 시간을 측정해야 함', async () => {
    const fn = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 'result';
    };

    const result = await measureAsyncPerformance('async-function', fn);

    expect(result).toBe('result');
    const { metrics } = performanceMonitor.getMetrics();
    expect(metrics.length).toBeGreaterThan(0);
  });
});

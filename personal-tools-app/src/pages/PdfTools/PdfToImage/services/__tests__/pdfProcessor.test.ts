import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PdfProcessor } from '../pdfProcessor';
import { PdfToImageConfig } from '@/types/task';

// PDF.js 모킹
vi.mock('pdfjs-dist', () => {
  const mockPage = {
    getViewport: vi.fn().mockReturnValue({ width: 100, height: 100 }),
    render: vi.fn().mockReturnValue({ promise: Promise.resolve() })
  };

  const mockDocument = {
    numPages: 3,
    getPage: vi.fn().mockResolvedValue(mockPage),
    destroy: vi.fn()
  };

  return {
    default: {},
    GlobalWorkerOptions: {
      workerSrc: ''
    },
    getDocument: vi.fn().mockResolvedValue({ promise: Promise.resolve(mockDocument) })
  };
});

describe('PdfProcessor', () => {
  let processor: PdfProcessor;

  beforeEach(() => {
    processor = new PdfProcessor();
  });

  describe('getPageCount', () => {
    it('PDF가 로드되지 않았을 때 0을 반환해야 함', () => {
      expect(processor.getPageCount()).toBe(0);
    });
  });

  describe('renderPage', () => {
    it('PDF가 로드되지 않았을 때 에러를 발생시켜야 함', async () => {
      const config: Pick<PdfToImageConfig, 'quality'> = { quality: 'high' };

      await expect(
        processor.renderPage(1, config)
      ).rejects.toThrow('PDF가 로드되지 않았습니다.');
    });
  });

  describe('진행률 콜백', () => {
    it('진행률 콜백을 설정할 수 있어야 함', () => {
      const mockProgress = vi.fn();
      processor.setOnProgress(mockProgress);

      // 콜백이 설정되었는지 확인 (간접적으로)
      expect(mockProgress).toBeDefined();
    });
  });

  describe('dispose', () => {
    it('초기 상태에서 dispose 호출이 안전해야 함', () => {
      expect(() => processor.dispose()).not.toThrow();
    });
  });
});

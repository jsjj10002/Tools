import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageExporter } from '../imageExporter';
import { PdfPageInfo } from '../pdfProcessor';
import { PdfToImageConfig } from '@/types/task';

// file-saver 모킹
vi.mock('file-saver', () => ({
  saveAs: vi.fn()
}));

// JSZip 모킹
vi.mock('jszip', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      folder: vi.fn().mockReturnValue({
        file: vi.fn()
      }),
      generateAsync: vi.fn().mockResolvedValue(new Blob(['mock zip'], { type: 'application/zip' }))
    }))
  };
});

describe('ImageExporter', () => {
  let exporter: ImageExporter;
  let mockPages: PdfPageInfo[];

  beforeEach(() => {
    exporter = new ImageExporter();
    
    // 모킹된 페이지 데이터 생성
    const mockCanvas = document.createElement('canvas');
    mockCanvas.width = 100;
    mockCanvas.height = 100;
    
    mockPages = [
      {
        pageNumber: 1,
        width: 100,
        height: 100,
        canvas: mockCanvas,
        blob: new Blob(['image1'], { type: 'image/png' })
      },
      {
        pageNumber: 2,
        width: 100,
        height: 100,
        canvas: mockCanvas,
        blob: new Blob(['image2'], { type: 'image/png' })
      }
    ];
  });

  describe('exportPages', () => {
    it('폴더 생성 모드에서 ZIP 파일을 생성해야 함', async () => {
      const config: PdfToImageConfig = {
        startPage: 1,
        endPage: 2,
        quality: 'high',
        format: 'png',
        outputPath: '',
        createFolder: true
      };

      const result = await exporter.exportPages(mockPages, config, 'test.pdf');

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('test_img.zip');
    });

    it('개별 파일 모드에서 각 파일을 다운로드해야 함', async () => {
      const config: PdfToImageConfig = {
        startPage: 1,
        endPage: 2,
        quality: 'high',
        format: 'png',
        outputPath: '',
        createFolder: false
      };

      const { saveAs } = await import('file-saver');
      
      const result = await exporter.exportPages(mockPages, config, 'test.pdf');

      expect(result).toHaveLength(2);
      expect(saveAs).toHaveBeenCalledTimes(2);
    });
  });

  describe('exportSinglePage', () => {
    it('단일 페이지를 올바른 파일명으로 내보내야 함', async () => {
      const page = mockPages[0];
      const { saveAs } = await import('file-saver');

      const result = await exporter.exportSinglePage(page, 'png');

      expect(result).toBe('page_001.png');
      expect(saveAs).toHaveBeenCalledWith(page.blob, 'page_001.png');
    });

    it('블롭이 없는 페이지에서 에러를 발생시켜야 함', async () => {
      const pageWithoutBlob: PdfPageInfo = {
        ...mockPages[0],
        blob: undefined
      };

      await expect(
        exporter.exportSinglePage(pageWithoutBlob, 'png')
      ).rejects.toThrow('페이지 블롭이 없습니다.');
    });
  });

  describe('파일명 생성', () => {
    it('올바른 파일명 형식을 생성해야 함', async () => {
      const config: PdfToImageConfig = {
        startPage: 1,
        endPage: 2,
        quality: 'high',
        format: 'png',
        outputPath: '',
        createFolder: false
      };

      await exporter.exportPages(mockPages, config, 'document.pdf');
      const { saveAs } = await import('file-saver');
      
      expect(saveAs).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.stringMatching(/^document_page_\d{3}\.png$/)
      );
    });

    it('다양한 포맷을 지원해야 함', async () => {
      const formats: Array<'png' | 'jpg' | 'webp'> = ['png', 'jpg', 'webp'];

      for (const format of formats) {
        const result = await exporter.exportSinglePage(mockPages[0], format);
        expect(result).toContain(`.${format}`);
      }
    });
  });
});

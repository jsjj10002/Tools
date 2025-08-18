import * as pdfjsLib from 'pdfjs-dist';
import { PdfToImageConfig, TaskProgress } from '@/types/task';

// vite.config.ts에서 복사한 worker 파일 경로를 직접 지정
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface PdfPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  blob?: Blob;
}

export class PdfProcessor {
  private pdfDocument: pdfjsLib.PDFDocumentProxy | null = null;
  private onProgress?: (progress: TaskProgress) => void;
  
  constructor(onProgress?: (progress: TaskProgress) => void) {
    this.onProgress = onProgress;
  }

  // 진행률 콜백을 동적으로 설정하는 메서드 추가
  public setOnProgress(onProgress: (progress: TaskProgress) => void): void {
    this.onProgress = onProgress;
  }
  
  async loadPdf(file: File): Promise<void> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      this.pdfDocument = await pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: '/cmaps/',
        cMapPacked: true,
      }).promise;
    } catch (error) {
      throw new Error(`PDF 로딩 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }
  
  getPageCount(): number {
    return this.pdfDocument?.numPages || 0;
  }
  
  async renderPage(
    pageNumber: number, 
    config: Pick<PdfToImageConfig, 'quality'>
  ): Promise<PdfPageInfo> {
    if (!this.pdfDocument) {
      throw new Error('PDF가 로드되지 않았습니다.');
    }
    
    const page = await this.pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: this.getScaleForQuality(config.quality) });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Canvas context를 생성할 수 없습니다.');
    }    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    return {
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      canvas
    };
  }
  
  async convertPages(
    startPage: number,
    endPage: number,
    config: PdfToImageConfig,
    taskId: string
  ): Promise<PdfPageInfo[]> {
    const pages: PdfPageInfo[] = [];
    const totalPages = endPage - startPage + 1;
    
    // 작업 시작 알림
    this.onProgress?.({
      taskId,
      progress: 0,
      currentStep: '변환 시작...',
      message: '페이지 변환을 시작합니다'
    });
    
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      try {
        const pageInfo = await this.renderPage(pageNum, config);
        
        // 이미지 블롭 생성
        const blob = await this.canvasToBlob(pageInfo.canvas, config.format);
        pageInfo.blob = blob;
        
        pages.push(pageInfo);
        
        // 진행률 업데이트
        const progress = Math.round(((pageNum - startPage + 1) / totalPages) * 100);
        this.onProgress?.({
          taskId,
          progress,
          currentStep: `페이지 ${pageNum} 처리 중...`,
          message: `${pageNum - startPage + 1}/${totalPages} 페이지 완료`
        });
        
      } catch (error) {
        console.error(`페이지 ${pageNum} 처리 중 오류:`, error);
        throw new Error(`페이지 ${pageNum} 처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      }
    }
    
    // 변환 완료 알림
    this.onProgress?.({
      taskId,
      progress: 100,
      currentStep: '변환 완료',
      message: `총 ${totalPages}개 페이지 변환 완료`
    });
    
    return pages;
  }  
  private getScaleForQuality(quality: PdfToImageConfig['quality']): number {
    const scaleMap = {
      'medium': 1.5,   // 108 DPI  
      'high': 2.0,     // 144 DPI
      'ultra': 3.0     // 216 DPI
    };
    return scaleMap[quality];
  }
  
  private async canvasToBlob(
    canvas: HTMLCanvasElement, 
    format: PdfToImageConfig['format']
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const mimeType = this.getMimeType(format);
      const quality = format === 'jpg' ? 0.9 : undefined;
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas to Blob 변환 실패'));
        }
      }, mimeType, quality);
    });
  }
  
  private getMimeType(format: PdfToImageConfig['format']): string {
    const mimeMap = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'webp': 'image/webp'
    };
    return mimeMap[format];
  }
  
  async getPagePreview(pageNumber: number, width: number = 300): Promise<string> {
    if (!this.pdfDocument) {
      throw new Error('PDF가 로드되지 않았습니다');
    }

    const page = await this.pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 컨텍스트를 생성할 수 없습니다');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;
    return canvas.toDataURL();
  }

  async getThumbnail(pageNumber: number, width: number = 80): Promise<string> {
    if (!this.pdfDocument) {
      throw new Error('PDF가 로드되지 않았습니다');
    }

    const page = await this.pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 컨텍스트를 생성할 수 없습니다');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;
    return canvas.toDataURL();
  }
  
  dispose(): void {
    if (this.pdfDocument) {
      this.pdfDocument.destroy();
      this.pdfDocument = null;
    }
  }
}
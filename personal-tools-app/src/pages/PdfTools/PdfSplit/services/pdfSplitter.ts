import { PDFDocument } from 'pdf-lib';
import { useTaskStore } from '@/stores/taskStore';

interface SplitConfig {
  file: File;
  splitPoints: number[];
  outputDir: string;
  baseFileName: string;
  taskId: string;
}

class PdfSplitter {
  /**
   * PDF 파일의 총 페이지 수를 가져옵니다
   */
  async getPageCount(file: File): Promise<number> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      return pdfDoc.getPageCount();
    } catch (error) {
      console.error('PDF 페이지 수 확인 실패:', error);
      throw new Error('PDF 파일을 읽을 수 없습니다.');
    }
  }

  /**
   * PDF 파일을 지정된 분할 지점으로 분할합니다
   */
  async splitPdf(config: SplitConfig): Promise<void> {
    const { file, splitPoints, baseFileName, taskId } = config;
    const { updateTask } = useTaskStore.getState();

    try {
      // 진행률 업데이트
      updateTask(taskId, { status: 'processing', progress: 10 });

      const arrayBuffer = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(arrayBuffer);
      const totalPages = sourcePdf.getPageCount();

      // 분할 범위 계산
      const ranges = this.calculateRanges(splitPoints, totalPages);
      
      updateTask(taskId, { progress: 20 });

      const splitFiles: { name: string; data: Uint8Array }[] = [];

      // 각 범위별로 PDF 생성
      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        const newPdf = await PDFDocument.create();

        // 페이지 복사
        for (let pageNum = range.start; pageNum <= range.end; pageNum++) {
          const [copiedPage] = await newPdf.copyPages(sourcePdf, [pageNum - 1]);
          newPdf.addPage(copiedPage);
        }

        const pdfBytes = await newPdf.save();
        const fileName = `${baseFileName}_part${i + 1}.pdf`;
        
        splitFiles.push({
          name: fileName,
          data: pdfBytes
        });

        // 진행률 업데이트
        const progress = 20 + ((i + 1) / ranges.length) * 70;
        updateTask(taskId, { progress });
      }

      // 파일 다운로드
      updateTask(taskId, { progress: 90 });
      await this.downloadFiles(splitFiles);

      updateTask(taskId, { 
        status: 'completed', 
        progress: 100,
        endTime: Date.now()
      });

    } catch (error) {
      console.error('PDF 분할 실패:', error);
      updateTask(taskId, { 
        status: 'error', 
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      });
      throw error;
    }
  }

  /**
   * 분할 지점을 기반으로 페이지 범위를 계산합니다
   */
  private calculateRanges(splitPoints: number[], totalPages: number): Array<{ start: number; end: number }> {
    if (splitPoints.length === 0) {
      return [{ start: 1, end: totalPages }];
    }

    const ranges: Array<{ start: number; end: number }> = [];
    // 분할 지점을 정렬하고 중복 제거
    const sortedSplitPoints = [...new Set(splitPoints)].sort((a, b) => a - b);

    // 첫 번째 파일: 1페이지부터 첫 번째 분할 지점 전까지 (첫 번째 분할 지점이 1보다 클 때만)
    if (sortedSplitPoints[0] > 1) {
      ranges.push({ 
        start: 1, 
        end: sortedSplitPoints[0] - 1 
      });
    }

    // 나머지 파일들: 각 분할 지점부터 다음 분할 지점 전까지 (또는 마지막 페이지까지)
    for (let i = 0; i < sortedSplitPoints.length; i++) {
      const start = sortedSplitPoints[i];
      const end = (i < sortedSplitPoints.length - 1) ? sortedSplitPoints[i + 1] - 1 : totalPages;
      
      if (start <= end && start <= totalPages) {
        ranges.push({ 
          start, 
          end: Math.min(end, totalPages) 
        });
      }
    }

    return ranges;
  }

  /**
   * 생성된 PDF 파일들을 다운로드합니다
   */
  private async downloadFiles(files: Array<{ name: string; data: Uint8Array }>): Promise<void> {
    for (const file of files) {
      const blob = new Blob([file.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      // 다운로드 간격 조정 (브라우저 제한 방지)
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * PDF 페이지를 이미지로 렌더링합니다 (미리보기용)
   */
  async renderPageAsImage(file: File, pageNumber: number): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // PDF.js를 사용하여 페이지 렌더링
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error('PDF.js 라이브러리가 로드되지 않았습니다.');
      }

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(pageNumber);
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      return canvas.toDataURL();
    } catch (error) {
      console.error('페이지 렌더링 실패:', error);
      throw new Error('페이지를 렌더링할 수 없습니다.');
    }
  }
}

export const pdfSplitter = new PdfSplitter(); 
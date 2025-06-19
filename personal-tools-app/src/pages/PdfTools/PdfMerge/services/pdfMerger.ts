// 먼저 PDF 결합을 위한 서비스 클래스를 만들겠습니다
// personal-tools-app/src/pages/PdfTools/PdfMerge/services/pdfMerger.ts

import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { TaskProgress, PdfMergeConfig } from '@/types/task';

export interface MergeablePdf {
  file: File;
  id: string;
  totalPages: number;
  document?: PDFDocument;
  thumbnailUrl?: string;
  isLoaded: boolean;
}

export class PdfMerger {
  private onProgress?: (progress: TaskProgress) => void;
  
  constructor(onProgress?: (progress: TaskProgress) => void) {
    this.onProgress = onProgress;
  }
  
  async loadPdf(file: File): Promise<MergeablePdf> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const document = await PDFDocument.load(arrayBuffer);
      
      return {
        file,
        id: `${file.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        totalPages: document.getPageCount(),
        document,
        isLoaded: true
      };
    } catch (error) {
      throw new Error(`PDF 로딩 실패: ${file.name} - ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }
  
  async mergePdfs(
    pdfs: MergeablePdf[],
    config: PdfMergeConfig,
    taskId: string
  ): Promise<Uint8Array[]> {
    if (config.createSeparateFiles && config.separatorIndices.length > 0) {
      return this.createSeparateFiles(pdfs, config, taskId);
    } else {
      return [await this.createSingleFile(pdfs, config, taskId)];
    }
  }
  
  private async createSingleFile(
    pdfs: MergeablePdf[],
    _config: PdfMergeConfig,
    taskId: string
  ): Promise<Uint8Array> {
    const mergedPdf = await PDFDocument.create();
    let processedPages = 0;
    const totalPages = pdfs.reduce((sum, pdf) => sum + pdf.totalPages, 0);
    
    this.onProgress?.({
      taskId,
      progress: 0,
      currentStep: '페이지 결합 중...',
      message: 'PDF 결합을 시작합니다'
    });
    
    for (let i = 0; i < pdfs.length; i++) {
      const pdf = pdfs[i];
      if (!pdf.document) continue;
      
      const pageIndices = Array.from({ length: pdf.totalPages }, (_, i) => i);
      const copiedPages = await mergedPdf.copyPages(pdf.document, pageIndices);
      
      copiedPages.forEach(page => mergedPdf.addPage(page));
      
      processedPages += pdf.totalPages;
      const progress = Math.round((processedPages / totalPages) * 100);
      
      this.onProgress?.({
        taskId,
        progress,
        currentStep: `${pdf.file.name} 처리 중...`,
        message: `${i + 1}/${pdfs.length} PDF 처리 완료`
      });
    }
    
    this.onProgress?.({
      taskId,
      progress: 100,
      currentStep: '결합 완료',
      message: `총 ${pdfs.length}개 PDF, ${totalPages}페이지 결합 완료`
    });
    
    return await mergedPdf.save();
  }
  
  private async createSeparateFiles(
    pdfs: MergeablePdf[],
    config: PdfMergeConfig,
    taskId: string
  ): Promise<Uint8Array[]> {
    const results: Uint8Array[] = [];
    const groups = this.groupPdfsBySeparators(pdfs, config.separatorIndices);
    
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const group = groups[groupIndex];
      const groupPdf = await PDFDocument.create();
      
      for (const pdf of group) {
        if (!pdf.document) continue;
        
        const pageIndices = Array.from({ length: pdf.totalPages }, (_, i) => i);
        const copiedPages = await groupPdf.copyPages(pdf.document, pageIndices);
        copiedPages.forEach(page => groupPdf.addPage(page));
      }
      
      const progress = Math.round(((groupIndex + 1) / groups.length) * 100);
      this.onProgress?.({
        taskId,
        progress,
        currentStep: `그룹 ${groupIndex + 1} 생성 중...`,
        message: `${groupIndex + 1}/${groups.length} 그룹 처리 완료`
      });
      
      results.push(await groupPdf.save());
    }
    
    return results;
  }
  
  private groupPdfsBySeparators(
    pdfs: MergeablePdf[],
    separatorIndices: number[]
  ): MergeablePdf[][] {
    if (separatorIndices.length === 0) {
      return [pdfs]; // 구분선이 없으면 모든 PDF를 하나의 그룹으로
    }

    const groups: MergeablePdf[][] = [];
    let startIndex = 0;
    
    // 구분선 인덱스를 정렬
    const sortedSeparators = [...separatorIndices].sort((a, b) => a - b);
    
    // 각 구분선까지의 그룹 생성
    for (const separatorIndex of sortedSeparators) {
      if (startIndex <= separatorIndex) {
        const group = pdfs.slice(startIndex, separatorIndex + 1);
        if (group.length > 0) {
          groups.push(group);
        }
        startIndex = separatorIndex + 1;
      }
    }
    
    // 마지막 구분선 이후 남은 PDF들
    if (startIndex < pdfs.length) {
      const lastGroup = pdfs.slice(startIndex);
      if (lastGroup.length > 0) {
        groups.push(lastGroup);
      }
    }
    
    console.log('PDF 그룹 분할 결과:', {
      totalPdfs: pdfs.length,
      separatorIndices: sortedSeparators,
      groups: groups.map((group, index) => ({
        groupIndex: index + 1,
        pdfCount: group.length,
        pdfNames: group.map(pdf => pdf.file.name)
      }))
    });
    
    return groups.filter(group => group.length > 0);
  }
  
  async downloadFiles(files: Uint8Array[], config: PdfMergeConfig): Promise<void> {
    if (files.length === 1) {
      // 단일 파일
      const blob = new Blob([files[0]], { type: 'application/pdf' });
      saveAs(blob, `${config.outputFileName}.pdf`);
      console.log(`단일 파일 다운로드: ${config.outputFileName}.pdf`);
    } else {
      // 여러 파일 (구분선으로 분할된 경우)
      console.log(`${files.length}개 분할 파일 다운로드 시작`);
      
      for (let i = 0; i < files.length; i++) {
        const blob = new Blob([files[i]], { type: 'application/pdf' });
        const fileName = `${config.outputFileName}_그룹${i + 1}.pdf`;
        
        // 각 파일을 약간의 지연을 두고 다운로드 (브라우저 제한 회피)
        setTimeout(() => {
          saveAs(blob, fileName);
          console.log(`분할 파일 ${i + 1}/${files.length} 다운로드: ${fileName}`);
        }, i * 100);
      }
      
      console.log(`총 ${files.length}개 분할 파일 다운로드 완료 예약`);
    }
  }
}
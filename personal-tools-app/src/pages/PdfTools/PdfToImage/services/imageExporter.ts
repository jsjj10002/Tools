import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { PdfPageInfo } from './pdfProcessor';
import { PdfToImageConfig } from '@/types/task';

export class ImageExporter {
  
  async exportPages(
    pages: PdfPageInfo[],
    config: PdfToImageConfig,
    originalFilename: string
  ): Promise<string[]> {
    const filePaths: string[] = [];
    
    if (config.createFolder) {
      // ZIP 파일로 묶어서 다운로드
      const zipPath = await this.exportAsZip(pages, config, originalFilename);
      filePaths.push(zipPath);
    } else {
      // 개별 파일로 다운로드
      for (const page of pages) {
        if (page.blob) {
          const filename = this.generateFilename(originalFilename, page.pageNumber, config.format);
          saveAs(page.blob, filename);
          filePaths.push(filename);
        }
      }
    }
    
    return filePaths;
  }
  
  private async exportAsZip(
    pages: PdfPageInfo[],
    config: PdfToImageConfig,
    originalFilename: string
  ): Promise<string> {
    const zip = new JSZip();
    const folderName = this.getFolderName(originalFilename);
    const folder = zip.folder(folderName);
    
    if (!folder) {
      throw new Error('ZIP 폴더 생성 실패');
    }
    
    // 각 페이지를 ZIP에 추가
    for (const page of pages) {
      if (page.blob) {
        const filename = this.generatePageFilename(page.pageNumber, config.format);
        folder.file(filename, page.blob);
      }
    }
    
    // ZIP 파일 생성 및 다운로드
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    const zipFilename = `${folderName}.zip`;
    saveAs(zipBlob, zipFilename);
    
    return zipFilename;
  }  
  private getFolderName(originalFilename: string): string {
    // 확장자 제거 후 _img 추가
    const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}_img`;
  }
  
  private generateFilename(
    originalFilename: string,
    pageNumber: number,
    format: PdfToImageConfig['format']
  ): string {
    const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '');
    const paddedPageNumber = pageNumber.toString().padStart(3, '0');
    return `${nameWithoutExt}_page_${paddedPageNumber}.${format}`;
  }
  
  private generatePageFilename(
    pageNumber: number,
    format: PdfToImageConfig['format']
  ): string {
    const paddedPageNumber = pageNumber.toString().padStart(3, '0');
    return `page_${paddedPageNumber}.${format}`;
  }
  
  // 단일 페이지 미리보기용 내보내기
  async exportSinglePage(
    page: PdfPageInfo,
    format: PdfToImageConfig['format']
  ): Promise<string> {
    if (!page.blob) {
      throw new Error('페이지 블롭이 없습니다.');
    }
    
    const filename = this.generatePageFilename(page.pageNumber, format);
    saveAs(page.blob, filename);
    return filename;
  }
  
  // 메모리 정리용 헬퍼
  cleanupPages(pages: PdfPageInfo[]): void {
    pages.forEach(page => {
      if (page.blob) {
        URL.revokeObjectURL(URL.createObjectURL(page.blob));
      }
    });
  }
}

export async function exportImages(
  pages: PdfPageInfo[],
  format: 'png' | 'jpg' | 'webp',
  folderName: string
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(folderName);
  
  if (!folder) {
    throw new Error('폴더 생성 실패');
  }

  // 각 페이지를 ZIP 파일에 추가
  for (const page of pages) {
    if (page.blob) {
      const fileName = `page_${page.pageNumber.toString().padStart(3, '0')}.${format}`;
      folder.file(fileName, page.blob);
    }
  }

  // ZIP 파일 생성 및 다운로드
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${folderName}.zip`);
}
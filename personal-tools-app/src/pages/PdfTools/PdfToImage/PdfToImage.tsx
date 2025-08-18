import { useState, useRef } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { PdfToImageConfig } from '@/types/task';
import { PdfProcessor } from './services/pdfProcessor';
import { exportImages } from './services/imageExporter';
import PdfUploader from './components/PdfUploader';
import PageRangeSelector from './components/PageRangeSelector';
import QualitySelector from './components/QualitySelector';
import PagePreview from './components/PagePreview';
import styles from './PdfToImage.module.css';

interface ProcessedPdf {
  file: File;
  processor: PdfProcessor;
  totalPages: number;
  config: PdfToImageConfig;
}

export default function PdfToImage() {
  const { addTask, updateTask, updateTaskProgress } = useTaskStore();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processedPdfs, setProcessedPdfs] = useState<ProcessedPdf[]>([]);
  const [currentPdfIndex, setCurrentPdfIndex] = useState(0);
  const [globalConfig, setGlobalConfig] = useState<Omit<PdfToImageConfig, 'startPage' | 'endPage' | 'outputPath' | 'createFolder'>>({
    quality: 'high',
    format: 'png'
  });
  const [previewPage, setPreviewPage] = useState<number | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesUpload = async (files: File[]) => {
    const newFiles = [...uploadedFiles];
    const newProcessed: ProcessedPdf[] = [...processedPdfs];

    for (const file of files) {
      // 중복 파일 체크
      if (newFiles.some(f => f.name === file.name && f.size === file.size)) {
        continue;
      }

      try {
        const processor = new PdfProcessor();
        await processor.loadPdf(file);
        const totalPages = processor.getPageCount();
        
        const config: PdfToImageConfig = {
          ...globalConfig,
          startPage: 1,
          endPage: totalPages,
          outputPath: '',
          createFolder: true
        };
        
        newFiles.push(file);
        newProcessed.push({
          file,
          processor,
          totalPages,
          config
        });
      } catch (error) {
        console.error(`PDF 로딩 실패: ${file.name}`, error);
        // 사용자에게 오류 알림 추가 가능
      }
    }
    
    setUploadedFiles(newFiles);
    setProcessedPdfs(newProcessed);
    if (newFiles.length > 0 && uploadedFiles.length === 0) {
      setCurrentPdfIndex(0);
    }
  };

  const handleAddMoreFiles = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (index: number) => {
    const newUploaded = [...uploadedFiles];
    const newProcessed = [...processedPdfs];
    
    // processor 정리
    if (newProcessed[index]) {
      newProcessed[index].processor.dispose();
    }
    
    newUploaded.splice(index, 1);
    newProcessed.splice(index, 1);
    
    setUploadedFiles(newUploaded);
    setProcessedPdfs(newProcessed);
    
    // 현재 인덱스 조정
    if (currentPdfIndex >= newProcessed.length) {
      setCurrentPdfIndex(Math.max(0, newProcessed.length - 1));
    }
  };

  const updateCurrentPdfConfig = (updates: Partial<PdfToImageConfig>) => {
    if (processedPdfs[currentPdfIndex]) {
      const newProcessed = [...processedPdfs];
      newProcessed[currentPdfIndex].config = {
        ...newProcessed[currentPdfIndex].config,
        ...updates
      };
      setProcessedPdfs(newProcessed);
    }
  };

  const handleRangeChange = (start: number, end: number) => {
    updateCurrentPdfConfig({ startPage: start, endPage: end });
  };

  const handleQualityChange = (quality: 'medium' | 'high' | 'ultra') => {
    setGlobalConfig(prev => ({ ...prev, quality }));
    // 모든 PDF에 적용
    setProcessedPdfs(prev => prev.map(pdf => ({
      ...pdf,
      config: { ...pdf.config, quality }
    })));
  };

  const handleFormatChange = (format: 'png' | 'jpg' | 'webp') => {
    setGlobalConfig(prev => ({ ...prev, format }));
    // 모든 PDF에 적용
    setProcessedPdfs(prev => prev.map(pdf => ({
      ...pdf,
      config: { ...pdf.config, format }
    })));
  };

  const handlePreviewPage = async (pageNumber: number) => {
    if (processedPdfs[currentPdfIndex]) {
      try {
        setPreviewPage(pageNumber);
        const dataUrl = await processedPdfs[currentPdfIndex].processor.getPagePreview(pageNumber, 300);
        setPreviewDataUrl(dataUrl);
      } catch (error) {
        console.error('페이지 미리보기 실패:', error);
      }
    }
  };

  const handleStartConversion = async () => {
    if (processedPdfs.length === 0) return;

    setIsProcessing(true);

    for (let i = 0; i < processedPdfs.length; i++) {
      const { file, processor, config } = processedPdfs[i];

      const taskId = addTask({
        type: 'pdf-to-image',
        filename: file.name,
        totalFiles: processedPdfs.length,
        currentFile: i + 1,
        status: 'pending',
        progress: 0,
        config,
      });

      try {
        // 기존 processor에 진행률 콜백 설정
        processor.setOnProgress((progress) => {
          updateTaskProgress(progress);
        });

        // 페이지 변환
        const pages = await processor.convertPages(
          config.startPage,
          config.endPage,
          config,
          taskId
        );

        // 이미지 내보내기
        const folderName = file.name.replace(/\.pdf$/i, '_img');
        await exportImages(pages, config.format, folderName);

        // 태스크 상태 업데이트 (진행률 콜백이 100%에서 'completed'로 처리)
        // 여기서는 최종 결과 메시지만 업데이트
        updateTask(taskId, {
          result: `${folderName} 폴더에 ${pages.length}개 이미지 저장됨`,
        });

      } catch (error) {
        console.error(`변환 실패: ${file.name}`, error);
        updateTask(taskId, {
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : '알 수 없는 오류',
          endTime: Date.now(),
        });
      }
    }

    // 모든 작업 완료 후 정리
    processedPdfs.forEach(p => p.processor.dispose());
    setUploadedFiles([]);
    setProcessedPdfs([]);
    setCurrentPdfIndex(0);
    setIsProcessing(false);
  };

  const currentPdf = processedPdfs[currentPdfIndex];
  const hasFiles = processedPdfs.length > 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📄➡️🖼️ PDF → 이미지 변환</h1>
        <p>PDF 파일을 고품질 이미지로 변환합니다. 여러 파일을 동시에 처리할 수 있습니다.</p>
      </div>

      {/* 파일 업로드 */}
      <div className={styles.uploadSection}>
        <PdfUploader 
          onFilesUpload={handleFilesUpload}
          disabled={isProcessing}
        />
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) {
              handleFilesUpload(Array.from(e.target.files));
            }
            // 입력 값 초기화하여 동일한 파일 다시 선택 가능하도록
            if(e.target) e.target.value = '';
          }}
        />
      </div>

      {hasFiles && (
        <>
          {/* 업로드된 파일 목록 */}
          <div className={styles.filesSection}>
            <div className={styles.sectionHeader}>
              <h2>📁 업로드된 파일 ({uploadedFiles.length}개)</h2>
              <button className={styles.addMoreBtn} onClick={handleAddMoreFiles}>
                + 파일 추가
              </button>
            </div>
            
            <div className={styles.filesList}>
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className={`${styles.fileItem} ${index === currentPdfIndex ? styles.selected : ''}`}
                  onClick={() => setCurrentPdfIndex(index)}
                >
                  <div className={styles.fileInfo}>
                    <div className={styles.fileName}>{file.name}</div>
                    <div className={styles.fileDetails}>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                      {processedPdfs[index] && (
                        <span> • {processedPdfs[index].totalPages}페이지</span>
                      )}
                    </div>
                  </div>
                  <button
                    className={styles.removeBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 현재 선택된 PDF 설정 */}
          {currentPdf && (
            <div className={styles.configSection}>
              <h2>⚙️ {currentPdf.file.name} 설정</h2>
              
              <PageRangeSelector
                totalPages={currentPdf.totalPages}
                startPage={currentPdf.config.startPage}
                endPage={currentPdf.config.endPage}
                processor={currentPdf.processor}
                onRangeChange={handleRangeChange}
                onPreviewPage={handlePreviewPage}
              />
            </div>
          )}

          {/* 전역 품질 설정 */}
          <div className={styles.qualitySection}>
            <h2>🎨 품질 및 형식 설정 (모든 파일 적용)</h2>
            <QualitySelector
              quality={globalConfig.quality}
              format={globalConfig.format}
              onQualityChange={handleQualityChange}
              onFormatChange={handleFormatChange}
            />
          </div>

          {/* 페이지 미리보기 */}
          {previewPage && previewDataUrl && (
            <div className={styles.previewSection}>
              <PagePreview
                pageNumber={previewPage}
                dataUrl={previewDataUrl}
                onClose={() => {
                  setPreviewPage(null);
                  setPreviewDataUrl(null);
                }}
              />
            </div>
          )}

          {/* 변환 시작 */}
          <div className={styles.actionSection}>
            <div className={styles.summary}>
              <h3>📋 변환 요약</h3>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <span>파일 수:</span>
                  <span>{processedPdfs.length}개</span>
                </div>
                <div className={styles.summaryItem}>
                  <span>총 페이지:</span>
                  <span>
                    {processedPdfs.reduce((sum, pdf) => 
                      sum + (pdf.config.endPage - pdf.config.startPage + 1), 0
                    )}페이지
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span>품질:</span>
                  <span>
                    {globalConfig.quality === 'ultra' ? '최고품질' :
                     globalConfig.quality === 'high' ? '고품질' : '중품질'}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span>형식:</span>
                  <span>{globalConfig.format.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <button
              className={styles.startBtn}
              onClick={handleStartConversion}
              disabled={isProcessing}
            >
              {isProcessing ? '변환 중...' : '🚀 변환 시작'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
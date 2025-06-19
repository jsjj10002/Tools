import { useState, useCallback } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { TaskType, TaskStatus } from '@/types/task';
import { pdfSplitter } from './services/pdfSplitter';
import PdfUploader from './components/PdfUploader';
import PagePreview from './components/PagePreview';
import SplitPointSelector from './components/SplitPointSelector';
import OutputSettings from './components/OutputSettings';
import styles from './PdfSplit.module.css';

interface PdfFile {
  id: string;
  file: File;
  totalPages: number;
  splitPoints: number[];
  outputDir?: string;
}

export default function PdfSplit() {
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null);
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [outputDir, setOutputDir] = useState<string>('');
  const [baseFileName, setBaseFileName] = useState<string>('');
  const { addTask } = useTaskStore();

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const totalPages = await pdfSplitter.getPageCount(file);
      const newPdfFile: PdfFile = {
        id: crypto.randomUUID(),
        file,
        totalPages,
        splitPoints: [],
        outputDir: ''
      };
      
      setPdfFile(newPdfFile);
      setBaseFileName(file.name.replace('.pdf', ''));
      setSelectedPage(1);
    } catch (error) {
      console.error('PDF 파일 로드 실패:', error);
      alert('PDF 파일을 읽는 중 오류가 발생했습니다.');
    }
  }, []);

  const handleSplitPointAdd = useCallback((pageNumber: number) => {
    if (!pdfFile) return;
    
    const newSplitPoints = [...pdfFile.splitPoints, pageNumber].sort((a, b) => a - b);
    setPdfFile({
      ...pdfFile,
      splitPoints: newSplitPoints
    });
  }, [pdfFile]);

  const handleSplitPointRemove = useCallback((pageNumber: number) => {
    if (!pdfFile) return;
    
    const newSplitPoints = pdfFile.splitPoints.filter(point => point !== pageNumber);
    setPdfFile({
      ...pdfFile,
      splitPoints: newSplitPoints
    });
  }, [pdfFile]);

  const handleStartSplit = useCallback(async () => {
    if (!pdfFile) return;

    console.log('[PdfSplit] 작업 생성 시작');
    
    const taskId = addTask({
      type: 'pdf-split' as TaskType,
      status: 'pending' as TaskStatus,
      filename: pdfFile.file.name,
      progress: 0
    });

    console.log('[PdfSplit] 생성된 작업 ID:', taskId);

    try {
      await pdfSplitter.splitPdf({
        file: pdfFile.file,
        splitPoints: pdfFile.splitPoints,
        outputDir,
        baseFileName,
        taskId
      });
    } catch (error) {
      console.error('PDF 분할 실패:', error);
    }
  }, [pdfFile, outputDir, baseFileName, addTask]);

  const getSplitPreview = useCallback(() => {
    if (!pdfFile || pdfFile.splitPoints.length === 0) {
      return [`전체 파일 (1-${pdfFile?.totalPages || 0}페이지)`];
    }

    const ranges: string[] = [];
    // 분할 지점을 정렬하고 중복 제거
    const sortedSplitPoints = [...new Set(pdfFile.splitPoints)].sort((a, b) => a - b);
    
    // 첫 번째 파일: 1페이지부터 첫 번째 분할 지점 전까지
    if (sortedSplitPoints[0] > 1) {
      ranges.push(`파일 1 (1-${sortedSplitPoints[0] - 1}페이지)`);
    }
    
    // 나머지 파일들: 각 분할 지점부터 다음 분할 지점 전까지
    for (let i = 0; i < sortedSplitPoints.length; i++) {
      const start = sortedSplitPoints[i];
      const end = (i < sortedSplitPoints.length - 1) ? sortedSplitPoints[i + 1] - 1 : pdfFile.totalPages;
      const fileIndex = sortedSplitPoints[0] > 1 ? i + 2 : i + 1;
      ranges.push(`파일 ${fileIndex} (${start}-${end}페이지)`);
    }
    
    return ranges;
  }, [pdfFile]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📄✂️ PDF 분할</h1>
        <p>PDF 파일을 원하는 페이지 구간으로 분할하세요</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>📁 파일 업로드</h2>
          </div>
          <PdfUploader onFileUpload={handleFileUpload} />
        </div>

        {pdfFile && (
          <>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>📖 페이지 미리보기</h2>
                <div className={styles.pageInfo}>
                  총 {pdfFile.totalPages}페이지 | 현재 {selectedPage}페이지
                </div>
              </div>
              <PagePreview
                file={pdfFile.file}
                currentPage={selectedPage}
                totalPages={pdfFile.totalPages}
                onPageChange={setSelectedPage}
                splitPoints={pdfFile.splitPoints}
              />
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>✂️ 분할 지점 설정</h2>
                <div className={styles.splitInfo}>
                  {pdfFile.splitPoints.length}개 분할 지점 → {pdfFile.splitPoints.length + 1}개 파일 생성
                </div>
              </div>
              <SplitPointSelector
                totalPages={pdfFile.totalPages}
                splitPoints={pdfFile.splitPoints}
                onSplitPointAdd={handleSplitPointAdd}
                onSplitPointRemove={handleSplitPointRemove}
                currentPage={selectedPage}
              />
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>📋 분할 미리보기</h2>
              </div>
              <div className={styles.previewList}>
                {getSplitPreview().map((range, index) => (
                  <div key={index} className={styles.previewItem}>
                    <span className={styles.fileIcon}>📄</span>
                    <span className={styles.fileName}>
                      {baseFileName}_part{index + 1}.pdf
                    </span>
                    <span className={styles.pageRange}>{range}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>⚙️ 출력 설정</h2>
              </div>
              <OutputSettings
                outputDir={outputDir}
                onOutputDirChange={setOutputDir}
                baseFileName={baseFileName}
                onBaseFileNameChange={setBaseFileName}
              />
            </div>

            <div className={styles.actionSection}>
              <button
                className={styles.splitButton}
                onClick={handleStartSplit}
                disabled={!pdfFile}
              >
                🚀 PDF 분할 시작
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 
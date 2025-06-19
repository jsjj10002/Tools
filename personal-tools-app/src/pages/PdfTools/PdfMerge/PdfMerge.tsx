import { useState, useCallback } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { PdfMerger, MergeablePdf } from './services/pdfMerger';
import PdfMergeUploader from './components/PdfMergeUploader';
import PdfList from './components/PdfList';
import { PdfMergeConfig } from '@/types/task';
import styles from './PdfMerge.module.css';

export default function PdfMerge() {
  const [pdfs, setPdfs] = useState<MergeablePdf[]>([]);
  const [separatorIndices, setSeparatorIndices] = useState<number[]>([]);
  const [outputFileName, setOutputFileName] = useState('merged-document');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { addTask, updateTaskProgress } = useTaskStore();

  const handleFilesUpload = useCallback(async (files: File[]) => {
    const merger = new PdfMerger();
    
    for (const file of files) {
      try {
        const mergeablePdf = await merger.loadPdf(file);
        setPdfs(prev => [...prev, mergeablePdf]);
      } catch (error) {
        console.error('PDF 로딩 실패:', error);
        alert(`PDF 로딩 실패: ${file.name}`);
      }
    }
  }, []);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setPdfs(prev => {
      const newPdfs = [...prev];
      const [movedItem] = newPdfs.splice(fromIndex, 1);
      newPdfs.splice(toIndex, 0, movedItem);
      
      // 구분선 인덱스도 조정
      setSeparatorIndices(prevSeparators => {
        const newSeparators = prevSeparators.map(index => {
          if (index === fromIndex) return toIndex;
          if (fromIndex < toIndex && index > fromIndex && index <= toIndex) return index - 1;
          if (fromIndex > toIndex && index >= toIndex && index < fromIndex) return index + 1;
          return index;
        });
        return newSeparators;
      });
      
      return newPdfs;
    });
  }, []);

  const handleRemove = useCallback((id: string) => {
    setPdfs(prev => {
      const index = prev.findIndex(pdf => pdf.id === id);
      if (index === -1) return prev;
      
      // 구분선 인덱스 조정 (제거된 항목 뒤의 인덱스들을 하나씩 앞으로)
      setSeparatorIndices(prevSeparators => 
        prevSeparators
          .filter(separatorIndex => separatorIndex !== index)
          .map(separatorIndex => separatorIndex > index ? separatorIndex - 1 : separatorIndex)
      );
      
      return prev.filter(pdf => pdf.id !== id);
    });
  }, []);

  const handleAddSeparator = useCallback((index: number) => {
    setSeparatorIndices(prev => [...prev, index].sort((a, b) => a - b));
  }, []);

  const handleRemoveSeparator = useCallback((index: number) => {
    setSeparatorIndices(prev => prev.filter(i => i !== index));
  }, []);

  const handleMerge = useCallback(async () => {
    if (pdfs.length === 0) {
      alert('결합할 PDF가 없습니다.');
      return;
    }

    setIsProcessing(true);
    
    const config: PdfMergeConfig = {
      outputFileName,
      outputPath: '',
      createSeparateFiles: separatorIndices.length > 0,
      separatorIndices: [...separatorIndices].sort((a, b) => a - b)
    };

    const taskId = addTask({
      type: 'pdf-merge',
      status: 'processing',
      filename: `${outputFileName}.pdf`,
      progress: 0,
      config
    });

    try {
      const merger = new PdfMerger((progress) => {
        updateTaskProgress(progress);
      });

      const results = await merger.mergePdfs(pdfs, config, taskId);
      await merger.downloadFiles(results, config);

      updateTaskProgress({
        taskId,
        progress: 100,
        currentStep: '다운로드 완료',
        message: `${config.createSeparateFiles ? results.length + '개 파일' : '1개 파일'} 생성 완료`
      });

      // 완료 후 상태 초기화
      setPdfs([]);
      setSeparatorIndices([]);
      setOutputFileName('merged-document');
      
    } catch (error) {
      console.error('PDF 결합 실패:', error);
      updateTaskProgress({
        taskId,
        progress: -1,
        currentStep: '결합 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [pdfs, separatorIndices, outputFileName, addTask, updateTaskProgress]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📄🔗 PDF 결합</h1>
        <p>여러 PDF를 하나로 결합하거나 구분선으로 분할하여 여러 파일로 생성할 수 있습니다</p>
      </div>

      <div className={styles.content}>
        {pdfs.length === 0 ? (
          <PdfMergeUploader 
            onFilesUpload={handleFilesUpload}
            disabled={isProcessing}
          />
        ) : (
          <>
            <PdfList
              pdfs={pdfs}
              separatorIndices={separatorIndices}
              onReorder={handleReorder}
              onRemove={handleRemove}
              onAddSeparator={handleAddSeparator}
              onRemoveSeparator={handleRemoveSeparator}
            />
            
            <div className={styles.controls}>
              <div className={styles.outputSettings}>
                <label htmlFor="outputFileName">출력 파일명:</label>
                <input
                  id="outputFileName"
                  type="text"
                  value={outputFileName}
                  onChange={(e) => setOutputFileName(e.target.value)}
                  placeholder="merged-document"
                  className={styles.fileNameInput}
                />
                <span className={styles.fileExtension}>.pdf</span>
              </div>
              
              {/* 구분선 정보 표시 */}
              {separatorIndices.length > 0 && (
                <div className={styles.separatorInfo}>
                  <div className={styles.infoIcon}>📊</div>
                  <div>
                    <strong>구분선 {separatorIndices.length}개</strong> → 
                    <strong> {separatorIndices.length + 1}개 파일</strong>이 생성됩니다
                  </div>
                  <div className={styles.fileNames}>
                    {Array.from({ length: separatorIndices.length + 1 }, (_, i) => (
                      <span key={i} className={styles.fileName}>
                        {outputFileName}_그룹{i + 1}.pdf
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className={styles.actions}>
                <button
                  onClick={() => {
                    setPdfs([]);
                    setSeparatorIndices([]);
                  }}
                  className={styles.clearBtn}
                  disabled={isProcessing}
                >
                  🗑️ 모두 삭제
                </button>
                
                <button
                  onClick={handleMerge}
                  className={styles.mergeBtn}
                  disabled={isProcessing || pdfs.length === 0}
                >
                  {isProcessing ? '처리 중...' : '🔗 PDF 결합'}
                </button>
              </div>
            </div>
            
            <div className={styles.addMore}>
              <PdfMergeUploader 
                onFilesUpload={handleFilesUpload}
                disabled={isProcessing}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
} 
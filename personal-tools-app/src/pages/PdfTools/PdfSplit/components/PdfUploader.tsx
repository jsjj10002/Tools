import { useCallback } from 'react';
import styles from './PdfUploader.module.css';

interface PdfUploaderProps {
  onFileUpload: (file: File) => void;
}

export default function PdfUploader({ onFileUpload }: PdfUploaderProps) {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onFileUpload(file);
    } else {
      alert('PDF 파일만 업로드할 수 있습니다.');
    }
  }, [onFileUpload]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');

    if (pdfFile) {
      onFileUpload(pdfFile);
    } else {
      alert('PDF 파일만 업로드할 수 있습니다.');
    }
  }, [onFileUpload]);

  return (
    <div className={styles.container}>
      <div 
        className={styles.dropZone}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className={styles.dropContent}>
          <div className={styles.icon}>📄</div>
          <h3>PDF 파일을 선택하거나 드래그하세요</h3>
          <p>분할할 PDF 파일을 업로드해주세요</p>
          
          <label className={styles.fileButton}>
            📁 파일 선택
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
      
      <div className={styles.info}>
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>✅</span>
          <span>PDF 파일만 지원</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>🔒</span>
          <span>로컬에서 안전하게 처리</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>⚡</span>
          <span>빠른 처리 속도</span>
        </div>
      </div>
    </div>
  );
} 
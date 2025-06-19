import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import styles from './PdfMergeUploader.module.css';

interface PdfMergeUploaderProps {
  onFilesUpload: (files: File[]) => void;
  disabled?: boolean;
}

export default function PdfMergeUploader({ onFilesUpload, disabled = false }: PdfMergeUploaderProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesUpload(acceptedFiles);
  }, [onFilesUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true,
    disabled,
  });

  return (
    <div 
      {...getRootProps()} 
      className={`
        ${styles.container} 
        ${isDragActive ? styles.dragActive : ''}
        ${disabled ? styles.disabled : ''}
      `}
    >
      <input {...getInputProps()} />
      <div className={styles.content}>
        <div className={styles.icon}>📄🔗📄</div>
        <div className={styles.text}>
          {isDragActive ? (
            <div className={styles.dragText}>
              PDF 파일들을 여기에 놓아주세요
            </div>
          ) : (
            <>
              <div className={styles.mainText}>
                결합할 PDF 파일들을 드래그하거나 클릭하여 업로드
              </div>
              <div className={styles.subText}>
                여러 PDF를 한 번에 선택하거나 하나씩 추가할 수 있습니다
              </div>
            </>
          )}
        </div>
        <button 
          type="button" 
          className={styles.uploadBtn}
          disabled={disabled}
        >
          PDF 파일 선택
        </button>
      </div>
    </div>
  );
} 
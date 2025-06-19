import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import styles from './PdfUploader.module.css';

interface PdfUploaderProps {
  onFilesUpload: (files: File[]) => void;
  disabled?: boolean;
}

export default function PdfUploader({ onFilesUpload, disabled = false }: PdfUploaderProps) {
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
        <div className={styles.icon}>📄</div>
        <div className={styles.text}>
          {isDragActive ? (
            <div className={styles.dragText}>
              파일을 여기에 놓아주세요
            </div>
          ) : (
            <>
              <div className={styles.mainText}>
                PDF 파일을 드래그하거나 클릭하여 업로드
              </div>
              <div className={styles.subText}>
                여러 파일을 동시에 처리할 수 있습니다.
              </div>
            </>
          )}
        </div>
        <button 
          type="button" 
          className={styles.uploadBtn}
          disabled={disabled}
        >
          파일 선택
        </button>
      </div>
    </div>
  );
}
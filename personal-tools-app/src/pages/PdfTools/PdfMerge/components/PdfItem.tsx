import { MergeablePdf } from '../services/pdfMerger';
import styles from './PdfItem.module.css';

interface PdfItemProps {
  pdf: MergeablePdf;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onRemove: () => void;
}

export default function PdfItem({
  pdf,
  index,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove
}: PdfItemProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div
      className={`
        ${styles.container}
        ${isDragging ? styles.dragging : ''}
        ${isDragOver ? styles.dragOver : ''}
        ${!pdf.isLoaded ? styles.loading : ''}
      `}
      draggable={pdf.isLoaded}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className={styles.dragHandle}>
        <span className={styles.dragIcon}>⋮⋮</span>
        <span className={styles.index}>{index + 1}</span>
      </div>
      
      <div className={styles.thumbnail}>
        {pdf.thumbnailUrl ? (
          <img src={pdf.thumbnailUrl} alt={`${pdf.file.name} 미리보기`} />
        ) : (
          <div className={styles.placeholderThumbnail}>
            📄
          </div>
        )}
      </div>
      
      <div className={styles.info}>
        <div className={styles.fileName}>
          {pdf.file.name}
        </div>
        <div className={styles.fileDetails}>
          <span className={styles.pageCount}>
            {pdf.isLoaded ? `${pdf.totalPages}페이지` : '로딩 중...'}
          </span>
          <span className={styles.fileSize}>
            {formatFileSize(pdf.file.size)}
          </span>
        </div>
        {!pdf.isLoaded && (
          <div className={styles.loadingIndicator}>
            <div className={styles.spinner}></div>
            PDF 분석 중...
          </div>
        )}
      </div>
      
      <div className={styles.actions}>
        <button
          className={styles.removeBtn}
          onClick={onRemove}
          title="PDF 제거"
        >
          ✕
        </button>
      </div>
    </div>
  );
} 
import styles from './PagePreview.module.css';

interface PagePreviewProps {
  pageNumber: number;
  dataUrl: string;
  onClose: () => void;
}

export default function PagePreview({ pageNumber, dataUrl, onClose }: PagePreviewProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>📄 페이지 {pageNumber} 미리보기</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className={styles.content}>
          <img 
            src={dataUrl} 
            alt={`Page ${pageNumber}`}
            className={styles.previewImage}
          />
        </div>
        
        <div className={styles.footer}>
          <p>실제 변환 시에는 선택한 품질로 더 높은 해상도로 저장됩니다.</p>
        </div>
      </div>
    </div>
  );
}
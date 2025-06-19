import { useState, useEffect } from 'react';
import { pdfSplitter } from '../services/pdfSplitter';
import styles from './PagePreview.module.css';

interface PagePreviewProps {
  file: File;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  splitPoints: number[];
}

export default function PagePreview({ 
  file, 
  currentPage, 
  totalPages, 
  onPageChange, 
  splitPoints 
}: PagePreviewProps) {
  const [previewImage, setPreviewImage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadPreview = async () => {
      setLoading(true);
      try {
        const imageUrl = await pdfSplitter.renderPageAsImage(file, currentPage);
        setPreviewImage(imageUrl);
      } catch (error) {
        console.error('미리보기 로드 실패:', error);
        setPreviewImage('');
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [file, currentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(event.target.value);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const isSplitPoint = splitPoints.includes(currentPage);

  return (
    <div className={styles.container}>
      <div className={styles.previewArea}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>페이지 로딩 중...</p>
          </div>
        ) : previewImage ? (
          <div className={styles.imageContainer}>
            <img 
              src={previewImage} 
              alt={`페이지 ${currentPage}`}
              className={styles.previewImage}
            />
            {isSplitPoint && (
              <div className={styles.splitIndicator}>
                ✂️ 분할 지점
              </div>
            )}
          </div>
        ) : (
          <div className={styles.error}>
            <p>페이지를 로드할 수 없습니다</p>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <button 
          className={styles.navButton}
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
        >
          ⬅️ 이전
        </button>

        <div className={styles.pageInfo}>
          <input
            type="number"
            value={currentPage}
            onChange={handlePageInput}
            min={1}
            max={totalPages}
            className={styles.pageInput}
          />
          <span className={styles.pageTotal}>/ {totalPages}</span>
        </div>

        <button 
          className={styles.navButton}
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
        >
          다음 ➡️
        </button>
      </div>

      <div className={styles.pageSlider}>
        <input
          type="range"
          min={1}
          max={totalPages}
          value={currentPage}
          onChange={(e) => onPageChange(parseInt(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.sliderLabels}>
          <span>1</span>
          <span>{totalPages}</span>
        </div>
      </div>
    </div>
  );
} 
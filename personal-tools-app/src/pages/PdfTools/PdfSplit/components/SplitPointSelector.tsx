import { useState } from 'react';
import styles from './SplitPointSelector.module.css';

interface SplitPointSelectorProps {
  totalPages: number;
  splitPoints: number[];
  onSplitPointAdd: (pageNumber: number) => void;
  onSplitPointRemove: (pageNumber: number) => void;
  currentPage: number;
}

export default function SplitPointSelector({
  totalPages,
  splitPoints,
  onSplitPointAdd,
  onSplitPointRemove,
  currentPage
}: SplitPointSelectorProps) {
  const [inputPage, setInputPage] = useState<string>('');

  const handleAddSplitPoint = () => {
    const pageNum = parseInt(inputPage);
    if (pageNum >= 1 && pageNum <= totalPages && !splitPoints.includes(pageNum)) {
      onSplitPointAdd(pageNum);
      setInputPage('');
    }
  };

  const handleAddCurrentPage = () => {
    if (currentPage >= 1 && currentPage <= totalPages && !splitPoints.includes(currentPage)) {
      onSplitPointAdd(currentPage);
    }
  };

  const handleRemoveSplitPoint = (pageNumber: number) => {
    onSplitPointRemove(pageNumber);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddSplitPoint();
    }
  };

  const isCurrentPageAddable = currentPage >= 1 && currentPage <= totalPages && !splitPoints.includes(currentPage);

  return (
    <div className={styles.container}>
      <div className={styles.addSection}>
        <div className={styles.inputGroup}>
          <input
            type="number"
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="페이지 번호 입력"
            min={1}
            max={totalPages}
            className={styles.pageInput}
          />
          <button
            onClick={handleAddSplitPoint}
            disabled={!inputPage || parseInt(inputPage) < 1 || parseInt(inputPage) > totalPages || splitPoints.includes(parseInt(inputPage))}
            className={styles.addButton}
          >
            ✂️ 분할 지점 추가
          </button>
        </div>

        <button
          onClick={handleAddCurrentPage}
          disabled={!isCurrentPageAddable}
          className={styles.currentPageButton}
        >
          📍 현재 페이지({currentPage}) 분할 지점으로 추가
        </button>
      </div>

      <div className={styles.splitPointsList}>
        <h4>설정된 분할 지점</h4>
        {splitPoints.length === 0 ? (
          <div className={styles.emptyState}>
            <p>설정된 분할 지점이 없습니다</p>
            <p className={styles.hint}>페이지 1부터 {totalPages}까지 분할 지점을 설정할 수 있습니다</p>
          </div>
        ) : (
          <div className={styles.pointsList}>
            {splitPoints.sort((a, b) => a - b).map((point) => (
              <div key={point} className={styles.pointItem}>
                <span className={styles.pointIcon}>✂️</span>
                <span className={styles.pointText}>페이지 {point}</span>
                <button
                  onClick={() => handleRemoveSplitPoint(point)}
                  className={styles.removeButton}
                >
                  ❌
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.visualization}>
        <h4>분할 시각화</h4>
        <div className={styles.pageBar}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <div
              key={page}
              className={`${styles.pageBlock} ${
                splitPoints.includes(page) ? styles.splitPoint : ''
              } ${page === currentPage ? styles.currentPage : ''}`}
              title={`페이지 ${page}${splitPoints.includes(page) ? ' (분할 지점)' : ''}`}
            >
              {page}
            </div>
          ))}
        </div>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.normal}`}></div>
            <span>일반 페이지</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.split}`}></div>
            <span>분할 지점</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.current}`}></div>
            <span>현재 페이지</span>
          </div>
        </div>
      </div>

      <div className={styles.info}>
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>💡</span>
          <span>분할 지점은 해당 페이지부터 새로운 파일이 시작됩니다</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>📊</span>
          <span>분할 지점 {splitPoints.length}개 → {splitPoints.length + 1}개 파일 생성</span>
        </div>
      </div>
    </div>
  );
} 
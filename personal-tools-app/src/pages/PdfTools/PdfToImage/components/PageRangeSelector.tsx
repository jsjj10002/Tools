import { useState, useEffect } from 'react';
import { PdfProcessor } from '../services/pdfProcessor';
import styles from './PageRangeSelector.module.css';

interface PageRangeSelectorProps {
  totalPages: number;
  startPage: number;
  endPage: number;
  processor: PdfProcessor;
  onRangeChange: (start: number, end: number) => void;
  onPreviewPage?: (pageNumber: number) => void;
}

export default function PageRangeSelector({
  totalPages,
  startPage,
  endPage,
  processor,
  onRangeChange,
  onPreviewPage
}: PageRangeSelectorProps) {
  const [inputStart, setInputStart] = useState(startPage.toString());
  const [inputEnd, setInputEnd] = useState(endPage.toString());
  const [inputMode, setInputMode] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});

  useEffect(() => {
    setInputStart(startPage.toString());
    setInputEnd(endPage.toString());
  }, [startPage, endPage]);

  // 썸네일 로드
  useEffect(() => {
    const loadThumbnails = async () => {
      const selectedCount = endPage - startPage + 1;
      const maxThumbnails = Math.min(selectedCount, 10);
      
      for (let i = 0; i < maxThumbnails; i++) {
        const pageNumber = startPage + i;
        
        // 이미 로드된 썸네일은 스킵
        if (thumbnails[pageNumber]) continue;
        
        try {
          const thumbnail = await processor.getThumbnail(pageNumber, 60);
          setThumbnails(prev => ({
            ...prev,
            [pageNumber]: thumbnail
          }));
        } catch (error) {
          console.error(`페이지 ${pageNumber} 썸네일 로드 실패:`, error);
        }
      }
    };

    if (processor) {
      loadThumbnails();
    }
  }, [startPage, endPage, processor]);

  const handleSliderChange = (type: 'start' | 'end', value: number) => {
    if (type === 'start') {
      const newStart = Math.min(value, endPage);
      onRangeChange(newStart, endPage);
    } else {
      const newEnd = Math.max(value, startPage);
      onRangeChange(startPage, newEnd);
    }
  };

  const handleInputChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setInputStart(value);
    } else {
      setInputEnd(value);
    }
  };

  const handleInputSubmit = () => {
    const newStart = Math.max(1, Math.min(parseInt(inputStart) || 1, totalPages));
    const newEnd = Math.max(newStart, Math.min(parseInt(inputEnd) || totalPages, totalPages));
    
    onRangeChange(newStart, newEnd);
    setInputMode(false);
  };

  const handleSelectAll = () => {
    onRangeChange(1, totalPages);
  };

  const selectedCount = endPage - startPage + 1;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>📄 페이지 선택</h3>
        <div className={styles.info}>
          <span>총 {totalPages}페이지 중 {selectedCount}페이지 선택</span>
          <button 
            className={styles.selectAllBtn}
            onClick={handleSelectAll}
          >
            전체 선택
          </button>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeBtn} ${!inputMode ? styles.active : ''}`}
            onClick={() => setInputMode(false)}
          >
            슬라이더
          </button>
          <button
            className={`${styles.modeBtn} ${inputMode ? styles.active : ''}`}
            onClick={() => setInputMode(true)}
          >
            직접 입력
          </button>
        </div>

        {!inputMode ? (
          <div className={styles.sliderControls}>
            <div className={styles.sliderGroup}>
              <label>시작 페이지: {startPage}</label>
              <input
                type="range"
                min="1"
                max={totalPages}
                value={startPage}
                onChange={(e) => handleSliderChange('start', parseInt(e.target.value))}
                className={styles.slider}
              />
            </div>
            <div className={styles.sliderGroup}>
              <label>끝 페이지: {endPage}</label>
              <input
                type="range"
                min="1"
                max={totalPages}
                value={endPage}
                onChange={(e) => handleSliderChange('end', parseInt(e.target.value))}
                className={styles.slider}
              />
            </div>
          </div>
        ) : (
          <div className={styles.inputControls}>
            <div className={styles.inputGroup}>
              <label>시작 페이지</label>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={inputStart}
                onChange={(e) => handleInputChange('start', e.target.value)}
                className={styles.pageInput}
              />
            </div>
            <span className={styles.separator}>~</span>
            <div className={styles.inputGroup}>
              <label>끝 페이지</label>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={inputEnd}
                onChange={(e) => handleInputChange('end', e.target.value)}
                className={styles.pageInput}
              />
            </div>
            <button 
              className={styles.applyBtn}
              onClick={handleInputSubmit}
            >
              적용
            </button>
          </div>
        )}
      </div>

      <div className={styles.pagePreview}>
        <h4>📋 페이지 미리보기</h4>
        <div className={styles.pageList}>
          {Array.from({ length: Math.min(selectedCount, 10) }, (_, i) => {
            const pageNumber = startPage + i;
            const thumbnail = thumbnails[pageNumber];
            
            return (
              <div
                key={pageNumber}
                className={styles.pageItem}
                onClick={() => onPreviewPage?.(pageNumber)}
                title={`페이지 ${pageNumber} - 클릭하여 큰 미리보기`}
              >
                <div className={styles.pageNumber}>{pageNumber}</div>
                <div className={styles.pageThumb}>
                  {thumbnail ? (
                    <img 
                      src={thumbnail} 
                      alt={`페이지 ${pageNumber}`}
                      className={styles.thumbnailImage}
                    />
                  ) : (
                    <div className={styles.loading}>로딩...</div>
                  )}
                </div>
              </div>
            );
          })}
          {selectedCount > 10 && (
            <div className={styles.morePages}>
              ... 및 {selectedCount - 10}개 페이지 더
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
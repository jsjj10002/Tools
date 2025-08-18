import styles from './QualitySlider.module.css';

interface QualitySliderProps {
  quality: number;
  onChange: (quality: number) => void;
  disabled?: boolean;
}

const getQualityLabel = (quality: number): string => {
  if (quality >= 80) return '최고품질';
  if (quality >= 70) return '고품질';
  if (quality >= 50) return '표준품질';
  if (quality >= 30) return '저품질';
  return '최소품질';
};

const getQualityColor = (quality: number): string => {
  if (quality >= 80) return '#10b981'; // emerald-500
  if (quality >= 70) return '#3b82f6'; // blue-500
  if (quality >= 50) return '#f59e0b'; // amber-500
  if (quality >= 30) return '#ef4444'; // red-500
  return '#6b7280'; // gray-500
};

export default function QualitySlider({ quality, onChange, disabled = false }: QualitySliderProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <label className={styles.label}>품질 설정</label>
        <div className={styles.qualityDisplay}>
          <span 
            className={styles.qualityValue}
            style={{ color: getQualityColor(quality) }}
          >
            {quality}%
          </span>
          <span 
            className={styles.qualityLabel}
            style={{ color: getQualityColor(quality) }}
          >
            ({getQualityLabel(quality)})
          </span>
        </div>
      </div>
      
      <div className={styles.sliderContainer}>
        <input
          type="range"
          min="10"
          max="95"
          step="5"
          value={quality}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className={styles.slider}
          style={{
            background: `linear-gradient(to right, ${getQualityColor(quality)} 0%, ${getQualityColor(quality)} ${((quality - 10) / 85) * 100}%, #e5e7eb ${((quality - 10) / 85) * 100}%, #e5e7eb 100%)`
          }}
        />
        <div className={styles.marks}>
          <div className={styles.mark}>
            <span>10%</span>
            <span>최소</span>
          </div>
          <div className={styles.mark}>
            <span>30%</span>
            <span>저품질</span>
          </div>
          <div className={styles.mark}>
            <span>50%</span>
            <span>표준</span>
          </div>
          <div className={styles.mark}>
            <span>70%</span>
            <span>고품질</span>
          </div>
          <div className={styles.mark}>
            <span>95%</span>
            <span>최고</span>
          </div>
        </div>
      </div>
      
      <div className={styles.description}>
        <div className={styles.usageGuide}>
          <h4>품질 가이드</h4>
          <div className={styles.guideItems}>
            <div className={styles.guideItem}>
              <span className={styles.guideDot} style={{ backgroundColor: '#10b981' }}></span>
              <span><strong>80-95%:</strong> 포트폴리오, 인쇄용</span>
            </div>
            <div className={styles.guideItem}>
              <span className={styles.guideDot} style={{ backgroundColor: '#3b82f6' }}></span>
              <span><strong>70-80%:</strong> 웹사이트, 일반 사용</span>
            </div>
            <div className={styles.guideItem}>
              <span className={styles.guideDot} style={{ backgroundColor: '#f59e0b' }}></span>
              <span><strong>50-70%:</strong> 소셜미디어, 빠른 로딩</span>
            </div>
            <div className={styles.guideItem}>
              <span className={styles.guideDot} style={{ backgroundColor: '#ef4444' }}></span>
              <span><strong>30-50%:</strong> 썸네일, 미리보기</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
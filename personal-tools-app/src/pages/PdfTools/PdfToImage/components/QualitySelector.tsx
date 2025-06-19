import styles from './QualitySelector.module.css';

interface QualitySelectorProps {
  quality: 'ultra' | 'high' | 'medium';
  format: 'png' | 'jpg' | 'webp';
  onQualityChange: (quality: 'ultra' | 'high' | 'medium') => void;
  onFormatChange: (format: 'png' | 'jpg' | 'webp') => void;
}

const qualityOptions = [
  { 
    value: 'ultra' as const, 
    label: '최고품질', 
    description: '216 DPI, 최고 해상도',
    icon: '💎'
  },
  { 
    value: 'high' as const, 
    label: '고품질', 
    description: '144 DPI, 균형있는 품질',
    icon: '⭐'
  },
  { 
    value: 'medium' as const, 
    label: '중품질', 
    description: '108 DPI, 빠른 처리',
    icon: '⚡'
  }
];

const formatOptions = [
  { 
    value: 'png' as const, 
    label: 'PNG', 
    description: '무손실, 투명 지원',
    extension: '.png'
  },
  { 
    value: 'jpg' as const, 
    label: 'JPG', 
    description: '작은 용량, 사진에 적합',
    extension: '.jpg'
  },
  { 
    value: 'webp' as const, 
    label: 'WebP', 
    description: '차세대 포맷, 고효율',
    extension: '.webp'
  }
];

export default function QualitySelector({
  quality,
  format,
  onQualityChange,
  onFormatChange
}: QualitySelectorProps) {
  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <h3 className={styles.title}>🎯 이미지 품질</h3>
        <div className={styles.optionsGrid}>
          {qualityOptions.map((option) => (
            <label
              key={option.value}
              className={`${styles.option} ${quality === option.value ? styles.selected : ''}`}
            >
              <input
                type="radio"
                name="quality"
                value={option.value}
                checked={quality === option.value}
                onChange={() => onQualityChange(option.value)}
                className={styles.radioInput}
              />
              <div className={styles.optionContent}>
                <div className={styles.optionIcon}>{option.icon}</div>
                <div className={styles.optionText}>
                  <div className={styles.optionLabel}>{option.label}</div>
                  <div className={styles.optionDescription}>{option.description}</div>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.title}>📁 파일 형식</h3>
        <div className={styles.optionsGrid}>
          {formatOptions.map((option) => (
            <label
              key={option.value}
              className={`${styles.option} ${format === option.value ? styles.selected : ''}`}
            >
              <input
                type="radio"
                name="format"
                value={option.value}
                checked={format === option.value}
                onChange={() => onFormatChange(option.value)}
                className={styles.radioInput}
              />
              <div className={styles.optionContent}>
                <div className={styles.optionText}>
                  <div className={styles.optionLabel}>
                    {option.label}
                    <span className={styles.extension}>{option.extension}</span>
                  </div>
                  <div className={styles.optionDescription}>{option.description}</div>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.summary}>
        <h4>📋 선택 요약</h4>
        <div className={styles.summaryContent}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>품질:</span>
            <span className={styles.summaryValue}>
              {qualityOptions.find(q => q.value === quality)?.label}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>형식:</span>
            <span className={styles.summaryValue}>
              {formatOptions.find(f => f.value === format)?.label}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>예상 크기:</span>
            <span className={styles.summaryValue}>
              {getEstimatedSize(quality, format)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getEstimatedSize(quality: string, format: string): string {
  const sizeMap: Record<string, Record<string, string>> = {
    ultra: { png: '대용량', jpg: '중대용량', webp: '중용량' },
    high: { png: '중대용량', jpg: '중용량', webp: '소용량' },
    medium: { png: '중용량', jpg: '소용량', webp: '최소용량' }
  };
  
  return sizeMap[quality]?.[format] || '보통';
}
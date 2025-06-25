import React from 'react';
import styles from './QualitySlider.module.css';

interface QualitySliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

export default function QualitySlider({ 
  value, 
  onChange, 
  disabled = false,
  min = 10,
  max = 80,
  step = 5,
  label = "압축 품질"
}: QualitySliderProps) {
  
  const getQualityDescription = (quality: number): string => {
    if (quality >= 70) return "높은 품질";
    if (quality >= 50) return "보통 품질";
    if (quality >= 30) return "낮은 품질";
    return "최소 품질";
  };

  const getQualityColor = (quality: number): string => {
    if (quality >= 70) return "var(--color-success)";
    if (quality >= 50) return "var(--color-warning)";
    return "var(--color-error)";
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <label className={styles.label}>{label}</label>
        <div className={styles.valueDisplay}>
          <span className={styles.value} style={{ color: getQualityColor(value) }}>
            {value}%
          </span>
          <span className={styles.description}>
            ({getQualityDescription(value)})
          </span>
        </div>
      </div>
      
      <div className={styles.sliderContainer}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className={styles.slider}
          style={{
            background: `linear-gradient(to right, 
              var(--color-error) 0%, 
              var(--color-warning) 50%, 
              var(--color-success) 100%)`
          }}
        />
        
        <div className={styles.marks}>
          <span className={styles.mark}>10%</span>
          <span className={styles.mark}>30%</span>
          <span className={styles.mark}>50%</span>
          <span className={styles.mark}>70%</span>
          <span className={styles.mark}>80%</span>
        </div>
      </div>

      <div className={styles.qualityGuide}>
        <div className={styles.guideItem}>
          <span className={styles.guideColor} style={{ backgroundColor: "var(--color-success)" }}></span>
          <span className={styles.guideText}>70-80%: 포트폴리오, 인쇄용</span>
        </div>
        <div className={styles.guideItem}>
          <span className={styles.guideColor} style={{ backgroundColor: "var(--color-warning)" }}></span>
          <span className={styles.guideText}>50-65%: 웹사이트, 소셜미디어</span>
        </div>
        <div className={styles.guideItem}>
          <span className={styles.guideColor} style={{ backgroundColor: "var(--color-error)" }}></span>
          <span className={styles.guideText}>10-45%: 썸네일, 미리보기</span>
        </div>
      </div>
    </div>
  );
} 
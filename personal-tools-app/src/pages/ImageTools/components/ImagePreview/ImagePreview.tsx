import React, { useState } from 'react';
import styles from './ImagePreview.module.css';

interface ImagePreviewProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

export default function ImagePreview({ src, alt, className, onClick }: ImagePreviewProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
  };

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {!isLoaded && !hasError && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span>로딩 중...</span>
        </div>
      )}
      
      {hasError && (
        <div className={styles.error}>
          <span>🚫</span>
          <span>이미지 로드 실패</span>
        </div>
      )}
      
      <img
        src={src}
        alt={alt}
        className={`${styles.image} ${isLoaded ? styles.loaded : ''}`}
        onLoad={handleLoad}
        onError={handleError}
        onClick={onClick}
        style={{ display: hasError ? 'none' : 'block' }}
      />
    </div>
  );
} 
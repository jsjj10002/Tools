import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTaskStore } from '@/stores/taskStore';
import { TaskType, ImageProcessConfig } from '@/types/task';
import ImagePreview from '../components/ImagePreview/ImagePreview';
import OutputPathSelector from '../components/OutputPathSelector/OutputPathSelector';
import styles from './ImageFormatConverter.module.css';

interface ImageFile {
  id: string;
  file: File;
  url: string;
  originalFormat: string;
  converted?: {
    blob: Blob;
    url: string;
    format: string;
    size: number;
  };
}

type ImageFormat = 'jpg' | 'png' | 'webp' | 'bmp' | 'gif' | 'avif';

const formatMimeTypes: Record<ImageFormat, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  bmp: 'image/bmp',
  gif: 'image/gif',
  avif: 'image/avif'
};

const formatLabels: Record<ImageFormat, string> = {
  jpg: 'JPEG',
  png: 'PNG',
  webp: 'WebP',
  bmp: 'BMP',
  gif: 'GIF',
  avif: 'AVIF'
};

export default function ImageFormatConverter() {
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [targetFormat, setTargetFormat] = useState<ImageFormat>('png');
  const [quality, setQuality] = useState<number>(90);
  const [outputPath, setOutputPath] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [convertResults, setConvertResults] = useState<Map<string, any>>(new Map());

  const { addTask } = useTaskStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getImageFormat = (mimeType: string): string => {
    const formatMap: Record<string, string> = {
      'image/jpeg': 'JPG',
      'image/png': 'PNG',
      'image/webp': 'WebP',
      'image/bmp': 'BMP',
      'image/gif': 'GIF',
      'image/avif': 'AVIF'
    };
    return formatMap[mimeType] || 'Unknown';
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => 
      file.type.startsWith('image/') && 
      ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif'].includes(file.type)
    );

    const newImageFiles: ImageFile[] = validFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
      originalFormat: getImageFormat(file.type)
    }));

    setImageFiles(prev => [...prev, ...newImageFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']
    },
    multiple: true
  });

  const convertImage = async (imageFile: ImageFile, targetFormat: ImageFormat, quality: number): Promise<{ blob: Blob; size: number }> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (ctx) {
          // PNG나 GIF의 투명 배경 처리
          if (targetFormat === 'jpg' && (imageFile.file.type === 'image/png' || imageFile.file.type === 'image/gif')) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          
          ctx.drawImage(img, 0, 0);
          
          const mimeType = formatMimeTypes[targetFormat];
          const qualityValue = targetFormat === 'png' ? undefined : quality / 100;
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({
                  blob,
                  size: blob.size
                });
              } else {
                reject(new Error('포맷 변환에 실패했습니다.'));
              }
            },
            mimeType,
            qualityValue
          );
        } else {
          reject(new Error('Canvas context를 가져올 수 없습니다.'));
        }
      };

      img.onerror = () => {
        reject(new Error('이미지를 로드할 수 없습니다.'));
      };

      img.src = imageFile.url;
    });
  };

  const handleConvert = async () => {
    if (imageFiles.length === 0) {
      alert('변환할 이미지를 선택해주세요.');
      return;
    }

    setIsProcessing(true);

    const taskId = addTask({
      id: crypto.randomUUID(),
      type: 'image-format-convert' as TaskType,
      title: `이미지 포맷 변환 (${imageFiles.length}개 파일)`,
      progress: 0,
      status: 'pending',
      config: {
        format: targetFormat,
        quality,
        outputPath: outputPath || '다운로드'
      } as ImageProcessConfig
    });

    try {
      const results = new Map();
      
      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];
        
        // 진행률 업데이트
        const progress = Math.round(((i + 1) / imageFiles.length) * 100);
        useTaskStore.getState().updateTask(taskId, { progress });

        try {
          const { blob, size } = await convertImage(imageFile, targetFormat, quality);
          const convertedUrl = URL.createObjectURL(blob);
          
          const result = {
            blob,
            url: convertedUrl,
            format: formatLabels[targetFormat],
            size,
            originalSize: imageFile.file.size,
            compressionRatio: Math.round((1 - size / imageFile.file.size) * 100)
          };

          results.set(imageFile.id, result);

          // 파일 다운로드
          const link = document.createElement('a');
          link.href = convertedUrl;
          const baseName = imageFile.file.name.replace(/\.[^/.]+$/, '');
          link.download = `${baseName}.${targetFormat}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

        } catch (error) {
          console.error(`이미지 포맷 변환 실패 (${imageFile.file.name}):`, error);
        }
      }

      setConvertResults(results);
      useTaskStore.getState().updateTask(taskId, { 
        status: 'completed',
        progress: 100 
      });

      // 완료 후 상태 초기화
      setTimeout(() => {
        resetToInitialState();
      }, 1000);

    } catch (error) {
      console.error('이미지 포맷 변환 오류:', error);
      useTaskStore.getState().updateTask(taskId, { 
        status: 'failed',
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const removeImage = (id: string) => {
    setImageFiles(prev => {
      const filtered = prev.filter(img => img.id !== id);
      // URL 정리
      const toRemove = prev.find(img => img.id === id);
      if (toRemove) {
        URL.revokeObjectURL(toRemove.url);
        if (toRemove.converted) {
          URL.revokeObjectURL(toRemove.converted.url);
        }
      }
      return filtered;
    });
    
    // 변환 결과도 제거
    setConvertResults(prev => {
      const newResults = new Map(prev);
      newResults.delete(id);
      return newResults;
    });
  };

  const resetToInitialState = () => {
    // URL 정리
    imageFiles.forEach(img => {
      URL.revokeObjectURL(img.url);
      if (img.converted) {
        URL.revokeObjectURL(img.converted.url);
      }
    });
    
    convertResults.forEach(result => {
      URL.revokeObjectURL(result.url);
    });
    
    setImageFiles([]);
    setConvertResults(new Map());
    setTargetFormat('jpeg');
    setQuality(85);
    setOutputPath('');
  };



  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const shouldShowQuality = targetFormat !== 'png';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🔄 이미지 포맷 변환</h1>
        <p>이미지를 다양한 포맷으로 변환합니다. JPG, PNG, WebP, BMP, GIF 등을 지원하며 품질 조절이 가능합니다.</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.uploadSection}>
          <div
            {...getRootProps()}
            className={`${styles.dropzone} ${isDragActive ? styles.dragActive : ''}`}
          >
            <input {...getInputProps()} />
            <div className={styles.dropzoneContent}>
              <div className={styles.dropzoneIcon}>🖼️</div>
              <h3>이미지 파일을 여기에 드래그하거나 클릭하여 선택</h3>
              <p>JPG, PNG, WebP, BMP, GIF 형식 지원 (여러 파일 선택 가능)</p>
            </div>
          </div>

          <button
            className={styles.fileSelectButton}
            onClick={() => fileInputRef.current?.click()}
          >
            파일 선택
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              if (e.target.files) {
                onDrop(Array.from(e.target.files));
              }
            }}
            style={{ display: 'none' }}
          />
        </div>

        <div className={styles.settingsSection}>
          <div className={styles.formatSelector}>
            <h3>출력 포맷 선택</h3>
            <div className={styles.formatOptions}>
              {(Object.keys(formatLabels) as ImageFormat[]).map((format) => (
                <label key={format} className={styles.formatOption}>
                  <input
                    type="radio"
                    name="targetFormat"
                    value={format}
                    checked={targetFormat === format}
                    onChange={(e) => setTargetFormat(e.target.value as ImageFormat)}
                    disabled={isProcessing}
                  />
                  <span className={styles.formatLabel}>
                    {formatLabels[format]}
                    {format === 'webp' && <span className={styles.formatBadge}>최적화</span>}
                    {format === 'avif' && <span className={styles.formatBadge}>최신</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>
          
          {shouldShowQuality && (
            <div className={styles.qualityControl}>
              <div className={styles.qualityHeader}>
                <label className={styles.qualityLabel}>품질 설정</label>
                <span className={styles.qualityValue}>{quality}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                disabled={isProcessing}
                className={styles.qualitySlider}
              />
              <div className={styles.qualityMarks}>
                <span>10%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          )}

          <OutputPathSelector
            value={outputPath}
            onChange={setOutputPath}
            placeholder="다운로드 폴더 (기본값)"
          />

          <div className={styles.actionButtons}>
            <button
              className={styles.processButton}
              onClick={handleConvert}
              disabled={imageFiles.length === 0 || isProcessing}
            >
              {isProcessing ? '변환 중...' : `변환하기 (${imageFiles.length}개)`}
            </button>

            {imageFiles.length > 0 && (
              <button
                className={styles.clearButton}
                onClick={resetToInitialState}
                disabled={isProcessing}
              >
                모두 지우기
              </button>
            )}
          </div>
        </div>
      </div>

      {imageFiles.length > 0 && (
        <div className={styles.previewSection}>
          <h2>이미지 미리보기</h2>
          <div className={styles.imageGrid}>
            {imageFiles.map((imageFile) => {
              const result = convertResults.get(imageFile.id);
              
              return (
                <div key={imageFile.id} className={styles.imageCard}>
                  <ImagePreview
                    src={imageFile.url}
                    alt={imageFile.file.name}
                    className={styles.imagePreview}
                  />
                  
                  <div className={styles.imageInfo}>
                    <h4 className={styles.fileName}>{imageFile.file.name}</h4>
                    <div className={styles.fileDetails}>
                      <div className={styles.formatInfo}>
                        <span>원본: {imageFile.originalFormat}</span>
                        <span>크기: {formatFileSize(imageFile.file.size)}</span>
                      </div>
                      {result && (
                        <div className={styles.resultInfo}>
                          <span className={styles.newFormat}>
                            변환: {result.format}
                          </span>
                          <span>크기: {formatFileSize(result.size)}</span>
                          {result.compressionRatio > 0 && (
                            <span className={styles.compressionRatio}>
                              -{result.compressionRatio}% 감소
                            </span>
                          )}
                          {result.compressionRatio < 0 && (
                            <span className={styles.expansionRatio}>
                              +{Math.abs(result.compressionRatio)}% 증가
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.imageActions}>
                    {result && (
                      <button 
                        className={styles.downloadButton}
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = result.url;
                          const baseName = imageFile.file.name.replace(/\.[^/.]+$/, '');
                          link.download = `${baseName}.${targetFormat}`;
                          link.click();
                        }}
                      >
                        다운로드
                      </button>
                    )}
                    <button
                      className={styles.removeButton}
                      onClick={() => removeImage(imageFile.id)}
                      disabled={isProcessing}
                    >
                      제거
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.info}>
        <div className={styles.infoCard}>
          <h3>📊 포맷별 특징</h3>
          <ul>
            <li><strong>JPEG:</strong> 사진에 최적화, 작은 파일 크기, 투명도 미지원</li>
            <li><strong>PNG:</strong> 무손실 압축, 투명도 지원, 그래픽에 적합</li>
            <li><strong>WebP:</strong> 최신 웹 표준, 우수한 압축률, 모든 기능 지원</li>
            <li><strong>BMP:</strong> 무압축, 큰 파일 크기, 호환성 우수</li>
            <li><strong>GIF:</strong> 애니메이션 지원, 256색 제한</li>
          </ul>
        </div>
        
        <div className={styles.infoCard}>
          <h3>🎯 용도별 추천 포맷</h3>
          <ul>
            <li><strong>웹사이트:</strong> WebP (최적화) → JPEG (호환성)</li>
            <li><strong>로고/아이콘:</strong> PNG (투명도) → WebP</li>
            <li><strong>사진:</strong> JPEG (일반) → WebP (고품질)</li>
            <li><strong>인쇄용:</strong> PNG (무손실) → BMP</li>
          </ul>
        </div>
        
        <div className={styles.infoCard}>
          <h3>🛡️ 개인정보 보호</h3>
          <p>모든 이미지 변환은 브라우저 내에서만 수행되며, 이미지가 외부로 전송되지 않습니다. EXIF 데이터도 안전하게 보호됩니다.</p>
        </div>
      </div>
    </div>
  );
}
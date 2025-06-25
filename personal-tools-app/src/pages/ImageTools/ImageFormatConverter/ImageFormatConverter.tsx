import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTaskStore } from '@/stores/taskStore';
import { TaskType, ImageProcessConfig } from '@/types/task';
import ImagePreview from '../components/ImagePreview/ImagePreview';
import QualitySlider from '../components/QualitySlider/QualitySlider';
import OutputPathSelector from '../components/OutputPathSelector/OutputPathSelector';
import styles from './ImageFormatConverter.module.css';

interface ImageFile {
  id: string;
  file: File;
  url: string;
  converted?: {
    blob: Blob;
    url: string;
    format: string;
    size: number;
  };
}

interface ConvertConfig {
  targetFormat: string;
  quality: number;
}

const SUPPORTED_FORMATS = [
  { 
    value: 'jpeg', 
    label: 'JPEG', 
    icon: '📷',
    description: '사진용 압축 포맷',
    features: ['소용량', '빠른 로딩', '웹 최적화'],
    color: '#ff6b6b'
  },
  { 
    value: 'png', 
    label: 'PNG', 
    icon: '🖼️',
    description: '투명도 지원 무손실',
    features: ['투명 배경', '무손실', '아이콘용'],
    color: '#4ecdc4'
  },
  { 
    value: 'webp', 
    label: 'WebP', 
    icon: '🚀',
    description: '차세대 웹 포맷',
    features: ['최고 압축', '모던 브라우저', '고품질'],
    color: '#45b7d1'
  },
  { 
    value: 'bmp', 
    label: 'BMP', 
    icon: '💾',
    description: '무압축 비트맵',
    features: ['무손실', '호환성', '큰 용량'],
    color: '#96ceb4'
  },
  { 
    value: 'gif', 
    label: 'GIF', 
    icon: '🎬',
    description: '애니메이션 지원',
    features: ['애니메이션', '투명도', '제한 색상'],
    color: '#feca57'
  }
];

export default function ImageFormatConverter() {
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [convertConfig, setConvertConfig] = useState<ConvertConfig>({
    targetFormat: 'webp',
    quality: 85
  });
  const [outputPath, setOutputPath] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [convertResults, setConvertResults] = useState<Map<string, any>>(new Map());

  const { addTask } = useTaskStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => 
      file.type.startsWith('image/') && 
      ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif'].includes(file.type)
    );

    const newImageFiles = validFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file)
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

  const convertImage = (imageFile: ImageFile, config: ConvertConfig): Promise<{ blob: Blob; size: number }> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (ctx) {
          // PNG나 GIF에서 JPEG로 변환할 때 흰색 배경 추가
          if (config.targetFormat === 'jpeg' && 
              (imageFile.file.type === 'image/png' || imageFile.file.type === 'image/gif')) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0);
          
          const mimeType = config.targetFormat === 'jpeg' ? 'image/jpeg' : 
                          config.targetFormat === 'png' ? 'image/png' :
                          config.targetFormat === 'webp' ? 'image/webp' :
                          config.targetFormat === 'bmp' ? 'image/bmp' :
                          'image/gif';
          
          const qualityValue = config.targetFormat === 'png' ? undefined : config.quality / 100;
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({
                  blob,
                  size: blob.size
                });
              } else {
                reject(new Error('이미지 변환에 실패했습니다.'));
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
      title: `이미지 포맷 변환 (${imageFiles.length}개 파일 → ${convertConfig.targetFormat.toUpperCase()})`,
      progress: 0,
      status: 'pending',
      config: {
        ...convertConfig,
        outputPath: outputPath || '다운로드'
      } as ImageProcessConfig
    });

    try {
      const results = new Map();
      
      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];
        
        const progress = Math.round(((i + 1) / imageFiles.length) * 100);
        useTaskStore.getState().updateTask(taskId, { progress });

        try {
          const { blob, size } = await convertImage(imageFile, convertConfig);
          const convertedUrl = URL.createObjectURL(blob);
          
          const result = {
            blob,
            url: convertedUrl,
            format: convertConfig.targetFormat.toUpperCase(),
            size,
            originalSize: imageFile.file.size,
            compressionRatio: Math.round((1 - size / imageFile.file.size) * 100)
          };

          results.set(imageFile.id, result);

          // 파일 다운로드
          const link = document.createElement('a');
          link.href = convertedUrl;
          const originalName = imageFile.file.name;
          const baseName = originalName.replace(/\.[^/.]+$/, '');
          const extension = convertConfig.targetFormat === 'jpeg' ? 'jpg' : convertConfig.targetFormat;
          link.download = `${baseName}_converted.${extension}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

        } catch (error) {
          console.error(`이미지 변환 실패 (${imageFile.file.name}):`, error);
        }
      }

      setConvertResults(results);
      useTaskStore.getState().updateTask(taskId, { 
        status: 'completed',
        progress: 100 
      });

      setTimeout(() => {
        resetToInitialState();
      }, 1000);

    } catch (error) {
      console.error('이미지 변환 오류:', error);
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
      const toRemove = prev.find(img => img.id === id);
      if (toRemove) {
        URL.revokeObjectURL(toRemove.url);
        if (toRemove.converted) {
          URL.revokeObjectURL(toRemove.converted.url);
        }
      }
      return filtered;
    });
    
    setConvertResults(prev => {
      const newResults = new Map(prev);
      newResults.delete(id);
      return newResults;
    });
  };

  const resetToInitialState = () => {
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
    setConvertConfig({ targetFormat: 'webp', quality: 85 });
    setOutputPath('');
  };

  const handleAddMoreFiles = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const shouldShowQuality = convertConfig.targetFormat !== 'png' && convertConfig.targetFormat !== 'bmp';
  const selectedFormat = SUPPORTED_FORMATS.find(f => f.value === convertConfig.targetFormat);

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroIcon}>🔄</div>
        <h1 className={styles.heroTitle}>이미지 포맷 변환</h1>
        <p className={styles.heroSubtitle}>
          최신 압축 기술로 완벽한 호환성과 최적화된 파일 크기를 제공합니다
        </p>
        <div className={styles.heroStats}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>5+</span>
            <span className={styles.statLabel}>지원 포맷</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>50%</span>
            <span className={styles.statLabel}>평균 압축률</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>100%</span>
            <span className={styles.statLabel}>품질 보장</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {imageFiles.length === 0 ? (
          <div className={styles.uploadSection}>
            <div
              {...getRootProps()}
              className={`${styles.dropzone} ${isDragActive ? styles.dragActive : ''}`}
            >
              <input {...getInputProps()} />
              <div className={styles.dropzoneContent}>
                <div className={styles.uploadIcon}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>이미지 파일을 업로드하세요</h3>
                <p>JPG, PNG, WebP, BMP, GIF 형식을 지원합니다</p>
                <div className={styles.uploadFeatures}>
                  <span>🔄 포맷 변환</span>
                  <span>📊 일괄 처리</span>
                  <span>🎯 최적화</span>
                </div>
              </div>
            </div>

            <div className={styles.uploadActions}>
              <button
                className={styles.primaryButton}
                onClick={() => fileInputRef.current?.click()}
              >
                <span>📁</span>
                파일 선택
              </button>
              <span className={styles.orText}>또는 드래그 앤 드롭</span>
            </div>
          </div>
        ) : (
          <div className={styles.processingArea}>
            <div className={styles.controlPanel}>
              <div className={styles.panelHeader}>
                <h3>변환 설정</h3>
                <div className={styles.fileCounter}>
                  <span className={styles.fileCount}>{imageFiles.length}</span>
                  <span>개 파일 선택됨</span>
                </div>
              </div>

              <div className={styles.formatSelector}>
                <h4>출력 포맷 선택</h4>
                <div className={styles.formatGrid}>
                  {SUPPORTED_FORMATS.map((format) => (
                    <button
                      key={format.value}
                      onClick={() => setConvertConfig(prev => ({ ...prev, targetFormat: format.value }))}
                      disabled={isProcessing}
                      className={`${styles.formatButton} ${convertConfig.targetFormat === format.value ? styles.active : ''}`}
                      style={{ '--format-color': format.color } as React.CSSProperties}
                    >
                      <div className={styles.formatIcon}>{format.icon}</div>
                      <div className={styles.formatInfo}>
                        <span className={styles.formatLabel}>{format.label}</span>
                        <span className={styles.formatDescription}>{format.description}</span>
                        <div className={styles.formatFeatures}>
                          {format.features.map((feature, index) => (
                            <span key={index} className={styles.formatFeature}>{feature}</span>
                          ))}
                        </div>
                      </div>
                      {convertConfig.targetFormat === format.value && (
                        <div className={styles.selectedIndicator}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {shouldShowQuality && (
                <QualitySlider
                  quality={convertConfig.quality}
                  onChange={(quality) => setConvertConfig(prev => ({ ...prev, quality }))}
                  disabled={isProcessing}
                />
              )}

              <OutputPathSelector
                value={outputPath}
                onChange={setOutputPath}
                placeholder="다운로드 폴더 (기본값)"
              />

              <div className={styles.actionButtons}>
                <button
                  onClick={handleAddMoreFiles}
                  className={styles.secondaryButton}
                  disabled={isProcessing}
                >
                  <span>➕</span>
                  파일 추가
                </button>
                
                <button
                  onClick={resetToInitialState}
                  className={styles.dangerButton}
                  disabled={isProcessing}
                >
                  <span>🗑️</span>
                  모두 지우기
                </button>
                
                <button
                  className={styles.primaryButton}
                  onClick={handleConvert}
                  disabled={isProcessing}
                >
                  <span>{isProcessing ? '⚙️' : '🔄'}</span>
                  {isProcessing ? '변환 중...' : `${selectedFormat?.label}로 변환 (${imageFiles.length}개)`}
                </button>
              </div>
            </div>

            <div className={styles.previewArea}>
              <div className={styles.previewHeader}>
                <h3>이미지 미리보기</h3>
                <div className={styles.previewControls}>
                  <div className={styles.targetFormatIndicator}>
                    <span className={styles.targetIcon}>{selectedFormat?.icon}</span>
                    <span>→ {selectedFormat?.label}</span>
                  </div>
                </div>
              </div>
              
              <div className={styles.imageGrid}>
                {imageFiles.map((imageFile) => {
                  const result = convertResults.get(imageFile.id);
                  
                  return (
                    <div key={imageFile.id} className={styles.imageCard}>
                      <div className={styles.imagePreviewContainer}>
                        <ImagePreview
                          src={imageFile.url}
                          alt={imageFile.file.name}
                          className={styles.imagePreview}
                        />
                        <button
                          className={styles.removeButton}
                          onClick={() => removeImage(imageFile.id)}
                          disabled={isProcessing}
                          title="이미지 제거"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        
                        <div className={styles.formatBadges}>
                          <div className={styles.originalFormat}>
                            {imageFile.file.type.split('/')[1].toUpperCase()}
                          </div>
                          {result && (
                            <div className={styles.convertedFormat}>
                              → {result.format}
                            </div>
                          )}
                        </div>
                        
                        {result && (
                          <div className={styles.conversionBadge}>
                            <span className={styles.conversionText}>
                              {result.compressionRatio > 0 ? `-${result.compressionRatio}%` : '변환 완료'}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className={styles.imageInfo}>
                        <h4 className={styles.fileName}>{imageFile.file.name}</h4>
                        <div className={styles.fileDetails}>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>원본 크기</span>
                            <span className={styles.detailValue}>{formatFileSize(imageFile.file.size)}</span>
                          </div>
                          {result && (
                            <>
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>변환 후</span>
                                <span className={styles.detailValue}>{formatFileSize(result.size)}</span>
                              </div>
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>절약</span>
                                <span className={styles.detailValue}>
                                  {result.compressionRatio > 0 ? 
                                    formatFileSize(result.originalSize - result.size) : 
                                    '동일'
                                  }
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          if (e.target.files) {
            onDrop(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
        style={{ display: 'none' }}
      />

      <div className={styles.features}>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>🎯</div>
          <h3>스마트 변환</h3>
          <p>각 포맷의 특성에 맞는 최적화된 변환으로 품질과 용량의 완벽한 균형을 제공합니다.</p>
        </div>
        
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>⚡</div>
          <h3>일괄 처리</h3>
          <p>여러 이미지를 동시에 처리하여 시간을 절약하고 일관된 품질을 보장합니다.</p>
        </div>
        
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>🔒</div>
          <h3>안전한 처리</h3>
          <p>모든 변환이 브라우저 내에서 이루어져 개인정보와 이미지가 외부로 전송되지 않습니다.</p>
        </div>
      </div>
    </div>
  );
}
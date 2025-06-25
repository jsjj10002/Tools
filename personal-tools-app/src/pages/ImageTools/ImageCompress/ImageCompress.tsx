import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTaskStore } from '@/stores/taskStore';
import { TaskType, ImageProcessConfig } from '@/types/task';
import ImagePreview from '../components/ImagePreview/ImagePreview';
import QualitySlider from '../components/QualitySlider/QualitySlider';
import OutputPathSelector from '../components/OutputPathSelector/OutputPathSelector';
import styles from './ImageCompress.module.css';

interface ImageFile {
  id: string;
  file: File;
  url: string;
  compressed?: {
    blob: Blob;
    url: string;
    size: number;
    compressionRatio: number;
  };
}

export default function ImageCompress() {
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [quality, setQuality] = useState<number>(75);
  const [outputPath, setOutputPath] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [compressResults, setCompressResults] = useState<Map<string, any>>(new Map());

  const { addTask } = useTaskStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => 
      file.type.startsWith('image/') && 
      ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'].includes(file.type)
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
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.bmp']
    },
    multiple: true
  });

  const compressImage = (imageFile: ImageFile, quality: number): Promise<{ blob: Blob; size: number; compressionRatio: number }> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressionRatio = Math.round((1 - blob.size / imageFile.file.size) * 100);
                resolve({
                  blob,
                  size: blob.size,
                  compressionRatio
                });
              } else {
                reject(new Error('이미지 압축에 실패했습니다.'));
              }
            },
            imageFile.file.type === 'image/png' ? 'image/png' : 'image/jpeg',
            imageFile.file.type === 'image/png' ? undefined : quality / 100
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

  const handleCompress = async () => {
    if (imageFiles.length === 0) {
      alert('압축할 이미지를 선택해주세요.');
      return;
    }

    setIsProcessing(true);

    const taskId = addTask({
      id: crypto.randomUUID(),
      type: 'image-compress' as TaskType,
      title: `이미지 압축 (${imageFiles.length}개 파일)`,
      progress: 0,
      status: 'pending',
      config: {
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
          const { blob, size, compressionRatio } = await compressImage(imageFile, quality);
          const compressedUrl = URL.createObjectURL(blob);
          
          const result = {
            blob,
            url: compressedUrl,
            size,
            compressionRatio,
            originalSize: imageFile.file.size
          };

          results.set(imageFile.id, result);

          // 파일 다운로드
          const link = document.createElement('a');
          link.href = compressedUrl;
          const originalName = imageFile.file.name;
          const baseName = originalName.replace(/\.[^/.]+$/, '');
          const extension = originalName.split('.').pop() || 'jpg';
          link.download = `${baseName}_compressed_q${quality}.${extension}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

        } catch (error) {
          console.error(`이미지 압축 실패 (${imageFile.file.name}):`, error);
        }
      }

      setCompressResults(results);
      useTaskStore.getState().updateTask(taskId, { 
        status: 'completed',
        progress: 100 
      });

      // 완료 후 상태 초기화
      setTimeout(() => {
        resetToInitialState();
      }, 1000);

    } catch (error) {
      console.error('이미지 압축 오류:', error);
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
        if (toRemove.compressed) {
          URL.revokeObjectURL(toRemove.compressed.url);
        }
      }
      return filtered;
    });
    
    // 압축 결과도 제거
    setCompressResults(prev => {
      const newResults = new Map(prev);
      newResults.delete(id);
      return newResults;
    });
  };

  const resetToInitialState = () => {
    // URL 정리
    imageFiles.forEach(img => {
      URL.revokeObjectURL(img.url);
      if (img.compressed) {
        URL.revokeObjectURL(img.compressed.url);
      }
    });
    
    compressResults.forEach(result => {
      URL.revokeObjectURL(result.url);
    });
    
    setImageFiles([]);
    setCompressResults(new Map());
    setQuality(75);
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

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroIcon}>🗜️</div>
        <h1 className={styles.heroTitle}>이미지 압축</h1>
        <p className={styles.heroSubtitle}>
          AI 기반 스마트 압축으로 품질 손실을 최소화하면서 파일 크기를 최적화합니다
        </p>
        <div className={styles.heroStats}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>95%</span>
            <span className={styles.statLabel}>품질 유지</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>70%</span>
            <span className={styles.statLabel}>평균 압축률</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>100%</span>
            <span className={styles.statLabel}>개인정보 보호</span>
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
                    <path d="M20 15V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 10L12 6L16 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 6V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>이미지 파일을 업로드하세요</h3>
                <p>JPG, PNG, WebP, BMP 형식을 지원합니다</p>
                <div className={styles.uploadFeatures}>
                  <span>✨ 일괄 처리</span>
                  <span>🚀 빠른 처리</span>
                  <span>🔒 안전한 로컬 처리</span>
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
                <h3>압축 설정</h3>
                <div className={styles.fileCounter}>
                  <span className={styles.fileCount}>{imageFiles.length}</span>
                  <span>개 파일 선택됨</span>
                </div>
              </div>

              <QualitySlider
                quality={quality}
                onChange={setQuality}
                disabled={isProcessing}
              />

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
                  onClick={handleCompress}
                  disabled={isProcessing}
                >
                  <span>{isProcessing ? '⚙️' : '🗜️'}</span>
                  {isProcessing ? '압축 중...' : `압축 시작 (${imageFiles.length}개)`}
                </button>
              </div>
            </div>

            <div className={styles.previewArea}>
              <div className={styles.previewHeader}>
                <h3>이미지 미리보기</h3>
                <div className={styles.previewControls}>
                  <button className={styles.viewToggle}>
                    <span>⚏</span>
                    그리드
                  </button>
                </div>
              </div>
              
              <div className={styles.imageGrid}>
                {imageFiles.map((imageFile) => {
                  const result = compressResults.get(imageFile.id);
                  
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
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                        
                        {result && (
                          <div className={styles.compressionBadge}>
                            <span className={styles.compressionText}>
                              -{result.compressionRatio}%
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className={styles.imageInfo}>
                        <h4 className={styles.fileName}>{imageFile.file.name}</h4>
                        <div className={styles.fileDetails}>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>크기</span>
                            <span className={styles.detailValue}>{formatFileSize(imageFile.file.size)}</span>
                          </div>
                          {result && (
                            <>
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>압축 후</span>
                                <span className={styles.detailValue}>{formatFileSize(result.size)}</span>
                              </div>
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>절약</span>
                                <span className={styles.detailValue}>
                                  {formatFileSize(result.originalSize - result.size)}
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
            // input 값 초기화로 같은 파일도 다시 선택 가능하게 함
            e.target.value = '';
          }
        }}
        style={{ display: 'none' }}
      />

      <div className={styles.features}>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>🎯</div>
          <h3>정밀한 품질 제어</h3>
          <p>10%부터 95%까지 세밀한 품질 조절로 용도에 맞는 최적의 압축 결과를 얻으세요.</p>
        </div>
        
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>⚡</div>
          <h3>초고속 일괄 처리</h3>
          <p>여러 이미지를 동시에 처리하여 시간을 절약하고 효율적으로 작업하세요.</p>
        </div>
        
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>🛡️</div>
          <h3>완벽한 보안</h3>
          <p>모든 처리가 브라우저 내에서 이루어져 개인정보와 이미지가 외부로 전송되지 않습니다.</p>
        </div>
      </div>
    </div>
  );
} 
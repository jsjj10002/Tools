import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTaskStore } from '@/stores/taskStore';
import { saveAs } from 'file-saver';
import ImagePreview from '../components/ImagePreview/ImagePreview';
import OutputPathSelector from '../components/OutputPathSelector/OutputPathSelector';
import styles from './ImageOptimization.module.css';

interface ImageFile {
  id: string;
  file: File;
  url: string;
  originalSize: number;
  originalDimensions: {
    width: number;
    height: number;
  };
  optimized?: {
    blob: Blob;
    url: string;
    size: number;
    compressionRatio: number;
    format: string;
  };
}

interface OptimizationConfig {
  removeMetadata: boolean;
  targetFormat: 'auto' | 'webp' | 'jpeg' | 'png';
  quality: number; // 0-100
  maxWidth?: number; // 최대 너비 (비율 유지)
  maxHeight?: number; // 최대 높이 (비율 유지)
}

export default function ImageOptimization() {
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [config, setConfig] = useState<OptimizationConfig>({
    removeMetadata: true,
    targetFormat: 'auto',
    quality: 85,
    maxWidth: undefined,
    maxHeight: undefined
  });
  const [outputPath, setOutputPath] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [optimizationResults, setOptimizationResults] = useState<Map<string, any>>(new Map());
  const { addTask, updateTask, updateTaskProgress } = useTaskStore();

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.width,
          height: img.height
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('이미지 크기를 읽을 수 없습니다.'));
      };
      
      img.src = url;
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => 
      file.type.startsWith('image/') && 
      ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif'].includes(file.type)
    );

    const newImageFiles: ImageFile[] = [];
    
    for (const file of validFiles) {
      try {
        const dimensions = await getImageDimensions(file);
        newImageFiles.push({
          id: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
          originalSize: file.size,
          originalDimensions: dimensions
        });
      } catch (error) {
        console.error(`이미지 크기 읽기 실패 (${file.name}):`, error);
      }
    }

    setImageFiles(prev => [...prev, ...newImageFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']
    },
    multiple: true
  });

  // 메타데이터 제거를 위한 Canvas 재렌더링
  const removeMetadata = (imageFile: ImageFile): Promise<Blob> => {
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
          
          // PNG에서 JPG로 변환할 때 배경 처리
          if (imageFile.file.type === 'image/png' && config.targetFormat === 'jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('이미지 처리에 실패했습니다.'));
              }
            },
            imageFile.file.type,
            imageFile.file.type === 'image/png' ? undefined : config.quality / 100
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

  // 이미지 리사이즈 (비율 유지)
  const resizeImage = (blob: Blob, maxWidth?: number, maxHeight?: number): Promise<Blob> => {
    if (!maxWidth && !maxHeight) {
      return Promise.resolve(blob);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        URL.revokeObjectURL(url);
        
        let { width, height } = img;
        
        if (maxWidth && width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        if (maxHeight && height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
        
        if (width === img.width && height === img.height) {
          resolve(blob);
          return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = width;
        canvas.height = height;
        
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (resizedBlob) => {
              if (resizedBlob) {
                resolve(resizedBlob);
              } else {
                reject(new Error('리사이즈에 실패했습니다.'));
              }
            },
            blob.type,
            blob.type === 'image/png' ? undefined : config.quality / 100
          );
        } else {
          reject(new Error('Canvas context를 가져올 수 없습니다.'));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('이미지를 로드할 수 없습니다.'));
      };

      img.src = url;
    });
  };

  // 포맷 변환
  const convertFormat = (blob: Blob, targetFormat: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        URL.revokeObjectURL(url);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // PNG에서 JPG로 변환할 때 배경 처리
          if (targetFormat === 'jpeg' && blob.type === 'image/png') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          
          ctx.drawImage(img, 0, 0);
          
          const mimeTypes: Record<string, string> = {
            'webp': 'image/webp',
            'jpeg': 'image/jpeg',
            'jpg': 'image/jpeg',
            'png': 'image/png'
          };
          
          const mimeType = mimeTypes[targetFormat] || blob.type;
          
          canvas.toBlob(
            (convertedBlob) => {
              if (convertedBlob) {
                resolve(convertedBlob);
              } else {
                reject(new Error('포맷 변환에 실패했습니다.'));
              }
            },
            mimeType,
            mimeType === 'image/png' ? undefined : config.quality / 100
          );
        } else {
          reject(new Error('Canvas context를 가져올 수 없습니다.'));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('이미지를 로드할 수 없습니다.'));
      };

      img.src = url;
    });
  };

  // 자동 포맷 선택 (원본 포맷 기준)
  const getAutoFormat = (originalType: string): string => {
    if (originalType.includes('png')) {
      return 'png'; // 투명도가 필요할 수 있음
    }
    if (originalType.includes('gif')) {
      return 'gif'; // 애니메이션 유지
    }
    return 'webp'; // 기본적으로 WebP 선택 (압축률 최고)
  };

  // 이미지 최적화 처리
  const optimizeImage = async (imageFile: ImageFile): Promise<{ blob: Blob; size: number; format: string }> => {
    let currentBlob: Blob = imageFile.file;

    // 1. 메타데이터 제거
    if (config.removeMetadata) {
      currentBlob = await removeMetadata(imageFile);
    }

    // 2. 리사이즈
    if (config.maxWidth || config.maxHeight) {
      currentBlob = await resizeImage(currentBlob, config.maxWidth, config.maxHeight);
    }

    // 3. 포맷 변환
    const targetFormat = config.targetFormat === 'auto' 
      ? getAutoFormat(imageFile.file.type)
      : config.targetFormat;

    if (targetFormat !== 'auto') {
      currentBlob = await convertFormat(currentBlob, targetFormat);
    }

    return {
      blob: currentBlob,
      size: currentBlob.size,
      format: targetFormat
    };
  };

  const handleOptimize = async () => {
    if (imageFiles.length === 0) return;

    setIsProcessing(true);
    setOptimizationResults(new Map());
    
    const taskId = addTask({
      type: 'image-format-convert',
      status: 'processing',
      progress: 0,
      filename: `${imageFiles.length}개 이미지 최적화`
    });

    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];
        
        updateTaskProgress({ 
          taskId, 
          progress: ((i + 1) / imageFiles.length) * 100 
        });

        try {
          const optimized = await optimizeImage(imageFile);
          const compressionRatio = Math.round((1 - optimized.size / imageFile.originalSize) * 100);
          
          optimizationResults.set(imageFile.id, {
            success: true,
            blob: optimized.blob,
            url: URL.createObjectURL(optimized.blob),
            size: optimized.size,
            format: optimized.format,
            compressionRatio
          });
          
          setOptimizationResults(new Map(optimizationResults));
        } catch (error) {
          optimizationResults.set(imageFile.id, {
            success: false,
            error: error instanceof Error ? error.message : '최적화 실패'
          });
          setOptimizationResults(new Map(optimizationResults));
        }
      }

      updateTask(taskId, {
        status: 'completed',
        progress: 100
      });
    } catch (error) {
      updateTask(taskId, {
        status: 'error',
        error: error instanceof Error ? error.message : '최적화 실패'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = (imageId: string) => {
    const result = optimizationResults.get(imageId);
    if (result && result.success) {
      const imageFile = imageFiles.find(img => img.id === imageId);
      if (imageFile) {
        const nameWithoutExt = imageFile.file.name.replace(/\.[^/.]+$/, '');
        const extension = result.format === 'jpeg' ? 'jpg' : result.format;
        const fileName = `${nameWithoutExt}_optimized.${extension}`;
        saveAs(result.blob, fileName);
      }
    }
  };

  const downloadAllResults = () => {
    optimizationResults.forEach((result, imageId) => {
      if (result.success) {
        downloadResult(imageId);
      }
    });
  };

  const removeImage = (id: string) => {
    setImageFiles(prev => prev.filter(img => img.id !== id));
    setOptimizationResults(prev => {
      const newResults = new Map(prev);
      newResults.delete(id);
      return newResults;
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const hasResults = optimizationResults.size > 0;
  const successCount = Array.from(optimizationResults.values()).filter(r => r.success).length;

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroIcon}>⚡</div>
        <h1 className={styles.heroTitle}>이미지 최적화</h1>
        <p className={styles.heroSubtitle}>
          웹용 이미지 최적화, 메타데이터 제거, 품질 조정을 통한 종합 최적화
        </p>
      </div>

      {/* 파일 업로드 */}
      <div className={styles.content}>
        <div
          {...getRootProps()}
          className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}
        >
          <input {...getInputProps()} />
          <div className={styles.dropzoneIcon}>📸</div>
          <p className={styles.dropzoneText}>
            {isDragActive
              ? '이미지를 여기에 놓으세요'
              : '이미지를 드래그하거나 클릭하여 선택하세요'}
          </p>
          <p className={styles.dropzoneSubtext}>
            JPG, PNG, WebP, BMP, GIF 파일을 지원합니다 (여러 파일 선택 가능)
          </p>
        </div>

        {/* 설정 패널 */}
        {imageFiles.length > 0 && (
          <div className={styles.settingsPanel}>
            <h3 className={styles.settingsTitle}>최적화 설정</h3>
            
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>
                <input
                  type="checkbox"
                  checked={config.removeMetadata}
                  onChange={(e) => setConfig(prev => ({ ...prev, removeMetadata: e.target.checked }))}
                  disabled={isProcessing}
                />
                <span>메타데이터 제거 (EXIF 데이터)</span>
              </label>
              <p className={styles.settingDescription}>
                개인정보 보호를 위해 EXIF 데이터를 제거합니다. 이미지를 Canvas로 재렌더링하여 메타데이터를 완전히 제거합니다.
              </p>
            </div>

            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>
                목표 포맷
              </label>
              <select
                value={config.targetFormat}
                onChange={(e) => setConfig(prev => ({ ...prev, targetFormat: e.target.value as any }))}
                className={styles.formatSelect}
                disabled={isProcessing}
              >
                <option value="auto">자동 선택 (권장)</option>
                <option value="webp">WebP (최고 압축)</option>
                <option value="jpeg">JPEG (호환성)</option>
                <option value="png">PNG (투명도 유지)</option>
              </select>
              <p className={styles.settingDescription}>
                자동 선택 시 원본 포맷에 따라 최적의 포맷을 선택합니다.
              </p>
            </div>

            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>
                품질: {config.quality}%
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={config.quality}
                onChange={(e) => setConfig(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                className={styles.qualitySlider}
                disabled={isProcessing}
              />
              <p className={styles.settingDescription}>
                품질이 낮을수록 파일 크기가 줄어듭니다. 85%가 권장값입니다.
              </p>
            </div>

            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>
                최대 크기 제한 (선택사항)
              </label>
              <div className={styles.sizeInputs}>
                <input
                  type="number"
                  value={config.maxWidth || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxWidth: e.target.value ? parseInt(e.target.value) : undefined }))}
                  placeholder="너비 (px)"
                  className={styles.sizeInput}
                  disabled={isProcessing}
                  min="1"
                />
                <span>×</span>
                <input
                  type="number"
                  value={config.maxHeight || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxHeight: e.target.value ? parseInt(e.target.value) : undefined }))}
                  placeholder="높이 (px)"
                  className={styles.sizeInput}
                  disabled={isProcessing}
                  min="1"
                />
              </div>
              <p className={styles.settingDescription}>
                비율을 유지하면서 크기를 제한합니다. 비워두면 크기 제한 없음.
              </p>
            </div>

            <OutputPathSelector
              value={outputPath}
              onChange={setOutputPath}
              placeholder="출력 경로 (선택사항)"
            />
          </div>
        )}

        {/* 이미지 목록 */}
        {imageFiles.length > 0 && (
          <div className={styles.imageGrid}>
            {imageFiles.map((imageFile) => {
              const result = optimizationResults.get(imageFile.id);
              return (
                <div key={imageFile.id} className={styles.imageCard}>
                  <ImagePreview
                    src={result?.success ? result.url : imageFile.url}
                    alt={imageFile.file.name}
                  />
                  <div className={styles.imageInfo}>
                    <div className={styles.fileName}>{imageFile.file.name}</div>
                    <div className={styles.fileStats}>
                      <div>
                        <span className={styles.statLabel}>원본:</span>{' '}
                        {formatFileSize(imageFile.originalSize)} |{' '}
                        {imageFile.originalDimensions.width} × {imageFile.originalDimensions.height}
                      </div>
                      {result?.success && (
                        <div className={styles.optimizedStats}>
                          <span className={styles.statLabel}>최적화:</span>{' '}
                          {formatFileSize(result.size)} |{' '}
                          {result.compressionRatio > 0 ? (
                            <span className={styles.compressionRatio}>
                              ↓ {result.compressionRatio}%
                            </span>
                          ) : (
                            <span className={styles.compressionRatioNegative}>
                              ↑ {Math.abs(result.compressionRatio)}%
                            </span>
                          )}
                          {' '}| {result.format.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className={styles.imageActions}>
                      {result?.success && (
                        <button
                          onClick={() => downloadResult(imageFile.id)}
                          className={styles.downloadButton}
                        >
                          다운로드
                        </button>
                      )}
                      <button
                        onClick={() => removeImage(imageFile.id)}
                        className={styles.removeButton}
                        disabled={isProcessing}
                      >
                        제거
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 처리 버튼 */}
        {imageFiles.length > 0 && (
          <button
            onClick={handleOptimize}
            disabled={isProcessing}
            className={styles.processButton}
          >
            {isProcessing
              ? '최적화 중...'
              : `${imageFiles.length}개 이미지 최적화하기`}
          </button>
        )}

        {/* 결과 요약 */}
        {hasResults && (
          <div className={styles.resultsSummary}>
            <h3>최적화 결과</h3>
            <div className={styles.summaryStats}>
              <div className={styles.summaryStat}>
                <span className={styles.summaryLabel}>성공:</span>
                <span className={styles.summaryValue}>{successCount}개</span>
              </div>
              <div className={styles.summaryStat}>
                <span className={styles.summaryLabel}>실패:</span>
                <span className={styles.summaryValue}>{optimizationResults.size - successCount}개</span>
              </div>
            </div>
            {successCount > 0 && (
              <button onClick={downloadAllResults} className={styles.downloadAllButton}>
                모든 결과 다운로드 ({successCount}개)
              </button>
            )}
          </div>
        )}
      </div>

      {/* 정보 섹션 */}
      <div className={styles.info}>
        <div className={styles.infoCard}>
          <h3>🔒 개인정보 보호</h3>
          <p>메타데이터 제거를 통해 EXIF 데이터(위치, 카메라 정보 등)를 완전히 제거합니다.</p>
        </div>
        <div className={styles.infoCard}>
          <h3>⚡ 웹 최적화</h3>
          <p>WebP 포맷과 압축을 통해 웹 페이지 로딩 속도를 크게 향상시킵니다.</p>
        </div>
        <div className={styles.infoCard}>
          <h3>📐 스마트 리사이즈</h3>
          <p>비율을 유지하면서 크기를 제한하여 모바일 환경에 최적화된 이미지를 생성합니다.</p>
        </div>
      </div>
    </div>
  );
}

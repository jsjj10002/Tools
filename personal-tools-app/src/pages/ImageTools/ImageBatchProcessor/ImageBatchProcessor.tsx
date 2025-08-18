import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import ImagePreview from '../components/ImagePreview/ImagePreview';
import QualitySlider from '../components/QualitySlider/QualitySlider';
import OutputPathSelector from '../components/OutputPathSelector/OutputPathSelector';
import styles from './ImageBatchProcessor.module.css';

interface ImageFile {
  id: string;
  file: File;
  url: string;
  originalDimensions: {
    width: number;
    height: number;
  };
  processed?: {
    blob: Blob;
    url: string;
    size: number;
  };
}

interface BatchOperation {
  compress: boolean;
  resize: boolean;
  convert: boolean;
  compressQuality: number;
  resizeWidth: number;
  resizeHeight: number;
  maintainAspectRatio: boolean;
  targetFormat: 'jpg' | 'png' | 'webp' | 'bmp';
}

export default function ImageBatchProcessor() {
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [outputPath, setOutputPath] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processResults, setProcessResults] = useState<Map<string, any>>(new Map());
  
  const [batchOps, setBatchOps] = useState<BatchOperation>({
    compress: false,
    resize: false,
    convert: false,
    compressQuality: 70,
    resizeWidth: 800,
    resizeHeight: 600,
    maintainAspectRatio: true,
    targetFormat: 'jpg'
  });

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

  const onDrop = async (acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => 
      file.type.startsWith('image/') && 
      ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'].includes(file.type)
    );

    const newImageFiles: ImageFile[] = [];
    
    for (const file of validFiles) {
      try {
        const dimensions = await getImageDimensions(file);
        newImageFiles.push({
          id: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
          originalDimensions: dimensions
        });
      } catch (error) {
        console.error(`이미지 크기 읽기 실패 (${file.name}):`, error);
      }
    }

    setImageFiles(prev => [...prev, ...newImageFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.bmp']
    },
    multiple: true
  });

  const processImage = async (imageFile: ImageFile, operations: BatchOperation): Promise<{ blob: Blob; size: number }> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        let { width, height } = imageFile.originalDimensions;
        
        // 리사이즈 처리
        if (operations.resize) {
          if (operations.maintainAspectRatio) {
            const aspectRatio = width / height;
            if (operations.resizeWidth / operations.resizeHeight > aspectRatio) {
              width = Math.round(operations.resizeHeight * aspectRatio);
              height = operations.resizeHeight;
            } else {
              width = operations.resizeWidth;
              height = Math.round(operations.resizeWidth / aspectRatio);
            }
          } else {
            width = operations.resizeWidth;
            height = operations.resizeHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        
        if (ctx) {
          // 고품질 설정
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // JPG 변환시 배경 처리
          if (operations.convert && operations.targetFormat === 'jpg' && 
              (imageFile.file.type === 'image/png' || imageFile.file.type === 'image/gif')) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // 포맷 및 품질 설정
          let mimeType = imageFile.file.type;
          let quality = 0.9;
          
          if (operations.convert) {
            const formatMimeTypes = {
              jpg: 'image/jpeg',
              png: 'image/png',
              webp: 'image/webp',
              bmp: 'image/bmp'
            };
            mimeType = formatMimeTypes[operations.targetFormat];
          }
          
          if (operations.compress && mimeType !== 'image/png') {
            quality = operations.compressQuality / 100;
          }
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({
                  blob,
                  size: blob.size
                });
              } else {
                reject(new Error('이미지 처리에 실패했습니다.'));
              }
            },
            mimeType,
            mimeType === 'image/png' ? undefined : quality
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

  const processBatch = async () => {
    if (imageFiles.length === 0) return;
    
    setIsProcessing(true);
    setProcessResults(new Map());
    
    const results = new Map();
    
    for (const imageFile of imageFiles) {
      try {
        const processed = await processImage(imageFile, batchOps);
        results.set(imageFile.id, {
          success: true,
          blob: processed.blob,
          url: URL.createObjectURL(processed.blob),
          originalSize: imageFile.file.size,
          processedSize: processed.size,
          filename: generateFilename(imageFile.file.name, batchOps)
        });
      } catch (error) {
        results.set(imageFile.id, {
          success: false,
          error: error instanceof Error ? error.message : '처리 실패'
        });
      }
    }
    
    setProcessResults(results);
    setIsProcessing(false);
  };

  const generateFilename = (originalName: string, operations: BatchOperation): string => {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    let suffix = '';
    
    if (operations.compress) suffix += `_q${operations.compressQuality}`;
    if (operations.resize) suffix += `_${operations.resizeWidth}x${operations.resizeHeight}`;
    
    let extension = originalName.split('.').pop() || 'jpg';
    if (operations.convert) {
      extension = operations.targetFormat === 'jpg' ? 'jpg' : operations.targetFormat;
    }
    
    return `${nameWithoutExt}${suffix}.${extension}`;
  };

  const downloadResult = (imageId: string) => {
    const result = processResults.get(imageId);
    if (result && result.success) {
      const link = document.createElement('a');
      link.href = result.url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const downloadAllResults = () => {
    processResults.forEach((result, imageId) => {
      if (result.success) {
        downloadResult(imageId);
      }
    });
  };

  const removeImage = (imageId: string) => {
    setImageFiles(prev => prev.filter(img => img.id !== imageId));
    setProcessResults(prev => {
      const newResults = new Map(prev);
      newResults.delete(imageId);
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

  const updateBatchOps = (updates: Partial<BatchOperation>) => {
    setBatchOps(prev => ({ ...prev, ...updates }));
  };

  const toggleAspectRatio = () => {
    updateBatchOps({ maintainAspectRatio: !batchOps.maintainAspectRatio });
  };

  const hasAnyOperations = batchOps.compress || batchOps.resize || batchOps.convert;
  const hasResults = processResults.size > 0;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>이미지 일괄 처리</h1>
      <p className={styles.subtitle}>
        여러 이미지를 한 번에 압축, 리사이즈, 포맷 변환할 수 있습니다.
      </p>

      {/* 파일 드롭존 */}
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
          JPG, PNG, WebP, BMP 파일을 지원합니다 (여러 파일 선택 가능)
        </p>
      </div>

      {/* 일괄 작업 설정 */}
      {imageFiles.length > 0 && (
        <div className={styles.settingsPanel}>
          <h3 className={styles.settingsTitle}>일괄 작업 설정</h3>
          
          <div className={styles.operationGrid}>
            {/* 압축 설정 */}
            <div className={styles.operationCard}>
              <div className={styles.operationHeader}>
                <span className={styles.operationTitle}>이미지 압축</span>
                <label className={styles.operationToggle}>
                  <input
                    type="checkbox"
                    checked={batchOps.compress}
                    onChange={(e) => updateBatchOps({ compress: e.target.checked })}
                  />
                </label>
              </div>
              {batchOps.compress && (
                <div className={styles.operationContent}>
                  <QualitySlider
                    quality={batchOps.compressQuality}
                    onChange={(quality) => updateBatchOps({ compressQuality: quality })}
                  />
                </div>
              )}
            </div>

            {/* 리사이즈 설정 */}
            <div className={styles.operationCard}>
              <div className={styles.operationHeader}>
                <span className={styles.operationTitle}>이미지 리사이즈</span>
                <label className={styles.operationToggle}>
                  <input
                    type="checkbox"
                    checked={batchOps.resize}
                    onChange={(e) => updateBatchOps({ resize: e.target.checked })}
                  />
                </label>
              </div>
              {batchOps.resize && (
                <div className={styles.operationContent}>
                  <div className={styles.dimensionInputs}>
                    <input
                      type="number"
                      value={batchOps.resizeWidth}
                      onChange={(e) => updateBatchOps({ resizeWidth: parseInt(e.target.value) || 0 })}
                      placeholder="너비"
                      className={styles.dimensionInput}
                      min="1"
                    />
                    <span>×</span>
                    <input
                      type="number"
                      value={batchOps.resizeHeight}
                      onChange={(e) => updateBatchOps({ resizeHeight: parseInt(e.target.value) || 0 })}
                      placeholder="높이"
                      className={styles.dimensionInput}
                      min="1"
                    />
                  </div>
                  <div className={styles.aspectRatioToggle}>
                    <span
                      className={styles.aspectRatioIcon}
                      onClick={toggleAspectRatio}
                      title={batchOps.maintainAspectRatio ? '비율 고정' : '비율 자유'}
                    >
                      {batchOps.maintainAspectRatio ? '🔗' : '🔓'}
                    </span>
                    <span>종횡비 {batchOps.maintainAspectRatio ? '유지' : '무시'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 포맷 변환 설정 */}
            <div className={styles.operationCard}>
              <div className={styles.operationHeader}>
                <span className={styles.operationTitle}>포맷 변환</span>
                <label className={styles.operationToggle}>
                  <input
                    type="checkbox"
                    checked={batchOps.convert}
                    onChange={(e) => updateBatchOps({ convert: e.target.checked })}
                  />
                </label>
              </div>
              {batchOps.convert && (
                <div className={styles.operationContent}>
                  <select
                    value={batchOps.targetFormat}
                    onChange={(e) => updateBatchOps({ targetFormat: e.target.value as 'jpg' | 'png' | 'webp' | 'bmp' })}
                    className={styles.formatSelect}
                  >
                    <option value="jpg">JPG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WebP</option>
                    <option value="bmp">BMP</option>
                  </select>
                </div>
              )}
            </div>
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
          {imageFiles.map((imageFile) => (
            <div key={imageFile.id} className={styles.imageCard}>
              <ImagePreview
                src={imageFile.url}
                alt={imageFile.file.name}
              />
              <div className={styles.imageInfo}>
                <div><strong>{imageFile.file.name}</strong></div>
                <div>
                  {imageFile.originalDimensions.width} × {imageFile.originalDimensions.height} |{' '}
                  {formatFileSize(imageFile.file.size)}
                </div>
                <button
                  onClick={() => removeImage(imageFile.id)}
                  className={styles.removeButton}
                >
                  제거
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 처리 버튼 */}
      {imageFiles.length > 0 && (
        <button
          onClick={processBatch}
          disabled={isProcessing || !hasAnyOperations}
          className={styles.processButton}
        >
          {isProcessing ? '처리 중...' : `${imageFiles.length}개 이미지 일괄 처리`}
          {!hasAnyOperations && ' (작업을 선택하세요)'}
        </button>
      )}

      {/* 처리 결과 */}
      {hasResults && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>처리 결과</h3>
            <button onClick={downloadAllResults} className={styles.downloadButton}>
              모든 결과 다운로드
            </button>
          </div>
          
          <div className={styles.resultsGrid}>
            {Array.from(processResults.entries()).map(([imageId, result]) => {
              const imageFile = imageFiles.find(img => img.id === imageId);
              if (!imageFile) return null;

              return (
                <div key={imageId} className={styles.resultCard}>
                  <div className={styles.resultHeader}>
                    <span>{imageFile.file.name}</span>
                    {result.success && (
                      <button
                        onClick={() => downloadResult(imageId)}
                        className={styles.downloadButton}
                      >
                        다운로드
                      </button>
                    )}
                  </div>

                  {result.success ? (
                    <>
                      <ImagePreview
                        src={result.url}
                        alt={`처리된 ${imageFile.file.name}`}
                      />
                      <div className={styles.resultStats}>
                        <div className={styles.statItem}>
                          <div className={styles.statLabel}>원본 크기</div>
                          <div className={styles.statValue}>{formatFileSize(result.originalSize)}</div>
                        </div>
                        <div className={styles.statItem}>
                          <div className={styles.statLabel}>처리 후 크기</div>
                          <div className={styles.statValue}>{formatFileSize(result.processedSize)}</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#ef4444', textAlign: 'center', padding: '2rem' }}>
                      처리 실패: {result.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
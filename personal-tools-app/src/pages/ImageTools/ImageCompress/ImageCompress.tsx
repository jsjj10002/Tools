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
  const [quality, setQuality] = useState<number>(70);
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
    setQuality(70);
    setOutputPath('');
  };

  const handleAddMoreFiles = () => {
    fileInputRef.current?.click();
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
      <div className={styles.header}>
        <h1>🗜️ 이미지 압축</h1>
        <p>이미지 품질을 조절하여 파일 크기를 최적화합니다. 미리보기를 통해 결과를 확인하고 일괄 다운로드가 가능합니다.</p>
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
                <div className={styles.dropzoneIcon}>🖼️</div>
                <h3>이미지 파일을 여기에 드래그하거나 클릭하여 선택</h3>
                <p>JPG, PNG, WebP, BMP 형식 지원 (여러 파일 선택 가능)</p>
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
        ) : (
          <>
            <div className={styles.controls}>
              <div className={styles.settingsPanel}>
                <h3>압축 설정</h3>
                <QualitySlider
                  quality={quality}
                  onChange={setQuality}
                />
                <OutputPathSelector
                  value={outputPath}
                  onChange={setOutputPath}
                  placeholder="다운로드 폴더 (기본값)"
                />
              </div>

              <div className={styles.actions}>
                <button
                  onClick={handleAddMoreFiles}
                  className={styles.addMoreButton}
                  disabled={isProcessing}
                >
                  ➕ 파일 추가
                </button>
                
                <button
                  onClick={resetToInitialState}
                  className={styles.clearButton}
                  disabled={isProcessing}
                >
                  🗑️ 모두 지우기
                </button>
                
                <button
                  className={styles.processButton}
                  onClick={handleCompress}
                  disabled={isProcessing}
                >
                  {isProcessing ? '압축 중...' : `압축하기 (${imageFiles.length}개)`}
                </button>
              </div>
            </div>

            <div className={styles.previewSection}>
              <h3>이미지 미리보기</h3>
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
                          ✕
                        </button>
                      </div>
                      
                      <div className={styles.imageInfo}>
                        <h4 className={styles.fileName}>{imageFile.file.name}</h4>
                        <div className={styles.fileDetails}>
                          <span>크기: {formatFileSize(imageFile.file.size)}</span>
                          {result && (
                            <div className={styles.compressionInfo}>
                              <span className={styles.newSize}>
                                압축 후: {formatFileSize(result.size)}
                              </span>
                              <span className={styles.compressionRatio}>
                                {result.compressionRatio > 0 ? 
                                  `${result.compressionRatio}% 감소` : 
                                  '크기 변화 없음'
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
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
          }
        }}
        style={{ display: 'none' }}
      />

      <div className={styles.info}>
        <div className={styles.infoCard}>
          <h3>🎯 품질 가이드</h3>
          <ul>
            <li><strong>80%:</strong> 고품질 - 거의 원본과 동일한 품질</li>
            <li><strong>70%:</strong> 권장 - 품질과 용량의 균형</li>
            <li><strong>50%:</strong> 웹용 - 빠른 로딩을 위한 최적화</li>
            <li><strong>30%:</strong> 저용량 - 저장공간 절약용</li>
          </ul>
        </div>
        
        <div className={styles.infoCard}>
          <h3>📊 포맷별 특징</h3>
          <ul>
            <li><strong>JPEG:</strong> 품질 조절 가능, 사진에 최적화</li>
            <li><strong>PNG:</strong> 무손실 압축, 투명도 유지</li>
            <li><strong>WebP:</strong> 최신 형식, 우수한 압축률</li>
            <li><strong>BMP:</strong> 압축 효과 제한적</li>
          </ul>
        </div>
        
        <div className={styles.infoCard}>
          <h3>🛡️ 개인정보 보호</h3>
          <p>모든 이미지 압축은 브라우저 내에서만 수행되며, 이미지가 외부로 전송되지 않습니다.</p>
        </div>
      </div>
    </div>
  );
} 
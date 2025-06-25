import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTaskStore } from '@/stores/taskStore';
import { TaskType, ImageProcessConfig } from '@/types/task';
import ImagePreview from '../components/ImagePreview/ImagePreview';
import OutputPathSelector from '../components/OutputPathSelector/OutputPathSelector';
import styles from './ImageResize.module.css';

interface ImageFile {
  id: string;
  file: File;
  url: string;
  dimensions: {
    width: number;
    height: number;
  };
}

interface ResizeConfig {
  width: number;
  height: number;
  maintainAspectRatio: boolean;
}

export default function ImageResize() {
  const [imageFile, setImageFile] = useState<ImageFile | null>(null);
  const [resizeConfig, setResizeConfig] = useState<ResizeConfig>({
    width: 1920,
    height: 1080,
    maintainAspectRatio: true
  });
  const [outputPath, setOutputPath] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const { addTask } = useTaskStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]; // 첫 번째 파일만 선택
    if (!file || !file.type.startsWith('image/')) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      const newImageFile: ImageFile = {
        id: crypto.randomUUID(),
        file,
        url,
        dimensions: {
          width: img.width,
          height: img.height
        }
      };
      
      setImageFile(newImageFile);
      
      // 기본값을 원본 이미지 크기로 설정
      setResizeConfig(prev => ({
        ...prev,
        width: img.width,
        height: img.height
      }));
    };
    
    img.src = url;
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']
    },
    multiple: false
  });

  const handleDimensionChange = (dimension: 'width' | 'height', value: number) => {
    if (!imageFile) return;

    setResizeConfig(prev => {
      const newConfig = { ...prev };
      
      if (dimension === 'width') {
        newConfig.width = value;
        if (prev.maintainAspectRatio) {
          const aspectRatio = imageFile.dimensions.height / imageFile.dimensions.width;
          newConfig.height = Math.round(value * aspectRatio);
        }
      } else {
        newConfig.height = value;
        if (prev.maintainAspectRatio) {
          const aspectRatio = imageFile.dimensions.width / imageFile.dimensions.height;
          newConfig.width = Math.round(value * aspectRatio);
        }
      }
      
      return newConfig;
    });
  };

  const toggleAspectRatio = () => {
    setResizeConfig(prev => {
      const newConfig = { ...prev, maintainAspectRatio: !prev.maintainAspectRatio };
      
      // 비율 유지가 활성화될 때 높이를 너비에 맞춰 조정
      if (newConfig.maintainAspectRatio && imageFile) {
        const aspectRatio = imageFile.dimensions.height / imageFile.dimensions.width;
        newConfig.height = Math.round(newConfig.width * aspectRatio);
      }
      
      return newConfig;
    });
  };

  const applyPreset = (width: number, height: number) => {
    setResizeConfig(prev => ({
      ...prev,
      width,
      height,
      maintainAspectRatio: false
    }));
  };

  const resizeImage = (imageFile: ImageFile, config: ResizeConfig): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = config.width;
        canvas.height = config.height;
        
        if (ctx) {
          // 고품질 리샘플링 설정
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, config.width, config.height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('이미지 리사이즈에 실패했습니다.'));
              }
            },
            imageFile.file.type,
            0.95
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

  const handleResize = async () => {
    if (!imageFile) {
      alert('리사이즈할 이미지를 선택해주세요.');
      return;
    }

    setIsProcessing(true);

    const taskId = addTask({
      id: crypto.randomUUID(),
      type: 'image-resize' as TaskType,
      title: `이미지 리사이즈: ${imageFile.file.name}`,
      progress: 0,
      status: 'pending',
      config: {
        ...resizeConfig,
        outputPath: outputPath || '다운로드'
      } as ImageProcessConfig
    });

    try {
      useTaskStore.getState().updateTask(taskId, { progress: 50, status: 'processing' });

      const resizedBlob = await resizeImage(imageFile, resizeConfig);
      
      // 파일 다운로드
      const link = document.createElement('a');
      link.href = URL.createObjectURL(resizedBlob);
      const originalName = imageFile.file.name;
      const baseName = originalName.replace(/\.[^/.]+$/, '');
      const extension = originalName.split('.').pop() || 'jpg';
      link.download = `${baseName}_resized_${resizeConfig.width}x${resizeConfig.height}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      useTaskStore.getState().updateTask(taskId, { 
        status: 'completed',
        progress: 100 
      });

      // 완료 후 상태 초기화
      setTimeout(() => {
        resetToInitialState();
      }, 1000);

    } catch (error) {
      console.error('이미지 리사이즈 오류:', error);
      useTaskStore.getState().updateTask(taskId, { 
        status: 'failed',
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetToInitialState = () => {
    if (imageFile) {
      URL.revokeObjectURL(imageFile.url);
    }
    
    setImageFile(null);
    setResizeConfig({
      width: 1920,
      height: 1080,
      maintainAspectRatio: true
    });
    setOutputPath('');
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
        <h1>📐 이미지 리사이즈</h1>
        <p>이미지 크기를 원하는 해상도로 조정합니다. 비율 유지 옵션과 다양한 프리셋을 제공합니다.</p>
      </div>

      <div className={styles.content}>
        {!imageFile ? (
          <div className={styles.uploadSection}>
            <div
              {...getRootProps()}
              className={`${styles.dropzone} ${isDragActive ? styles.dragActive : ''}`}
            >
              <input {...getInputProps()} />
              <div className={styles.dropzoneContent}>
                <div className={styles.dropzoneIcon}>🖼️</div>
                <h3>이미지 파일을 여기에 드래그하거나 클릭하여 선택</h3>
                <p>JPG, PNG, WebP, BMP, GIF 형식 지원 (1개 파일만 선택)</p>
              </div>
            </div>

            <button
              className={styles.fileSelectButton}
              onClick={() => fileInputRef.current?.click()}
            >
              파일 선택
            </button>
          </div>
        ) : (
          <>
            <div className={styles.imageSection}>
              <div className={styles.imageCard}>
                <div className={styles.imagePreviewContainer}>
                  <ImagePreview
                    src={imageFile.url}
                    alt={imageFile.file.name}
                    className={styles.imagePreview}
                  />
                  <button
                    className={styles.removeButton}
                    onClick={resetToInitialState}
                    disabled={isProcessing}
                    title="이미지 제거"
                  >
                    ✕
                  </button>
                </div>
                
                <div className={styles.imageInfo}>
                  <h4 className={styles.fileName}>{imageFile.file.name}</h4>
                  <div className={styles.fileDetails}>
                    <span>원본 크기: {imageFile.dimensions.width} × {imageFile.dimensions.height}</span>
                    <span>파일 크기: {formatFileSize(imageFile.file.size)}</span>
                    <span>변경 후: {resizeConfig.width} × {resizeConfig.height}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.controls}>
              <div className={styles.settingsPanel}>
                <h3>리사이즈 설정</h3>
                
                <div className={styles.dimensionControls}>
                  <div className={styles.dimensionGroup}>
                    <label htmlFor="width">너비 (px)</label>
                    <input
                      id="width"
                      type="number"
                      min="1"
                      max="10000"
                      value={resizeConfig.width}
                      onChange={(e) => handleDimensionChange('width', parseInt(e.target.value) || 1)}
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <button
                    className={styles.aspectRatioButton}
                    onClick={toggleAspectRatio}
                    disabled={isProcessing}
                    title={resizeConfig.maintainAspectRatio ? '비율 유지 중' : '비율 고정 해제'}
                  >
                    {resizeConfig.maintainAspectRatio ? '🔗' : '🔓'}
                  </button>
                  
                  <div className={styles.dimensionGroup}>
                    <label htmlFor="height">높이 (px)</label>
                    <input
                      id="height"
                      type="number"
                      min="1"
                      max="10000"
                      value={resizeConfig.height}
                      onChange={(e) => handleDimensionChange('height', parseInt(e.target.value) || 1)}
                      disabled={isProcessing || resizeConfig.maintainAspectRatio}
                    />
                  </div>
                </div>

                <div className={styles.presets}>
                  <h4>프리셋</h4>
                  <div className={styles.presetButtons}>
                    <button onClick={() => applyPreset(1920, 1080)} disabled={isProcessing}>
                      1920×1080 (FHD)
                    </button>
                    <button onClick={() => applyPreset(1280, 720)} disabled={isProcessing}>
                      1280×720 (HD)
                    </button>
                    <button onClick={() => applyPreset(800, 600)} disabled={isProcessing}>
                      800×600
                    </button>
                    <button onClick={() => applyPreset(400, 300)} disabled={isProcessing}>
                      400×300
                    </button>
                  </div>
                </div>

                <OutputPathSelector
                  value={outputPath}
                  onChange={setOutputPath}
                  placeholder="다운로드 폴더 (기본값)"
                />
              </div>

              <div className={styles.actions}>
                <button
                  onClick={resetToInitialState}
                  className={styles.clearButton}
                  disabled={isProcessing}
                >
                  🗑️ 다시 선택
                </button>
                
                <button
                  className={styles.processButton}
                  onClick={handleResize}
                  disabled={isProcessing}
                >
                  {isProcessing ? '리사이즈 중...' : '리사이즈 실행'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            onDrop([e.target.files[0]]);
          }
        }}
        style={{ display: 'none' }}
      />

      <div className={styles.info}>
        <div className={styles.infoCard}>
          <h3>🎯 리사이즈 가이드</h3>
          <ul>
            <li><strong>비율 유지:</strong> 원본 이미지 비율을 보존하여 왜곡 방지</li>
            <li><strong>고품질 리샘플링:</strong> 부드러운 크기 조정으로 품질 최대화</li>
            <li><strong>프리셋 활용:</strong> 일반적인 해상도로 빠른 설정</li>
            <li><strong>범위:</strong> 1px ~ 10,000px까지 지원</li>
          </ul>
        </div>
        
        <div className={styles.infoCard}>
          <h3>📊 해상도 가이드</h3>
          <ul>
            <li><strong>1920×1080:</strong> Full HD, 모니터/TV 표준</li>
            <li><strong>1280×720:</strong> HD, 웹 동영상 표준</li>
            <li><strong>800×600:</strong> 웹 이미지, 블로그용</li>
            <li><strong>400×300:</strong> 썸네일, 아이콘용</li>
          </ul>
        </div>
        
        <div className={styles.infoCard}>
          <h3>🛡️ 개인정보 보호</h3>
          <p>모든 이미지 처리는 브라우저 내에서만 수행되며, 이미지가 외부로 전송되지 않습니다.</p>
        </div>
      </div>
    </div>
  );
}
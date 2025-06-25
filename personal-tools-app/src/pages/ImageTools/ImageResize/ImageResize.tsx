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

const PRESET_SIZES = [
  { name: 'Full HD', width: 1920, height: 1080, icon: '🖥️' },
  { name: 'HD Ready', width: 1280, height: 720, icon: '📺' },
  { name: 'Social Media', width: 1080, height: 1080, icon: '📱' },
  { name: 'Web Standard', width: 800, height: 600, icon: '🌐' },
  { name: 'Thumbnail', width: 400, height: 300, icon: '🖼️' },
  { name: 'Icon', width: 256, height: 256, icon: '🔳' },
];

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
    const file = acceptedFiles[0];
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

  const calculateScale = () => {
    if (!imageFile) return { scale: 1, type: 'same' };
    
    const original = imageFile.dimensions.width * imageFile.dimensions.height;
    const target = resizeConfig.width * resizeConfig.height;
    const scale = target / original;
    
    if (scale > 1.1) return { scale, type: 'upscale' };
    if (scale < 0.9) return { scale, type: 'downscale' };
    return { scale, type: 'same' };
  };

  const scaleInfo = calculateScale();

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroIcon}>📐</div>
        <h1 className={styles.heroTitle}>이미지 리사이즈</h1>
        <p className={styles.heroSubtitle}>
          정밀한 크기 조절로 완벽한 해상도를 얻으세요. 비율 유지와 고품질 리샘플링을 지원합니다.
        </p>
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
                <div className={styles.uploadIcon}>
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M12 3V16M12 3L16 7M12 3L8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>이미지를 업로드하세요</h3>
                <p>JPG, PNG, WebP, BMP, GIF 형식을 지원합니다</p>
                <div className={styles.uploadFeatures}>
                  <span>🎯 정밀한 크기 조절</span>
                  <span>📐 비율 유지 옵션</span>
                  <span>🚀 고품질 리샘플링</span>
                </div>
              </div>
            </div>

            <button
              className={styles.primaryButton}
              onClick={() => fileInputRef.current?.click()}
            >
              <span>📂</span>
              파일 선택
            </button>
          </div>
        ) : (
          <div className={styles.editingArea}>
            <div className={styles.imageSection}>
              <div className={styles.imageCard}>
                <div className={styles.imageHeader}>
                  <h3>선택된 이미지</h3>
                  <button
                    className={styles.resetButton}
                    onClick={resetToInitialState}
                    disabled={isProcessing}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                </div>
                
                <div className={styles.imagePreviewContainer}>
                  <ImagePreview
                    src={imageFile.url}
                    alt={imageFile.file.name}
                    className={styles.imagePreview}
                  />
                  
                  <div className={styles.imageBadges}>
                    <div className={styles.dimensionBadge}>
                      {imageFile.dimensions.width} × {imageFile.dimensions.height}
                    </div>
                    <div className={styles.sizeBadge}>
                      {formatFileSize(imageFile.file.size)}
                    </div>
                  </div>
                </div>
                
                <div className={styles.imageInfo}>
                  <h4 className={styles.fileName}>{imageFile.file.name}</h4>
                  <div className={styles.imageStats}>
                    <div className={styles.stat}>
                      <span className={styles.statLabel}>포맷</span>
                      <span className={styles.statValue}>{imageFile.file.type.split('/')[1].toUpperCase()}</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statLabel}>비율</span>
                      <span className={styles.statValue}>
                        {(imageFile.dimensions.width / imageFile.dimensions.height).toFixed(2)}:1
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.controlsSection}>
              <div className={styles.controlPanel}>
                <div className={styles.panelHeader}>
                  <h3>크기 설정</h3>
                  <div className={styles.scaleIndicator}>
                    <span className={`${styles.scaleIcon} ${styles[scaleInfo.type]}`}>
                      {scaleInfo.type === 'upscale' ? '⬆️' : scaleInfo.type === 'downscale' ? '⬇️' : '🔄'}
                    </span>
                    <span className={styles.scaleText}>
                      {scaleInfo.type === 'upscale' ? `${(scaleInfo.scale * 100).toFixed(0)}% 확대` :
                       scaleInfo.type === 'downscale' ? `${(scaleInfo.scale * 100).toFixed(0)}% 축소` :
                       '동일 크기'}
                    </span>
                  </div>
                </div>
                
                <div className={styles.dimensionControls}>
                  <div className={styles.dimensionRow}>
                    <div className={styles.inputGroup}>
                      <label htmlFor="width">너비 (px)</label>
                      <input
                        id="width"
                        type="number"
                        min="1"
                        max="10000"
                        value={resizeConfig.width}
                        onChange={(e) => handleDimensionChange('width', parseInt(e.target.value) || 1)}
                        disabled={isProcessing}
                        className={styles.dimensionInput}
                      />
                    </div>
                    
                    <button
                      className={`${styles.aspectRatioButton} ${resizeConfig.maintainAspectRatio ? styles.active : ''}`}
                      onClick={toggleAspectRatio}
                      disabled={isProcessing}
                      title={resizeConfig.maintainAspectRatio ? '비율 유지 중 (클릭하여 해제)' : '비율 고정 해제 (클릭하여 유지)'}
                    >
                      {resizeConfig.maintainAspectRatio ? 
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 2V5M16 2V5M3.5 9H20.5M8 19H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M3 7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z" stroke="currentColor" strokeWidth="2"/>
                        </svg> :
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 12L8 8M8 8H11M8 8V11M12 12L16 16M16 16H13M16 16V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M3 7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      }
                    </button>
                    
                    <div className={styles.inputGroup}>
                      <label htmlFor="height">높이 (px)</label>
                      <input
                        id="height"
                        type="number"
                        min="1"
                        max="10000"
                        value={resizeConfig.height}
                        onChange={(e) => handleDimensionChange('height', parseInt(e.target.value) || 1)}
                        disabled={isProcessing || resizeConfig.maintainAspectRatio}
                        className={styles.dimensionInput}
                      />
                    </div>
                  </div>
                  
                  <div className={styles.dimensionInfo}>
                    <div className={styles.dimensionDetail}>
                      <span>결과 크기: {resizeConfig.width} × {resizeConfig.height}</span>
                      <span>예상 용량: {formatFileSize(imageFile.file.size * scaleInfo.scale)}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.presets}>
                  <h4>빠른 프리셋</h4>
                  <div className={styles.presetGrid}>
                    {PRESET_SIZES.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(preset.width, preset.height)}
                        disabled={isProcessing}
                        className={styles.presetButton}
                      >
                        <span className={styles.presetIcon}>{preset.icon}</span>
                        <div className={styles.presetInfo}>
                          <span className={styles.presetName}>{preset.name}</span>
                          <span className={styles.presetSize}>{preset.width}×{preset.height}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <OutputPathSelector
                  value={outputPath}
                  onChange={setOutputPath}
                  placeholder="다운로드 폴더 (기본값)"
                />

                <div className={styles.actionButtons}>
                  <button
                    onClick={resetToInitialState}
                    className={styles.secondaryButton}
                    disabled={isProcessing}
                  >
                    <span>🔄</span>
                    다시 선택
                  </button>
                  
                  <button
                    className={styles.primaryButton}
                    onClick={handleResize}
                    disabled={isProcessing}
                  >
                    <span>{isProcessing ? '⚙️' : '🎯'}</span>
                    {isProcessing ? '리사이즈 중...' : '리사이즈 실행'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            onDrop([e.target.files[0]]);
            e.target.value = '';
          }
        }}
        style={{ display: 'none' }}
      />

      <div className={styles.features}>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>🎯</div>
          <h3>정밀한 제어</h3>
          <p>픽셀 단위로 정확한 크기 조절이 가능하며, 비율 유지 옵션으로 왜곡을 방지합니다.</p>
        </div>
        
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>🚀</div>
          <h3>고품질 처리</h3>
          <p>고급 리샘플링 알고리즘으로 선명하고 자연스러운 결과를 보장합니다.</p>
        </div>
        
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>⚡</div>
          <h3>빠른 프리셋</h3>
          <p>자주 사용하는 해상도를 프리셋으로 제공하여 빠르고 편리하게 작업할 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}
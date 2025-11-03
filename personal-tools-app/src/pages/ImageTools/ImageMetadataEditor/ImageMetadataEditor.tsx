import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import EXIF from 'exif-js';
import { useTaskStore } from '@/stores/taskStore';
import { saveAs } from 'file-saver';
import ImagePreview from '../components/ImagePreview/ImagePreview';
import styles from './ImageMetadataEditor.module.css';

interface ImageFile {
  id: string;
  file: File;
  url: string;
  metadata?: {
    exif: any;
    all: any;
  };
  edited?: {
    blob: Blob;
    url: string;
  };
}

interface MetadataField {
  key: string;
  label: string;
  value: any;
  editable: boolean;
  category: string;
}

export default function ImageMetadataEditor() {
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { addTask, updateTask, updateTaskProgress } = useTaskStore();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => 
      file.type.startsWith('image/') && 
      ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'].includes(file.type)
    );

    const newImageFiles = validFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file)
    }));

    setImageFiles(prev => [...prev, ...newImageFiles]);
    
    // 첫 번째 파일 선택
    if (newImageFiles.length > 0 && !selectedImageId) {
      setSelectedImageId(newImageFiles[0].id);
    }
  }, [selectedImageId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.tiff']
    },
    multiple: true
  });

  // EXIF 데이터 읽기
  const readMetadata = (imageFile: ImageFile): Promise<any> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          EXIF.getData(img as any, function() {
            const exifData: any = {};
            
            // 모든 EXIF 태그 읽기
            EXIF.getAllTags(img as any).forEach((tag: any) => {
              exifData[tag] = EXIF.getTag(img as any, tag);
            });

            // 주요 EXIF 데이터
            const mainExif = {
              Make: EXIF.getTag(img as any, 'Make'),
              Model: EXIF.getTag(img as any, 'Model'),
              DateTime: EXIF.getTag(img as any, 'DateTime'),
              DateTimeOriginal: EXIF.getTag(img as any, 'DateTimeOriginal'),
              Orientation: EXIF.getTag(img as any, 'Orientation'),
              GPSLatitude: EXIF.getTag(img as any, 'GPSLatitude'),
              GPSLongitude: EXIF.getTag(img as any, 'GPSLongitude'),
              GPSAltitude: EXIF.getTag(img as any, 'GPSAltitude'),
              WhiteBalance: EXIF.getTag(img as any, 'WhiteBalance'),
              Flash: EXIF.getTag(img as any, 'Flash'),
              FocalLength: EXIF.getTag(img as any, 'FocalLength'),
              FNumber: EXIF.getTag(img as any, 'FNumber'),
              ExposureTime: EXIF.getTag(img as any, 'ExposureTime'),
              ISO: EXIF.getTag(img as any, 'ISO'),
              Software: EXIF.getTag(img as any, 'Software'),
              Artist: EXIF.getTag(img as any, 'Artist'),
              Copyright: EXIF.getTag(img as any, 'Copyright')
            };

            resolve({
              exif: mainExif,
              all: exifData
            });
          });
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('이미지를 로드할 수 없습니다.'));
      img.src = imageFile.url;
    });
  };

  const handleReadMetadata = async (imageId: string) => {
    const imageFile = imageFiles.find(img => img.id === imageId);
    if (!imageFile || imageFile.metadata) return;

    setIsProcessing(true);
    const taskId = addTask({
      type: 'image-format-convert',
      status: 'processing',
      progress: 0,
      filename: '메타데이터 읽기'
    });

    try {
      const metadata = await readMetadata(imageFile);
      
      setImageFiles(prev => prev.map(img => 
        img.id === imageId 
          ? { ...img, metadata }
          : img
      ));

      updateTask(taskId, {
        status: 'completed',
        progress: 100
      });
    } catch (error) {
      updateTask(taskId, {
        status: 'error',
        error: error instanceof Error ? error.message : '메타데이터 읽기 실패'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 메타데이터 제거 (Canvas로 재렌더링)
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
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('메타데이터 제거에 실패했습니다.'));
              }
            },
            imageFile.file.type,
            imageFile.file.type === 'image/png' ? undefined : 0.95
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

  const handleRemoveMetadata = async (imageId: string) => {
    const imageFile = imageFiles.find(img => img.id === imageId);
    if (!imageFile) return;

    setIsProcessing(true);
    const taskId = addTask({
      type: 'image-format-convert',
      status: 'processing',
      progress: 0,
      filename: '메타데이터 제거'
    });

    try {
      const blob = await removeMetadata(imageFile);
      const url = URL.createObjectURL(blob);

      setImageFiles(prev => prev.map(img => 
        img.id === imageId 
          ? { ...img, edited: { blob, url } }
          : img
      ));

      updateTask(taskId, {
        status: 'completed',
        progress: 100
      });
    } catch (error) {
      updateTask(taskId, {
        status: 'error',
        error: error instanceof Error ? error.message : '메타데이터 제거 실패'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = (imageId: string) => {
    const imageFile = imageFiles.find(img => img.id === imageId);
    if (imageFile?.edited) {
      const nameWithoutExt = imageFile.file.name.replace(/\.[^/.]+$/, '');
      const extension = imageFile.file.name.split('.').pop() || 'jpg';
      const fileName = `${nameWithoutExt}_no_metadata.${extension}`;
      saveAs(imageFile.edited.blob, fileName);
    }
  };

  const removeImage = (id: string) => {
    setImageFiles(prev => {
      const filtered = prev.filter(img => img.id !== id);
      if (selectedImageId === id && filtered.length > 0) {
        setSelectedImageId(filtered[0].id);
      } else if (filtered.length === 0) {
        setSelectedImageId(null);
      }
      return filtered;
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatMetadataValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const selectedImage = imageFiles.find(img => img.id === selectedImageId);
  const metadataCategories = {
    '카메라 정보': ['Make', 'Model', 'Software'],
    '촬영 정보': ['DateTime', 'DateTimeOriginal', 'Orientation'],
    '위치 정보': ['GPSLatitude', 'GPSLongitude', 'GPSAltitude'],
    '촬영 설정': ['FNumber', 'FocalLength', 'ExposureTime', 'ISO', 'WhiteBalance', 'Flash'],
    '기타': ['Artist', 'Copyright']
  };

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroIcon}>🏷️</div>
        <h1 className={styles.heroTitle}>메타데이터 편집기</h1>
        <p className={styles.heroSubtitle}>
          EXIF 데이터 조회, 편집, 제거 기능. 개인정보 보호를 위한 메타데이터 정리
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
            JPG, PNG, WebP, TIFF 파일을 지원합니다 (여러 파일 선택 가능)
          </p>
        </div>

        {/* 이미지 목록 및 메타데이터 */}
        {imageFiles.length > 0 && (
          <div className={styles.mainContent}>
            {/* 이미지 목록 */}
            <div className={styles.imageList}>
              <h3 className={styles.listTitle}>이미지 목록</h3>
              {imageFiles.map((imageFile) => (
                <div
                  key={imageFile.id}
                  className={`${styles.imageListItem} ${selectedImageId === imageFile.id ? styles.selected : ''}`}
                  onClick={() => setSelectedImageId(imageFile.id)}
                >
                  <ImagePreview
                    src={imageFile.edited?.url || imageFile.url}
                    alt={imageFile.file.name}
                    className={styles.listPreview}
                  />
                  <div className={styles.listInfo}>
                    <div className={styles.listFileName}>{imageFile.file.name}</div>
                    <div className={styles.listFileSize}>{formatFileSize(imageFile.file.size)}</div>
                    {imageFile.metadata && (
                      <span className={styles.metadataBadge}>메타데이터 있음</span>
                    )}
                    {imageFile.edited && (
                      <span className={styles.editedBadge}>제거됨</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(imageFile.id);
                    }}
                    className={styles.removeButton}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* 메타데이터 표시 */}
            {selectedImage && (
              <div className={styles.metadataPanel}>
                <div className={styles.imagePreviewSection}>
                  <ImagePreview
                    src={selectedImage.edited?.url || selectedImage.url}
                    alt={selectedImage.file.name}
                  />
                  <div className={styles.imageActions}>
                    {!selectedImage.metadata && (
                      <button
                        onClick={() => handleReadMetadata(selectedImage.id)}
                        disabled={isProcessing}
                        className={styles.readButton}
                      >
                        메타데이터 읽기
                      </button>
                    )}
                    {selectedImage.metadata && (
                      <button
                        onClick={() => handleRemoveMetadata(selectedImage.id)}
                        disabled={isProcessing}
                        className={styles.removeMetadataButton}
                      >
                        메타데이터 제거
                      </button>
                    )}
                    {selectedImage.edited && (
                      <button
                        onClick={() => downloadResult(selectedImage.id)}
                        className={styles.downloadButton}
                      >
                        다운로드
                      </button>
                    )}
                  </div>
                </div>

                {selectedImage.metadata && (
                  <div className={styles.metadataContent}>
                    <h3 className={styles.metadataTitle}>EXIF 메타데이터</h3>
                    {Object.entries(metadataCategories).map(([category, keys]) => {
                      const hasData = keys.some(key => selectedImage.metadata?.exif[key]);
                      if (!hasData) return null;

                      return (
                        <div key={category} className={styles.metadataCategory}>
                          <h4 className={styles.categoryTitle}>{category}</h4>
                          <div className={styles.metadataFields}>
                            {keys.map(key => {
                              const value = selectedImage.metadata?.exif[key];
                              if (!value) return null;

                              return (
                                <div key={key} className={styles.metadataField}>
                                  <span className={styles.fieldLabel}>{key}:</span>
                                  <span className={styles.fieldValue}>
                                    {formatMetadataValue(value)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {selectedImage.metadata.exif.GPSLatitude && (
                      <div className={styles.warning}>
                        ⚠️ 이 이미지에는 위치 정보(GPS)가 포함되어 있습니다. 개인정보 보호를 위해 메타데이터를 제거하는 것을 권장합니다.
                      </div>
                    )}

                    {selectedImage.metadata.exif.Copyright && (
                      <div className={styles.info}>
                        ℹ️ 이 이미지에는 저작권 정보가 포함되어 있습니다.
                      </div>
                    )}
                  </div>
                )}

                {!selectedImage.metadata && (
                  <div className={styles.noMetadata}>
                    <p>메타데이터를 읽으려면 "메타데이터 읽기" 버튼을 클릭하세요.</p>
                    <p className={styles.note}>
                      참고: 일부 이미지 형식(PNG, WebP 등)은 EXIF 데이터를 지원하지 않을 수 있습니다.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 정보 섹션 */}
      <div className={styles.info}>
        <div className={styles.infoCard}>
          <h3>🔒 개인정보 보호</h3>
          <p>EXIF 데이터에는 촬영 위치(GPS), 촬영 시간, 카메라 정보 등이 포함될 수 있습니다.</p>
        </div>
        <div className={styles.infoCard}>
          <h3>📸 메타데이터 정보</h3>
          <p>카메라 모델, 촬영 설정, 위치 정보 등 상세한 메타데이터를 확인할 수 있습니다.</p>
        </div>
        <div className={styles.infoCard}>
          <h3>🗑️ 안전한 제거</h3>
          <p>Canvas API를 사용하여 메타데이터를 완전히 제거하고 새로운 이미지 파일을 생성합니다.</p>
        </div>
      </div>
    </div>
  );
}

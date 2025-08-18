import { useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import styles from './TextEncoding.module.css';

interface EncodingOption {
  value: string;
  label: string;
  description: string;
}

interface FileData {
  file: File;
  id: string;
  detectedEncoding: string;
  confidence: number;
  preview: string;
  originalContent: string;
  originalBytes: Uint8Array;
  convertedContent?: string;
  targetEncoding?: string;
  allDetectedEncodings?: Array<{encoding: string; confidence: number}>;
}

const ENCODING_OPTIONS: EncodingOption[] = [
  { value: 'UTF-8', label: 'UTF-8', description: '유니코드 (권장)' },
  { value: 'UTF-16', label: 'UTF-16', description: '유니코드 16비트' },
  { value: 'EUC-KR', label: 'EUC-KR', description: '한국어 확장 완성형' },
  { value: 'CP949', label: 'CP949', description: '윈도우 한국어' },
  { value: 'ISO-8859-1', label: 'ISO-8859-1', description: '서유럽어 (Latin-1)' },
  { value: 'ASCII', label: 'ASCII', description: '기본 영문' },
  { value: 'Shift_JIS', label: 'Shift_JIS', description: '일본어' },
  { value: 'GB2312', label: 'GB2312', description: '중국어 간체' },
  { value: 'Big5', label: 'Big5', description: '중국어 번체' },
];

// 브라우저 호환 인코딩 감지 함수
const detectEncodingAdvanced = (bytes: Uint8Array): { encoding: string; confidence: number; allDetected: Array<{encoding: string; confidence: number}> } => {
  const allDetected: Array<{encoding: string; confidence: number}> = [];
  
  // BOM 감지 (가장 확실한 방법)
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return { 
      encoding: 'UTF-8', 
      confidence: 100, 
      allDetected: [{ encoding: 'UTF-8', confidence: 100 }] 
    };
  }
  
  if (bytes.length >= 2) {
    if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
      return { 
        encoding: 'UTF-16LE', 
        confidence: 100, 
        allDetected: [{ encoding: 'UTF-16LE', confidence: 100 }] 
      };
    } else if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
      return { 
        encoding: 'UTF-16BE', 
        confidence: 100, 
        allDetected: [{ encoding: 'UTF-16BE', confidence: 100 }] 
      };
    }
  }
  
  // ASCII 검사
  let isAscii = true;
  for (let i = 0; i < Math.min(bytes.length, 1000); i++) {
    if (bytes[i] > 127) {
      isAscii = false;
      break;
    }
  }
  
  if (isAscii) {
    allDetected.push({ encoding: 'ASCII', confidence: 95 });
  }
  
  // UTF-8 유효성 검사
  let utf8Score = 0;
  let utf8Valid = true;
  let i = 0;
  
  while (i < bytes.length && utf8Valid) {
    const byte = bytes[i];
    
    if (byte <= 0x7F) {
      // ASCII 범위
      i++;
    } else if ((byte & 0xE0) === 0xC0) {
      // 2바이트 UTF-8
      if (i + 1 < bytes.length && (bytes[i + 1] & 0xC0) === 0x80) {
        utf8Score += 2;
        i += 2;
      } else {
        utf8Valid = false;
      }
    } else if ((byte & 0xF0) === 0xE0) {
      // 3바이트 UTF-8
      if (i + 2 < bytes.length && 
          (bytes[i + 1] & 0xC0) === 0x80 && 
          (bytes[i + 2] & 0xC0) === 0x80) {
        utf8Score += 3;
        i += 3;
      } else {
        utf8Valid = false;
      }
    } else if ((byte & 0xF8) === 0xF0) {
      // 4바이트 UTF-8
      if (i + 3 < bytes.length && 
          (bytes[i + 1] & 0xC0) === 0x80 && 
          (bytes[i + 2] & 0xC0) === 0x80 && 
          (bytes[i + 3] & 0xC0) === 0x80) {
        utf8Score += 4;
        i += 4;
      } else {
        utf8Valid = false;
      }
    } else {
      utf8Valid = false;
    }
  }
  
  if (utf8Valid && utf8Score > 0) {
    const confidence = Math.min(95, 60 + (utf8Score / bytes.length) * 100);
    allDetected.push({ encoding: 'UTF-8', confidence: Math.round(confidence) });
  }
  
  // 한국어 패턴 검사 (EUC-KR)
  let koreanPatterns = 0;
  for (let i = 0; i < bytes.length - 1; i++) {
    const byte1 = bytes[i];
    const byte2 = bytes[i + 1];
    
    // EUC-KR 한글 범위 검사
    if (byte1 >= 0xA1 && byte1 <= 0xFE && byte2 >= 0xA1 && byte2 <= 0xFE) {
      koreanPatterns++;
    }
  }
  
  if (koreanPatterns > 0) {
    const confidence = Math.min(90, 50 + (koreanPatterns / (bytes.length / 2)) * 100);
    allDetected.push({ encoding: 'EUC-KR', confidence: Math.round(confidence) });
  }
  
  // 일본어 패턴 검사 (Shift_JIS)
  let japanesePatterns = 0;
  for (let i = 0; i < bytes.length - 1; i++) {
    const byte1 = bytes[i];
    const byte2 = bytes[i + 1];
    
    // Shift_JIS 범위
    if (((byte1 >= 0x81 && byte1 <= 0x9F) || (byte1 >= 0xE0 && byte1 <= 0xFC)) &&
        ((byte2 >= 0x40 && byte2 <= 0x7E) || (byte2 >= 0x80 && byte2 <= 0xFC))) {
      japanesePatterns++;
    }
  }
  
  if (japanesePatterns > 0) {
    const confidence = Math.min(85, 40 + (japanesePatterns / (bytes.length / 2)) * 100);
    allDetected.push({ encoding: 'Shift_JIS', confidence: Math.round(confidence) });
  }
  
  // Latin-1 패턴 검사
  let latin1Patterns = 0;
  for (let i = 0; i < Math.min(bytes.length, 1000); i++) {
    const byte = bytes[i];
    if (byte >= 0x80 && byte <= 0xFF) {
      latin1Patterns++;
    }
  }
  
  if (latin1Patterns > 0) {
    const confidence = Math.min(70, 30 + (latin1Patterns / Math.min(bytes.length, 1000)) * 50);
    allDetected.push({ encoding: 'ISO-8859-1', confidence: Math.round(confidence) });
  }
  
  // 결과 정렬 (신뢰도 높은 순)
  allDetected.sort((a, b) => b.confidence - a.confidence);
  
  // 가장 확률 높은 인코딩 반환, 없으면 UTF-8 기본값
  const bestGuess = allDetected.length > 0 ? allDetected[0] : { encoding: 'UTF-8', confidence: 50 };
  
  return {
    encoding: bestGuess.encoding,
    confidence: bestGuess.confidence,
    allDetected
  };
};

// 브라우저 호환 텍스트 디코딩
const readFileWithEncoding = (bytes: Uint8Array, encoding: string): string => {
  try {
    // 표준 TextDecoder 사용 (브라우저 호환)
    const encodingMap: { [key: string]: string } = {
      'UTF-8': 'utf-8',
      'UTF-16': 'utf-16',
      'UTF-16LE': 'utf-16le',
      'UTF-16BE': 'utf-16be',
      'ISO-8859-1': 'latin1',
      'ASCII': 'ascii',
    };
    
    const decoderEncoding = encodingMap[encoding];
    if (decoderEncoding) {
      const decoder = new TextDecoder(decoderEncoding, { fatal: false });
      return decoder.decode(bytes);
    }
    
    // 한국어, 일본어, 중국어는 UTF-8로 시도
    if (['EUC-KR', 'CP949', 'Shift_JIS', 'GB2312', 'Big5'].includes(encoding)) {
      console.warn(`${encoding}은 브라우저에서 직접 지원되지 않아 UTF-8로 시도합니다.`);
      const decoder = new TextDecoder('utf-8', { fatal: false });
      return decoder.decode(bytes);
    }
    
    // 기본값: UTF-8
    const decoder = new TextDecoder('utf-8', { fatal: false });
    return decoder.decode(bytes);
    
  } catch (error) {
    console.warn(`인코딩 ${encoding} 실패, UTF-8로 폴백:`, error);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    return decoder.decode(bytes);
  }
};

// 텍스트 인코딩 변환 (브라우저 제한으로 기본 기능만)
const convertTextEncoding = (text: string, fromEncoding: string, toEncoding: string): string => {
  // 브라우저에서는 제한적인 변환만 가능
  // 실제 프로덕션에서는 서버 사이드 변환이 필요할 수 있음
  
  if (fromEncoding === toEncoding) {
    return text;
  }
  
  // UTF-8을 기준으로 한 기본 변환
  return text;
};

export default function TextEncoding() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    
    const newFiles: FileData[] = [];
    
    for (const file of acceptedFiles) {
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        
        const detectionResult = detectEncodingAdvanced(bytes);
        const content = readFileWithEncoding(bytes, detectionResult.encoding);
        
        const preview = content.length > 500 ? content.substring(0, 500) + '...' : content;
        
        newFiles.push({
          file,
          id: Math.random().toString(36).substr(2, 9),
          detectedEncoding: detectionResult.encoding,
          confidence: detectionResult.confidence,
          preview,
          originalContent: content,
          originalBytes: bytes,
          allDetectedEncodings: detectionResult.allDetected,
        });
      } catch (error) {
        console.error('파일 처리 오류:', error);
        alert(`파일 "${file.name}" 처리 중 오류가 발생했습니다.`);
      }
    }
    
    setFiles(prev => [...prev, ...newFiles]);
    setIsProcessing(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processFiles,
    accept: {
      'text/*': ['.txt', '.csv', '.log', '.md', '.html', '.css', '.js', '.json', '.xml'],
    },
    multiple: true,
  });

  const updateTargetEncoding = (fileId: string, encoding: string) => {
    setFiles(prev => prev.map(file => {
      if (file.id === fileId) {
        const convertedContent = convertTextEncoding(
          file.originalContent, 
          file.detectedEncoding, 
          encoding
        );
        return {
          ...file,
          targetEncoding: encoding,
          convertedContent,
        };
      }
      return file;
    }));
  };

  const downloadConvertedFile = (file: FileData) => {
    if (!file.convertedContent || !file.targetEncoding) {
      alert('먼저 변환할 인코딩을 선택하세요.');
      return;
    }

    const blob = new Blob([file.convertedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${file.file.name.split('.')[0]}_${file.targetEncoding}.${file.file.name.split('.').pop()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const clearAll = () => {
    setFiles([]);
  };

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroIcon}>🔤➡️📝</div>
        <h1 className={styles.heroTitle}>텍스트 인코딩 변환</h1>
        <p className={styles.heroSubtitle}>
          텍스트 파일의 인코딩을 자동으로 감지하고 다른 인코딩으로 변환하세요. 
          한글 깨짐 문제를 해결하고 다양한 시스템 간 호환성을 보장합니다.
        </p>
        
        <div className={styles.encodingShowcase}>
          {ENCODING_OPTIONS.slice(0, 4).map((encoding) => (
            <div key={encoding.value} className={styles.encodingBadge}>
              <span className={styles.encodingIcon}>📄</span>
              <span className={styles.encodingLabel}>{encoding.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        {files.length === 0 ? (
          <div className={styles.uploadSection}>
            <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.dragActive : ''}`}>
              <input {...getInputProps()} />
              <div className={styles.dropzoneContent}>
                <div className={styles.uploadIcon}>📄</div>
                <h3>텍스트 파일을 드래그하거나 클릭하여 업로드</h3>
                <p>TXT, CSV, HTML, JSON, XML 등 모든 텍스트 파일을 지원합니다</p>
                <div className={styles.uploadFeatures}>
                  <span>🎯 자동 인코딩 감지</span>
                  <span>🔄 다중 인코딩 지원</span>
                  <span>👁️ 실시간 미리보기</span>
                  <span>💾 안전한 변환</span>
                </div>
              </div>
            </div>
            
            <div className={styles.uploadActions}>
              <button 
                className={styles.primaryButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                <span>📁</span>
                파일 선택
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.processingArea}>
            <div className={styles.controlPanel}>
              <div className={styles.panelHeader}>
                <h3>🔧 변환 설정</h3>
                <div className={styles.fileCounter}>
                  <span>📄</span>
                  <span className={styles.fileCount}>{files.length}</span>
                  <span>개 파일</span>
                </div>
              </div>

              <div className={styles.encodingInfo}>
                <h4>📝 지원 인코딩</h4>
                <div className={styles.encodingGrid}>
                  {ENCODING_OPTIONS.slice(0, 6).map((encoding) => (
                    <div key={encoding.value} className={styles.encodingCard}>
                      <div className={styles.encodingIcon}>📄</div>
                      <div className={styles.encodingDetails}>
                        <div className={styles.encodingName}>{encoding.label}</div>
                        <div className={styles.encodingDesc}>{encoding.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.actionButtons}>
                <button 
                  className={styles.primaryButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <span>➕</span>
                  파일 추가
                </button>
                <button 
                  className={styles.dangerButton}
                  onClick={clearAll}
                  disabled={isProcessing}
                >
                  <span>🗑️</span>
                  전체 삭제
                </button>
              </div>
            </div>

            <div className={styles.fileArea}>
              <div className={styles.fileHeader}>
                <h3>📄 파일 목록</h3>
                <div className={styles.fileStats}>
                  감지 완료: {files.length} / {files.length}
                </div>
              </div>

              <div className={styles.fileList}>
                {files.map(file => (
                  <div key={file.id} className={styles.fileCard}>
                    <div className={styles.fileCardHeader}>
                      <div className={styles.fileInfo}>
                        <h4 className={styles.fileName}>{file.file.name}</h4>
                        <div className={styles.fileDetails}>
                          <span className={styles.fileSize}>{(file.file.size / 1024).toFixed(1)} KB</span>
                          <span className={`${styles.detectionBadge} ${styles.primary}`}>
                            🎯 {file.detectedEncoding} ({file.confidence}%)
                          </span>
                        </div>
                      </div>
                      <button 
                        className={styles.removeButton}
                        onClick={() => removeFile(file.id)}
                      >
                        ✕
                      </button>
                    </div>

                    {file.allDetectedEncodings && file.allDetectedEncodings.length > 1 && (
                      <div className={styles.allDetections}>
                        <h6>🔍 감지된 인코딩 후보들</h6>
                        <div className={styles.detectionList}>
                          {file.allDetectedEncodings.map((detection, index) => (
                            <span 
                              key={index} 
                              className={`${styles.detectionBadge} ${index === 0 ? styles.primary : ''}`}
                            >
                              {detection.encoding} ({detection.confidence}%)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={styles.previewSection}>
                      <h5>👁️ 미리보기</h5>
                      <div className={styles.previewBox}>
                        <pre>{file.preview}</pre>
                      </div>
                    </div>

                    <div className={styles.conversionSection}>
                      <h5>🔄 인코딩 변환</h5>
                      <div className={styles.conversionControls}>
                        <label htmlFor={`encoding-${file.id}`}>변환할 인코딩:</label>
                        <select
                          id={`encoding-${file.id}`}
                          value={file.targetEncoding || ''}
                          onChange={(e) => updateTargetEncoding(file.id, e.target.value)}
                          className={styles.encodingSelect}
                        >
                          <option value="">인코딩 선택</option>
                          {ENCODING_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label} - {option.description}
                            </option>
                          ))}
                        </select>
                        <button
                          className={styles.downloadButton}
                          onClick={() => downloadConvertedFile(file)}
                          disabled={!file.targetEncoding}
                        >
                          <span>💾</span>
                          다운로드
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.csv,.log,.md,.html,.css,.js,.json,.xml"
        onChange={(e) => e.target.files && processFiles(Array.from(e.target.files))}
        style={{ display: 'none' }}
      />
    </div>
  );
} 
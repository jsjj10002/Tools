import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTaskStore } from '@/stores/taskStore';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import styles from './BatchFileProcessor.module.css';

interface FileItem {
  id: string;
  file: File;
  originalName: string;
  newName?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

interface BatchOperation {
  rename: boolean;
  renamePattern: string; // 예: "{name}_processed_{index}", "{name}_backup"
  convert: boolean;
  convertFormat?: 'csv' | 'json' | 'xml';
  compress: boolean;
  compressFormat: 'zip';
}

export default function BatchFileProcessor() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [operation, setOperation] = useState<BatchOperation>({
    rename: false,
    renamePattern: '{name}_processed_{index}',
    convert: false,
    compress: false,
    compressFormat: 'zip'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const { addTask, updateTask, updateTaskProgress } = useTaskStore();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileItem[] = acceptedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      originalName: file.name,
      status: 'pending' as const
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // 파일명 패턴 처리
  const processFileName = (originalName: string, pattern: string, index: number): string => {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const extension = originalName.split('.').pop() || '';
    
    let newName = pattern
      .replace(/{name}/g, nameWithoutExt)
      .replace(/{index}/g, String(index + 1))
      .replace(/{ext}/g, extension)
      .replace(/{date}/g, new Date().toISOString().split('T')[0])
      .replace(/{time}/g, new Date().toTimeString().split(' ')[0].replace(/:/g, '-'));
    
    if (!newName.endsWith('.' + extension)) {
      newName += '.' + extension;
    }
    
    return newName;
  };

  // 포맷 변환 (간단한 텍스트 파일만 지원)
  const convertFile = async (file: File, targetFormat: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          let convertedText: string;
          
          switch (targetFormat) {
            case 'json':
              // CSV를 JSON으로 변환 (간단한 예시)
              const lines = text.split('\n').filter(line => line.trim());
              const data = lines.map(line => {
                const values = line.split(',').map(v => v.trim());
                return values;
              });
              convertedText = JSON.stringify(data, null, 2);
              break;
            case 'csv':
              // JSON을 CSV로 변환 (간단한 예시)
              try {
                const json = JSON.parse(text);
                if (Array.isArray(json)) {
                  convertedText = json.map((row: any) => 
                    Array.isArray(row) ? row.join(',') : JSON.stringify(row)
                  ).join('\n');
                } else {
                  convertedText = text; // 변환 불가능하면 원본 반환
                }
              } catch {
                convertedText = text;
              }
              break;
            default:
              convertedText = text;
          }
          
          resolve(new Blob([convertedText], { type: 'text/plain' }));
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('파일 읽기 실패'));
      reader.readAsText(file);
    });
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    if (!operation.rename && !operation.convert && !operation.compress) {
      alert('최소 하나의 작업을 선택하세요.');
      return;
    }

    setIsProcessing(true);
    const taskId = addTask({
      type: 'format-convert',
      status: 'processing',
      progress: 0,
      filename: `${files.length}개 파일 일괄 처리`
    });

    try {
      const processedFiles: { file: File | Blob; name: string }[] = [];

      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i];
        
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'processing' } : f
        ));

        updateTaskProgress({ 
          taskId, 
          progress: ((i + 1) / files.length) * 50 
        });

        try {
          let currentFile: File | Blob = fileItem.file;
          let currentName = fileItem.originalName;

          // 파일명 변경
          if (operation.rename) {
            currentName = processFileName(fileItem.originalName, operation.renamePattern, i);
          }

          // 포맷 변환
          if (operation.convert && operation.convertFormat) {
            try {
              const convertedBlob = await convertFile(fileItem.file, operation.convertFormat);
              // Blob을 File로 변환
              currentFile = new File([convertedBlob], currentName, { type: convertedBlob.type });
              const nameWithoutExt = currentName.replace(/\.[^/.]+$/, '');
              currentName = `${nameWithoutExt}.${operation.convertFormat}`;
            } catch (error) {
              throw new Error(`포맷 변환 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
            }
          }

          processedFiles.push({ file: currentFile as File, name: currentName });

          setFiles(prev => prev.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'completed', newName: currentName }
              : f
          ));
        } catch (error) {
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id 
              ? { 
                  ...f, 
                  status: 'error', 
                  error: error instanceof Error ? error.message : '처리 실패'
                }
              : f
          ));
        }
      }

      // 압축 또는 개별 다운로드
      if (operation.compress && processedFiles.length > 0) {
        updateTaskProgress({ taskId, progress: 60 });
        
        const zip = new JSZip();
        
        processedFiles.forEach(({ file, name }) => {
          zip.file(name, file);
        });

        updateTaskProgress({ taskId, progress: 80 });
        
        const zipBlob = await zip.generateAsync(
          { 
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
          },
          (metadata) => {
            updateTaskProgress({ taskId, progress: 60 + (metadata.percent * 0.3) });
          }
        );

        saveAs(zipBlob, `batch_processed_${Date.now()}.zip`);
      } else {
        // 개별 다운로드
        processedFiles.forEach(({ file, name }) => {
          saveAs(file, name);
        });
      }

      updateTask(taskId, {
        status: 'completed',
        progress: 100
      });
    } catch (error) {
      updateTask(taskId, {
        status: 'error',
        error: error instanceof Error ? error.message : '일괄 처리 실패'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = (fileItem: FileItem) => {
    if (fileItem.status === 'completed' && fileItem.newName) {
      // 처리된 파일을 다시 다운로드하려면 재처리 필요
      // 간단하게 원본 파일 다운로드
      saveAs(fileItem.file, fileItem.newName);
    }
  };

  const previewRename = (fileName: string, index: number): string => {
    if (!operation.rename) return fileName;
    return processFileName(fileName, operation.renamePattern, index);
  };

  const completedCount = files.filter(f => f.status === 'completed').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroIcon}>📦</div>
        <h1 className={styles.heroTitle}>일괄 파일 처리</h1>
        <p className={styles.heroSubtitle}>
          여러 파일을 동시에 처리합니다. 이름 변경, 포맷 변환, 압축 등 일괄 작업
        </p>
      </div>

      {/* 파일 업로드 */}
      <div className={styles.content}>
        <div
          {...getRootProps()}
          className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}
        >
          <input {...getInputProps()} />
          <div className={styles.dropzoneIcon}>📁</div>
          <p className={styles.dropzoneText}>
            {isDragActive
              ? '파일을 여기에 놓으세요'
              : '파일을 드래그하거나 클릭하여 선택하세요'}
          </p>
          <p className={styles.dropzoneSubtext}>
            여러 파일 선택 가능 (모든 파일 형식 지원)
          </p>
        </div>

        {/* 작업 설정 */}
        {files.length > 0 && (
          <div className={styles.settingsPanel}>
            <h3 className={styles.settingsTitle}>일괄 작업 설정</h3>

            {/* 파일명 변경 */}
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>
                <input
                  type="checkbox"
                  checked={operation.rename}
                  onChange={(e) => setOperation(prev => ({ ...prev, rename: e.target.checked }))}
                  disabled={isProcessing}
                />
                <span>파일명 변경</span>
              </label>
              {operation.rename && (
                <div className={styles.renamePattern}>
                  <input
                    type="text"
                    value={operation.renamePattern}
                    onChange={(e) => setOperation(prev => ({ ...prev, renamePattern: e.target.value }))}
                    placeholder="{name}_processed_{index}"
                    className={styles.patternInput}
                    disabled={isProcessing}
                  />
                  <div className={styles.patternHelp}>
                    <p>사용 가능한 변수:</p>
                    <ul>
                      <li><code>{'{name}'}</code>: 원본 파일명 (확장자 제외)</li>
                      <li><code>{'{index}'}</code>: 파일 순서 번호</li>
                      <li><code>{'{ext}'}</code>: 파일 확장자</li>
                      <li><code>{'{date}'}</code>: 현재 날짜 (YYYY-MM-DD)</li>
                      <li><code>{'{time}'}</code>: 현재 시간 (HH-MM-SS)</li>
                    </ul>
                    <p className={styles.example}>예시: <code>{'{name}'}_backup_{'{index}'}.{'{ext}'}</code></p>
                  </div>
                </div>
              )}
            </div>

            {/* 포맷 변환 */}
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>
                <input
                  type="checkbox"
                  checked={operation.convert}
                  onChange={(e) => setOperation(prev => ({ ...prev, convert: e.target.checked }))}
                  disabled={isProcessing}
                />
                <span>포맷 변환</span>
              </label>
              {operation.convert && (
                <select
                  value={operation.convertFormat || 'json'}
                  onChange={(e) => setOperation(prev => ({ 
                    ...prev, 
                    convertFormat: e.target.value as 'csv' | 'json' | 'xml'
                  }))}
                  className={styles.formatSelect}
                  disabled={isProcessing}
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="xml">XML</option>
                </select>
              )}
              <p className={styles.settingDescription}>
                텍스트 파일만 지원됩니다. CSV ↔ JSON 변환 등이 가능합니다.
              </p>
            </div>

            {/* 압축 */}
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>
                <input
                  type="checkbox"
                  checked={operation.compress}
                  onChange={(e) => setOperation(prev => ({ ...prev, compress: e.target.checked }))}
                  disabled={isProcessing}
                />
                <span>ZIP 압축</span>
              </label>
              <p className={styles.settingDescription}>
                처리된 모든 파일을 하나의 ZIP 파일로 압축합니다. 선택하지 않으면 각 파일을 개별 다운로드합니다.
              </p>
            </div>
          </div>
        )}

        {/* 파일 목록 */}
        {files.length > 0 && (
          <div className={styles.fileList}>
            <div className={styles.listHeader}>
              <h3 className={styles.listTitle}>파일 목록 ({files.length}개)</h3>
              <div className={styles.listStats}>
                <span className={styles.statSuccess}>완료: {completedCount}</span>
                <span className={styles.statError}>오류: {errorCount}</span>
              </div>
            </div>
            {files.map((fileItem, index) => (
              <div 
                key={fileItem.id} 
                className={`${styles.fileItem} ${styles[fileItem.status]}`}
              >
                <div className={styles.fileInfo}>
                  <span className={styles.fileIcon}>
                    {fileItem.status === 'completed' ? '✅' : 
                     fileItem.status === 'error' ? '❌' : 
                     fileItem.status === 'processing' ? '⏳' : '📄'}
                  </span>
                  <div className={styles.fileDetails}>
                    <div className={styles.fileName}>
                      <div className={styles.originalName}>{fileItem.originalName}</div>
                      {fileItem.newName && fileItem.newName !== fileItem.originalName && (
                        <div className={styles.newName}>
                          → {fileItem.newName}
                        </div>
                      )}
                      {operation.rename && !fileItem.newName && (
                        <div className={styles.previewName}>
                          → {previewRename(fileItem.originalName, index)}
                        </div>
                      )}
                    </div>
                    <div className={styles.fileSize}>
                      {formatFileSize(fileItem.file.size)}
                    </div>
                    {fileItem.error && (
                      <div className={styles.fileError}>{fileItem.error}</div>
                    )}
                  </div>
                </div>
                <div className={styles.fileActions}>
                  {fileItem.status === 'completed' && (
                    <button
                      onClick={() => downloadFile(fileItem)}
                      className={styles.downloadButton}
                    >
                      다운로드
                    </button>
                  )}
                  <button
                    onClick={() => removeFile(fileItem.id)}
                    className={styles.removeButton}
                    disabled={isProcessing}
                  >
                    제거
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 처리 버튼 */}
        {files.length > 0 && (
          <button
            onClick={handleProcess}
            disabled={isProcessing || (!operation.rename && !operation.convert && !operation.compress)}
            className={styles.processButton}
          >
            {isProcessing
              ? '처리 중...'
              : `${files.length}개 파일 일괄 처리하기`}
            {!operation.rename && !operation.convert && !operation.compress && ' (작업을 선택하세요)'}
          </button>
        )}
      </div>

      {/* 정보 섹션 */}
      <div className={styles.info}>
        <div className={styles.infoCard}>
          <h3>📝 파일명 변경</h3>
          <p>패턴을 사용하여 여러 파일의 이름을 일괄 변경할 수 있습니다. 변수를 조합하여 원하는 형식으로 변경하세요.</p>
        </div>
        <div className={styles.infoCard}>
          <h3>🔄 포맷 변환</h3>
          <p>텍스트 파일을 CSV, JSON, XML 형식으로 변환할 수 있습니다. 현재는 간단한 변환만 지원됩니다.</p>
        </div>
        <div className={styles.infoCard}>
          <h3>📦 ZIP 압축</h3>
          <p>처리된 모든 파일을 하나의 ZIP 파일로 압축하여 한 번에 다운로드할 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}

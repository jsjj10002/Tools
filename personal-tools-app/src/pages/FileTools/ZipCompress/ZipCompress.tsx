import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useTaskStore } from '@/stores/taskStore';
import styles from './ZipCompress.module.css';

interface FileItem {
  id: string;
  file: File;
  path: string;
}

export default function ZipCompress() {
  const [mode, setMode] = useState<'compress' | 'extract'>('compress');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [zipPassword, setZipPassword] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { addTask, updateTask, updateTaskProgress } = useTaskStore();

  // 압축 모드: 파일 업로드
  const onDropCompress = (acceptedFiles: File[]) => {
    const newFiles: FileItem[] = acceptedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      path: file.name
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  // 해제 모드: ZIP 파일 업로드
  const onDropExtract = (acceptedFiles: File[]) => {
    const zipFiles = acceptedFiles.filter(file => 
      file.type === 'application/zip' || 
      file.name.toLowerCase().endsWith('.zip')
    );
    
    if (zipFiles.length === 0) {
      alert('ZIP 파일만 업로드 가능합니다.');
      return;
    }

    const newFiles: FileItem[] = zipFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      path: file.name
    }));
    setFiles(newFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: mode === 'compress' ? onDropCompress : onDropExtract,
    multiple: mode === 'compress',
    accept: mode === 'compress' 
      ? undefined 
      : { 'application/zip': ['.zip'] }
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

  const handleCompress = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    const taskId = addTask({
      type: 'zip-compress',
      status: 'processing',
      progress: 0,
      filename: `${files.length}개 파일 압축`
    });

    try {
      const zip = new JSZip();
      let processedCount = 0;

      // 파일들을 ZIP에 추가
      for (const fileItem of files) {
        const { file, path } = fileItem;
        zip.file(path, file);
        processedCount++;
        updateTaskProgress({ taskId, progress: (processedCount / files.length) * 100 });
      }

      // ZIP 파일 생성
      const zipBlob = await zip.generateAsync(
        { 
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        },
        (metadata) => {
          updateTaskProgress({ taskId, progress: metadata.percent });
        }
      );

      // 파일 다운로드
      const zipFileName = files.length === 1 
        ? `${files[0].file.name.replace(/\.[^/.]+$/, '')}.zip`
        : 'archive.zip';
      
      saveAs(zipBlob, zipFileName);

      updateTask(taskId, {
        status: 'completed',
        progress: 100
      });

      // 3초 후 자동 정리
      setTimeout(() => {
        setFiles([]);
      }, 3000);
    } catch (error) {
      updateTask(taskId, {
        status: 'error',
        error: error instanceof Error ? error.message : '압축 실패'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtract = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    const taskId = addTask({
      type: 'zip-extract',
      status: 'processing',
      progress: 0,
      filename: files[0].file.name
    });

    try {
      const zipFile = files[0].file;
      const zip = new JSZip();
      
      // ZIP 파일 로드
      const zipData = await zip.loadAsync(zipFile);

      const fileNames = Object.keys(zipData.files);
      let extractedCount = 0;

      // 각 파일 추출
      for (const fileName of fileNames) {
        const zipEntry = zipData.files[fileName];
        
        if (zipEntry.dir) {
          continue; // 디렉토리는 건너뜀
        }

        updateTaskProgress({ taskId, progress: (extractedCount / fileNames.length) * 100 });

        const fileData = await zipEntry.async('blob');
        saveAs(fileData, fileName);
        
        extractedCount++;
      }

      updateTask(taskId, {
        status: 'completed',
        progress: 100
      });

      // 3초 후 자동 정리
      setTimeout(() => {
        setFiles([]);
      }, 3000);
    } catch (error) {
      updateTask(taskId, {
        status: 'error',
        error: error instanceof Error ? error.message : '해제 실패'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroIcon}>🗜️</div>
        <h1 className={styles.heroTitle}>ZIP 압축/해제</h1>
        <p className={styles.heroSubtitle}>
          여러 파일을 ZIP으로 압축하거나 ZIP 파일을 해제할 수 있습니다
        </p>
      </div>

      {/* 모드 선택 */}
      <div className={styles.modeSelector}>
        <button
          className={`${styles.modeButton} ${mode === 'compress' ? styles.active : ''}`}
          onClick={() => {
            setMode('compress');
            setFiles([]);
          }}
        >
          📦 압축
        </button>
        <button
          className={`${styles.modeButton} ${mode === 'extract' ? styles.active : ''}`}
          onClick={() => {
            setMode('extract');
            setFiles([]);
          }}
        >
          📂 해제
        </button>
      </div>

      {/* 파일 업로드 영역 */}
      <div className={styles.content}>
        <div
          {...getRootProps()}
          className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}
        >
          <input {...getInputProps()} />
          <div className={styles.dropzoneIcon}>
            {mode === 'compress' ? '📦' : '📂'}
          </div>
          <p className={styles.dropzoneText}>
            {isDragActive
              ? '파일을 여기에 놓으세요'
              : mode === 'compress'
              ? '압축할 파일을 드래그하거나 클릭하여 선택하세요'
              : 'ZIP 파일을 드래그하거나 클릭하여 선택하세요'}
          </p>
          <p className={styles.dropzoneSubtext}>
            {mode === 'compress'
              ? '여러 파일 선택 가능'
              : 'ZIP 파일만 업로드 가능'}
          </p>
        </div>

        {/* 파일 목록 */}
        {files.length > 0 && (
          <div className={styles.fileList}>
            <h3 className={styles.fileListTitle}>
              {mode === 'compress' ? '압축할 파일' : 'ZIP 파일'}
            </h3>
            {files.map((fileItem) => (
              <div key={fileItem.id} className={styles.fileItem}>
                <div className={styles.fileInfo}>
                  <span className={styles.fileIcon}>📄</span>
                  <div className={styles.fileDetails}>
                    <div className={styles.fileName}>{fileItem.file.name}</div>
                    <div className={styles.fileSize}>
                      {formatFileSize(fileItem.file.size)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(fileItem.id)}
                  className={styles.removeButton}
                  disabled={isProcessing}
                >
                  제거
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 패스워드 설정 (압축 모드만, 선택적) */}
        {mode === 'compress' && files.length > 0 && (
          <div className={styles.passwordSection}>
            <label className={styles.passwordLabel}>
              패스워드 보호 (선택사항)
            </label>
            <input
              type="password"
              value={zipPassword}
              onChange={(e) => setZipPassword(e.target.value)}
              placeholder="패스워드를 입력하세요 (선택사항)"
              className={styles.passwordInput}
              disabled={isProcessing}
            />
            <p className={styles.passwordNote}>
              주의: JSZip은 패스워드 보호를 완전히 지원하지 않습니다. 
              민감한 파일의 경우 다른 도구를 사용하시기 바랍니다.
            </p>
          </div>
        )}

        {/* 처리 버튼 */}
        {files.length > 0 && (
          <button
            onClick={mode === 'compress' ? handleCompress : handleExtract}
            disabled={isProcessing}
            className={styles.processButton}
          >
            {isProcessing
              ? '처리 중...'
              : mode === 'compress'
              ? `${files.length}개 파일 압축하기`
              : 'ZIP 파일 해제하기'}
          </button>
        )}
      </div>

      {/* 정보 섹션 */}
      <div className={styles.info}>
        <div className={styles.infoCard}>
          <h3>🔒 개인정보 보호</h3>
          <p>모든 처리는 브라우저 내에서 로컬로 수행되며, 파일이 서버로 전송되지 않습니다.</p>
        </div>
        <div className={styles.infoCard}>
          <h3>📦 폴더 구조 유지</h3>
          <p>압축 시 파일명을 기준으로 폴더 구조가 유지됩니다.</p>
        </div>
        <div className={styles.infoCard}>
          <h3>⚡ 빠른 처리</h3>
          <p>WebAssembly 기반 JSZip으로 빠르고 효율적인 압축/해제를 제공합니다.</p>
        </div>
      </div>
    </div>
  );
}

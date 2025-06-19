import styles from './OutputSettings.module.css';

interface OutputSettingsProps {
  outputDir: string;
  onOutputDirChange: (dir: string) => void;
  baseFileName: string;
  onBaseFileNameChange: (name: string) => void;
}

export default function OutputSettings({
  outputDir,
  onOutputDirChange,
  baseFileName,
  onBaseFileNameChange
}: OutputSettingsProps) {
  const handleDirSelect = async () => {
    try {
      // 브라우저의 디렉토리 선택 API 사용 (Chrome 86+)
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        onOutputDirChange(dirHandle.name);
      } else {
        // 폴백: 기본 다운로드 폴더 사용
        onOutputDirChange('Downloads');
        alert('브라우저가 폴더 선택을 지원하지 않습니다. 기본 다운로드 폴더를 사용합니다.');
      }
    } catch (error) {
      console.log('폴더 선택 취소됨');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.settingGroup}>
        <label className={styles.label}>
          📁 출력 폴더
        </label>
        <div className={styles.dirSelector}>
          <input
            type="text"
            value={outputDir || '기본 다운로드 폴더'}
            placeholder="출력 폴더를 선택하세요"
            readOnly
            className={styles.dirInput}
          />
          <button
            onClick={handleDirSelect}
            className={styles.selectButton}
          >
            📂 폴더 선택
          </button>
        </div>
        <p className={styles.hint}>
          폴더를 선택하지 않으면 브라우저의 기본 다운로드 폴더에 저장됩니다
        </p>
      </div>

      <div className={styles.settingGroup}>
        <label className={styles.label}>
          📝 파일명 접두사
        </label>
        <div className={styles.nameInput}>
          <input
            type="text"
            value={baseFileName}
            onChange={(e) => onBaseFileNameChange(e.target.value)}
            placeholder="파일명 접두사 입력"
            className={styles.textInput}
          />
          <span className={styles.extension}>_part1.pdf, _part2.pdf, ...</span>
        </div>
        <p className={styles.hint}>
          분할된 파일들은 '{baseFileName}_part1.pdf', '{baseFileName}_part2.pdf' 형식으로 저장됩니다
        </p>
      </div>

      <div className={styles.previewSection}>
        <h4>파일명 미리보기</h4>
        <div className={styles.previewList}>
          <div className={styles.previewItem}>
            <span className={styles.fileIcon}>📄</span>
            <span className={styles.fileName}>{baseFileName}_part1.pdf</span>
          </div>
          <div className={styles.previewItem}>
            <span className={styles.fileIcon}>📄</span>
            <span className={styles.fileName}>{baseFileName}_part2.pdf</span>
          </div>
          <div className={styles.previewItem}>
            <span className={styles.fileIcon}>📄</span>
            <span className={styles.fileName}>...</span>
          </div>
        </div>
      </div>

      <div className={styles.infoSection}>
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>💾</span>
          <span>모든 파일이 로컬에 저장됩니다</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>🔒</span>
          <span>개인정보가 외부로 전송되지 않습니다</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>⚡</span>
          <span>빠른 다운로드 속도</span>
        </div>
      </div>
    </div>
  );
} 
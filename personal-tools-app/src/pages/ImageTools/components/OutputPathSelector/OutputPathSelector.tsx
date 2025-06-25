import React, { useRef } from 'react';
import styles from './OutputPathSelector.module.css';

interface OutputPathSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

export default function OutputPathSelector({
  value,
  onChange,
  placeholder = "출력 폴더 선택",
  disabled = false,
  label = "출력 경로"
}: OutputPathSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = () => {
    // 웹에서는 디렉토리 선택이 제한적이므로 사용자가 직접 입력하도록 안내
    const newPath = prompt('저장할 폴더 경로를 입력하세요 (예: C:\\Users\\사용자명\\Downloads)', value || '');
    if (newPath !== null) {
      onChange(newPath);
    }
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>{label}</label>
      
      <div className={styles.inputGroup}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={styles.input}
        />
        
        <button
          type="button"
          onClick={handleFolderSelect}
          disabled={disabled}
          className={styles.selectButton}
          title="폴더 선택"
        >
          📁
        </button>
        
        {value && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className={styles.clearButton}
            title="경로 지우기"
          >
            ✖️
          </button>
        )}
      </div>
      
      <div className={styles.info}>
        <span className={styles.infoIcon}>💡</span>
        <span className={styles.infoText}>
          {value ? 
            `결과 파일이 "${value}" 폴더에 저장됩니다.` : 
            "경로를 지정하지 않으면 브라우저 기본 다운로드 폴더에 저장됩니다."
          }
        </span>
      </div>

      <div className={styles.tips}>
        <h4 className={styles.tipsTitle}>💡 팁</h4>
        <ul className={styles.tipsList}>
          <li>Windows: C:\Users\사용자명\Downloads</li>
          <li>macOS: /Users/사용자명/Downloads</li>
          <li>Linux: /home/사용자명/Downloads</li>
          <li>상대 경로도 사용 가능합니다 (예: ./images)</li>
        </ul>
      </div>
    </div>
  );
} 
import styles from './SeparatorLine.module.css';

interface SeparatorLineProps {
  index: number;
  isActive: boolean;
  isLastItem: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

export default function SeparatorLine({
  isActive,
  isLastItem,
  onAdd,
  onRemove
}: SeparatorLineProps) {
  if (isLastItem) {
    return null; // 마지막 아이템 뒤에는 구분선 표시하지 않음
  }

  return (
    <div className={styles.container}>
      {isActive ? (
        <div className={styles.activeSeparator}>
          <div className={styles.separatorLine}>
            <span className={styles.separatorIcon}>✂️</span>
            <span className={styles.separatorText}>여기서 분할</span>
            <button 
              className={styles.removeBtn}
              onClick={onRemove}
              title="구분선 제거"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.inactiveSeparator}>
          <button 
            className={styles.addBtn}
            onClick={onAdd}
            title="구분선 추가"
          >
            <span className={styles.addIcon}>+</span>
            <span className={styles.addText}>구분선 추가</span>
          </button>
        </div>
      )}
    </div>
  );
} 
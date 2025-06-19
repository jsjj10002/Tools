import { useState } from 'react';
import { MergeablePdf } from '../services/pdfMerger';
import PdfItem from './PdfItem';
import SeparatorLine from './SeparatorLine';
import styles from './PdfList.module.css';

interface PdfListProps {
  pdfs: MergeablePdf[];
  separatorIndices: number[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (id: string) => void;
  onAddSeparator: (index: number) => void;
  onRemoveSeparator: (index: number) => void;
}

export default function PdfList({
  pdfs,
  separatorIndices,
  onReorder,
  onRemove,
  onAddSeparator,
  onRemoveSeparator
}: PdfListProps) {
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverItem(index);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedItem !== null && draggedItem !== toIndex) {
      onReorder(draggedItem, toIndex);
    }
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>📋 PDF 목록 ({pdfs.length}개)</h3>
        <div className={styles.info}>
          총 {pdfs.reduce((sum, pdf) => sum + pdf.totalPages, 0)}페이지
        </div>
      </div>

      <div className={styles.list}>
        {pdfs.map((pdf, index) => (
          <div key={pdf.id}>
            <PdfItem
              pdf={pdf}
              index={index}
              isDragging={draggedItem === index}
              isDragOver={dragOverItem === index}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onRemove={() => onRemove(pdf.id)}
            />
            
            {/* 구분선 표시 및 추가/제거 */}
            <SeparatorLine
              index={index}
              isActive={separatorIndices.includes(index)}
              isLastItem={index === pdfs.length - 1}
              onAdd={() => onAddSeparator(index)}
              onRemove={() => onRemoveSeparator(index)}
            />
          </div>
        ))}
      </div>

      <div className={styles.instructions}>
        <div className={styles.instructionItem}>
          <span className={styles.icon}>🖱️</span>
          <span>PDF를 드래그해서 순서 변경</span>
        </div>
        <div className={styles.instructionItem}>
          <span className={styles.icon}>✂️</span>
          <span>구분선 추가하여 여러 파일로 분할</span>
        </div>
        <div className={styles.instructionItem}>
          <span className={styles.icon}>🗑️</span>
          <span>✕ 버튼으로 PDF 제거</span>
        </div>
      </div>
    </div>
  );
} 
import { useEffect, useState } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { Task } from '@/types/task';
import styles from './CompletionToast.module.css';

interface ToastItem {
  id: string;
  task: Task;
  timestamp: number;
}

export default function CompletionToast() {
  const { tasks } = useTaskStore();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  
  // 완료된 작업 감지
  useEffect(() => {
    const completedTasks = tasks.filter(task => 
      task.status === 'completed' && task.endTime
    );
    
    completedTasks.forEach(task => {
      const existingToast = toasts.find(toast => toast.task.id === task.id);
      if (!existingToast && task.endTime) {
        const newToast: ToastItem = {
          id: `toast_${task.id}`,
          task,
          timestamp: task.endTime
        };
        
        setToasts(prev => [...prev, newToast]);
        
        // 3초 후 자동 제거
        setTimeout(() => {
          setToasts(prev => prev.filter(toast => toast.id !== newToast.id));
        }, 3000);
      }
    });
  }, [tasks]);
  
  const getTaskTypeLabel = (type: string) => {
    const labels = {
      'pdf-to-image': 'PDF → 이미지 변환',
      'image-resize': '이미지 리사이즈',
      'image-compress': '이미지 압축',
      'encoding-convert': '인코딩 변환',
      'format-convert': '포맷 변환',
      'pdf-merge': 'PDF 결합',
      'pdf-split': 'PDF 분할',
      'video-audio-extract': '음성 추출',
      'media-convert': '미디어 변환'
    };
    return labels[type as keyof typeof labels] || type;
  };
  
  if (toasts.length === 0) return null;  
  return (
    <div className={styles.container}>
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={styles.toast}
          onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
        >
          <div className={styles.icon}>✅</div>
          <div className={styles.content}>
            <div className={styles.title}>
              {getTaskTypeLabel(toast.task.type)} 완료
            </div>
            <div className={styles.filename}>
              {toast.task.filename}
            </div>
            {toast.task.totalFiles && toast.task.totalFiles > 1 && (
              <div className={styles.fileCount}>
                {toast.task.totalFiles}개 파일 처리 완료
              </div>
            )}
          </div>
          <button 
            className={styles.closeBtn}
            onClick={(e) => {
              e.stopPropagation();
              setToasts(prev => prev.filter(t => t.id !== toast.id));
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
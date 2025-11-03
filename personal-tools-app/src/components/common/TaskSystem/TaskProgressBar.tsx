import { useMemo, useCallback } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { Task } from '@/types/task';
import styles from './TaskProgressBar.module.css';

interface TaskProgressBarProps {
  className?: string;
}

export default function TaskProgressBar({ className }: TaskProgressBarProps) {
  const { tasks, activeTasksCount, showDetails, toggleDetails } = useTaskStore();
  
  // 진행 중이거나 최근 완료된 작업들을 메모이제이션
  const activeTasks = useMemo(() => {
    return tasks.filter(task => 
      task.status === 'pending' || 
      task.status === 'processing' || 
      (task.status === 'completed' && task.endTime && (Date.now() - task.endTime) < 3000)
    );
  }, [tasks]);
  
  const handleToggleDetails = useCallback(() => {
    toggleDetails();
  }, [toggleDetails]);
  
  if (activeTasksCount === 0 && activeTasks.length === 0) return null;
  
  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.header}>
        <span className={styles.count}>
          {activeTasksCount > 0 
            ? `처리 중인 작업: ${activeTasksCount}개`
            : '작업 완료'
          }
        </span>
        <button 
          className={styles.toggleBtn}
          onClick={handleToggleDetails}
        >
          {showDetails ? '숨기기' : '상세보기'}
        </button>
      </div>
      
      {showDetails && activeTasks.length > 0 && (
        <div className={styles.progressList}>
          {activeTasks.slice(0, 3).map(task => (
            <TaskProgressItem key={task.id} task={task} />
          ))}
          {activeTasks.length > 3 && (
            <div className={styles.moreItems}>
              +{activeTasks.length - 3}개 더
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TaskProgressItemProps {
  task: Task;
}

const TaskProgressItem = function TaskProgressItem({ task }: TaskProgressItemProps) {
  const getTaskTypeLabel = useCallback((type: string) => {
    const labels = {
      'pdf-to-image': 'PDF → 이미지',
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
  }, []);
  
  const taskTypeLabel = useMemo(() => getTaskTypeLabel(task.type), [task.type, getTaskTypeLabel]);
  
  const isCompleted = task.status === 'completed';
  const isError = task.status === 'error';
  
  return (
    <div className={`${styles.progressItem} ${isCompleted ? styles.completed : ''} ${isError ? styles.error : ''}`}>
      <div className={styles.taskInfo}>
        <span className={`${styles.taskType} ${isCompleted ? styles.taskTypeCompleted : ''} ${isError ? styles.taskTypeError : ''}`}>
          {isCompleted ? '✅ ' : isError ? '❌ ' : ''}
          {taskTypeLabel}
        </span>
        <span className={styles.filename}>
          {task.filename}
        </span>
        {task.totalFiles && task.totalFiles > 1 && (
          <span className={styles.fileCount}>
            ({task.currentFile || 1}/{task.totalFiles})
          </span>
        )}
      </div>
      
      <div className={styles.progressBar}>
        <div 
          className={`${styles.progressFill} ${isCompleted ? styles.progressFillCompleted : ''} ${isError ? styles.progressFillError : ''}`}
          style={{ width: `${task.progress}%` }}
        />
        <span className={styles.progressText}>
          {isCompleted ? '완료' : isError ? '오류' : `${Math.round(task.progress)}%`}
        </span>
      </div>
    </div>
  );
};
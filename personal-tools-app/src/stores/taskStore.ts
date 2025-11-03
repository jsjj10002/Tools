import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Task, TaskProgress, TaskStatus } from '@/types/task';
import { debugLog } from '@/utils/debug';

interface TaskStore {
  tasks: Task[];
  activeTasksCount: number;
  showDetails: boolean;
  
  // Actions
  addTask: (task: Omit<Task, 'id' | 'startTime'>) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  updateTaskProgress: (progress: TaskProgress) => void;
  removeTask: (id: string) => void;
  cancelTask: (id: string) => void;
  clearCompletedTasks: () => void;
  getTaskById: (id: string) => Task | undefined;
  getTasksByStatus: (status: TaskStatus) => Task[];
  toggleDetails: () => void;
}

const calculateActiveTasksCount = (tasks: Task[]) => {
  return tasks.filter(task => 
    task.status === 'pending' || task.status === 'processing'
  ).length;
};

export const useTaskStore = create<TaskStore>()(
  devtools(
    (set, get) => ({
      tasks: [],
      activeTasksCount: 0,
      showDetails: false,
      
      addTask: (taskData) => {
        const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const task: Task = {
          ...taskData,
          id,
          startTime: Date.now(),
          progress: 0,
          status: 'pending'
        };
        
        debugLog.log(`[TaskStore] addTask: 새 작업 생성`, { id, type: task.type, filename: task.filename });
        
        set((state) => {
          const newTasks = [...state.tasks, task];
          const newActiveCount = calculateActiveTasksCount(newTasks);
          debugLog.log(`[TaskStore] 작업 추가 후 activeTasksCount: ${state.activeTasksCount} → ${newActiveCount}`);
          debugLog.log(`[TaskStore] 현재 작업 목록:`, newTasks.map(t => ({ id: t.id, status: t.status, progress: t.progress })));
          return {
            tasks: newTasks,
            activeTasksCount: newActiveCount
          };
        });
        
        return id;
      },      
      updateTask: (id, updates) => {
        debugLog.log(`[TaskStore] updateTask: ${id}`, updates);
        
        let shouldScheduleRemoval = false;
        
        set((state) => {
          const taskIndex = state.tasks.findIndex(task => task.id === id);
          if (taskIndex === -1) {
            debugLog.warn(`[TaskStore] 업데이트할 작업 ${id}을 찾을 수 없음`);
            return state;
          }
          
          const newTasks = [...state.tasks];
          const oldTask = newTasks[taskIndex];
          const updatedTask = { ...oldTask, ...updates };
          newTasks[taskIndex] = updatedTask;
          
          const newActiveCount = calculateActiveTasksCount(newTasks);
          debugLog.log(`[TaskStore] activeTasksCount: ${state.activeTasksCount} → ${newActiveCount}`);
          
          // 완료 상태로 변경되었을 때만 제거 예약
          if ((updates.status === 'completed' || updates.status === 'error') && 
              oldTask.status !== 'completed' && oldTask.status !== 'error') {
            shouldScheduleRemoval = true;
          }
          
          return {
            tasks: newTasks,
            activeTasksCount: newActiveCount
          };
        });
        
        // 완료된 작업을 2초 후 자동 제거 (중복 방지)
        if (shouldScheduleRemoval) {
          debugLog.log(`[TaskStore] 작업 ${id} 완료, 2초 후 자동 제거 예약`);
          setTimeout(() => {
            debugLog.log(`[TaskStore] 작업 ${id} 자동 제거 실행`);
            const currentTask = get().getTaskById(id);
            if (currentTask) {
              debugLog.log(`[TaskStore] 작업 ${id} 현재 상태: ${currentTask.status}, 진행률: ${currentTask.progress}%`);
              get().removeTask(id);
            } else {
              debugLog.log(`[TaskStore] 작업 ${id} 이미 제거됨`);
            }
          }, 2000);
        }
      },
      
      updateTaskProgress: (progress) => {
        const { taskId, progress: progressValue } = progress;
        debugLog.log(`[TaskStore] updateTaskProgress: ${taskId}, ${progressValue}%`);
        
        let shouldScheduleRemoval = false;
        
        set((state) => {
          const taskIndex = state.tasks.findIndex(task => task.id === taskId);
          if (taskIndex === -1) {
            debugLog.warn(`[TaskStore] 진행률 업데이트할 작업 ${taskId}을 찾을 수 없음`);
            return state;
          }
          
          const newTasks = [...state.tasks];
          const oldTask = newTasks[taskIndex];
          const isCompleted = progressValue === 100;
          
          const updatedTask = { 
            ...oldTask, 
            progress: progressValue,
            status: (isCompleted ? 'completed' : 'processing') as TaskStatus,
            endTime: isCompleted ? Date.now() : oldTask.endTime
          };
          
          newTasks[taskIndex] = updatedTask;
          
          if (isCompleted && oldTask.status !== 'completed') {
            debugLog.log(`[TaskStore] 작업 ${taskId} 100% 완료로 상태 변경`);
            shouldScheduleRemoval = true;
          }
          
          const newActiveCount = calculateActiveTasksCount(newTasks);
          debugLog.log(`[TaskStore] activeTasksCount: ${state.activeTasksCount} → ${newActiveCount}`);
          
          return {
            tasks: newTasks,
            activeTasksCount: newActiveCount
          };
        });
        
        // 100% 완료 시 2초 후 자동 제거 (중복 방지)
        if (shouldScheduleRemoval) {
          console.log(`[TaskStore] 작업 ${taskId} 100% 완료, 2초 후 자동 제거 예약`);
          setTimeout(() => {
            console.log(`[TaskStore] 작업 ${taskId} 자동 제거 실행`);
            const currentTask = get().getTaskById(taskId);
            if (currentTask) {
              console.log(`[TaskStore] 작업 ${taskId} 현재 상태: ${currentTask.status}, 진행률: ${currentTask.progress}%`);
              get().removeTask(taskId);
            } else {
              console.log(`[TaskStore] 작업 ${taskId} 이미 제거됨`);
            }
          }, 2000);
        }
      },
      
      removeTask: (id) => {
        debugLog.log(`[TaskStore] removeTask 호출: ${id}`);
        set((state) => {
          const taskToRemove = state.tasks.find(task => task.id === id);
          if (taskToRemove) {
            debugLog.log(`[TaskStore] 작업 ${id} 제거됨 (상태: ${taskToRemove.status}, 진행률: ${taskToRemove.progress}%)`);
          } else {
            debugLog.warn(`[TaskStore] 제거할 작업 ${id}을 찾을 수 없음`);
          }
          
          const newTasks = state.tasks.filter(task => task.id !== id);
          const newActiveCount = calculateActiveTasksCount(newTasks);
          debugLog.log(`[TaskStore] 작업 제거 후 activeTasksCount: ${state.activeTasksCount} → ${newActiveCount}`);
          
          return {
            tasks: newTasks,
            activeTasksCount: newActiveCount
          };
        });
      },
      
      cancelTask: (id) => {
        set((state) => {
          const newTasks = state.tasks.map(task =>
            task.id === id ? { ...task, status: 'cancelled' as TaskStatus } : task
          );
          return {
            tasks: newTasks,
            activeTasksCount: calculateActiveTasksCount(newTasks)
          };
        });
      },
      
      clearCompletedTasks: () => {
        set((state) => {
          const newTasks = state.tasks.filter(task => 
            task.status !== 'completed' && task.status !== 'error' && task.status !== 'cancelled'
          );
          return {
            tasks: newTasks,
            activeTasksCount: calculateActiveTasksCount(newTasks)
          };
        });
      },
      
      getTaskById: (id) => {
        return get().tasks.find(task => task.id === id);
      },
      
      getTasksByStatus: (status) => {
        return get().tasks.filter(task => task.status === status);
      },
      
      toggleDetails: () => {
        set((state) => ({
          showDetails: !state.showDetails
        }));
      }
    }),
    { name: 'task-store' }
  )
);
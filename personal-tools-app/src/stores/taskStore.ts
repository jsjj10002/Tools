import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Task, TaskProgress, TaskStatus } from '@/types/task';

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
        
        set((state) => {
          const newTasks = [...state.tasks, task];
          return {
            tasks: newTasks,
            activeTasksCount: calculateActiveTasksCount(newTasks)
          };
        });
        
        return id;
      },      
      updateTask: (id, updates) => {
        console.log(`[TaskStore] updateTask: ${id}`, updates);
        set((state) => {
          const newTasks = state.tasks.map(task =>
            task.id === id ? { ...task, ...updates } : task
          );
          const newActiveCount = calculateActiveTasksCount(newTasks);
          console.log(`[TaskStore] activeTasksCount: ${state.activeTasksCount} → ${newActiveCount}`);
          return {
            tasks: newTasks,
            activeTasksCount: newActiveCount
          };
        });
        
        // 완료된 작업을 3초 후 자동 제거
        if (updates.status === 'completed' || updates.status === 'error') {
          console.log(`[TaskStore] 작업 ${id} 완료, 3초 후 자동 제거 예약`);
          setTimeout(() => {
            console.log(`[TaskStore] 작업 ${id} 자동 제거 실행`);
            get().removeTask(id);
          }, 3000);
        }
      },
      
      updateTaskProgress: (progress) => {
        const { taskId, progress: progressValue } = progress;
        console.log(`[TaskStore] updateTaskProgress: ${taskId}, ${progressValue}%`);
        set((state) => {
          const newTasks = state.tasks.map(task => {
            if (task.id === taskId) {
              const isCompleted = progressValue === 100;
              const updatedTask = { 
                ...task, 
                progress: progressValue,
                status: isCompleted ? 'completed' : 'processing',
                endTime: isCompleted ? Date.now() : task.endTime
              };
              if (isCompleted) {
                console.log(`[TaskStore] 작업 ${taskId} 100% 완료로 상태 변경`);
              }
              return updatedTask;
            }
            return task;
          });
          const newActiveCount = calculateActiveTasksCount(newTasks);
          console.log(`[TaskStore] activeTasksCount: ${state.activeTasksCount} → ${newActiveCount}`);
          return {
            tasks: newTasks,
            activeTasksCount: newActiveCount
          };
        });
        
        // 100% 완료 시 3초 후 자동 제거
        if (progressValue === 100) {
          console.log(`[TaskStore] 작업 ${taskId} 100% 완료, 3초 후 자동 제거 예약`);
          setTimeout(() => {
            console.log(`[TaskStore] 작업 ${taskId} 자동 제거 실행`);
            get().removeTask(taskId);
          }, 3000);
        }
      },
      
      removeTask: (id) => {
        set((state) => {
          const newTasks = state.tasks.filter(task => task.id !== id);
          return {
            tasks: newTasks,
            activeTasksCount: calculateActiveTasksCount(newTasks)
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
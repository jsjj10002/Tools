import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskStore } from '@/stores/taskStore';

describe('useTaskStore', () => {
  beforeEach(() => {
    // 각 테스트 전에 스토어 초기화
    const { result } = renderHook(() => useTaskStore());
    act(() => {
      // 모든 작업 제거
      result.current.tasks.forEach(task => {
        result.current.removeTask(task.id);
      });
    });
  });

  it('초기 상태를 올바르게 설정해야 함', () => {
    const { result } = renderHook(() => useTaskStore());

    expect(result.current.tasks).toEqual([]);
    expect(result.current.activeTasksCount).toBe(0);
    expect(result.current.showDetails).toBe(false);
  });

  it('작업을 추가할 수 있어야 함', () => {
    const { result } = renderHook(() => useTaskStore());

    act(() => {
      const taskId = result.current.addTask({
        type: 'pdf-to-image',
        filename: 'test.pdf',
        status: 'pending',
        progress: 0
      });

      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');
    });

    expect(result.current.tasks.length).toBe(1);
    expect(result.current.tasks[0].filename).toBe('test.pdf');
    expect(result.current.tasks[0].status).toBe('pending');
    expect(result.current.activeTasksCount).toBe(1);
  });

  it('작업을 업데이트할 수 있어야 함', () => {
    const { result } = renderHook(() => useTaskStore());

    let taskId: string;

    act(() => {
      taskId = result.current.addTask({
        type: 'pdf-to-image',
        filename: 'test.pdf',
        status: 'pending',
        progress: 0
      });
    });

    act(() => {
      result.current.updateTask(taskId, {
        status: 'processing',
        progress: 50
      });
    });

    const task = result.current.getTaskById(taskId);
    expect(task?.status).toBe('processing');
    expect(task?.progress).toBe(50);
  });

  it('진행률을 업데이트할 수 있어야 함', () => {
    const { result } = renderHook(() => useTaskStore());

    let taskId: string;

    act(() => {
      taskId = result.current.addTask({
        type: 'pdf-to-image',
        filename: 'test.pdf',
        status: 'pending',
        progress: 0
      });
    });

    act(() => {
      result.current.updateTaskProgress({
        taskId,
        progress: 75
      });
    });

    const task = result.current.getTaskById(taskId);
    expect(task?.progress).toBe(75);
    expect(task?.status).toBe('processing');
    expect(result.current.activeTasksCount).toBe(1);
  });

  it('100% 완료 시 completed 상태로 변경해야 함', () => {
    const { result } = renderHook(() => useTaskStore());

    let taskId: string;

    act(() => {
      taskId = result.current.addTask({
        type: 'pdf-to-image',
        filename: 'test.pdf',
        status: 'pending',
        progress: 0
      });
    });

    act(() => {
      result.current.updateTaskProgress({
        taskId,
        progress: 100
      });
    });

    const task = result.current.getTaskById(taskId);
    expect(task?.progress).toBe(100);
    expect(task?.status).toBe('completed');
    expect(task?.endTime).toBeDefined();
  });

  it('작업을 제거할 수 있어야 함', () => {
    const { result } = renderHook(() => useTaskStore());

    let taskId: string;

    act(() => {
      taskId = result.current.addTask({
        type: 'pdf-to-image',
        filename: 'test.pdf',
        status: 'pending',
        progress: 0
      });
    });

    expect(result.current.tasks.length).toBe(1);

    act(() => {
      result.current.removeTask(taskId);
    });

    expect(result.current.tasks.length).toBe(0);
    expect(result.current.getTaskById(taskId)).toBeUndefined();
  });

  it('상태별로 작업을 필터링할 수 있어야 함', () => {
    const { result } = renderHook(() => useTaskStore());

    act(() => {
      result.current.addTask({
        type: 'pdf-to-image',
        filename: 'test1.pdf',
        status: 'pending',
        progress: 0
      });

      result.current.addTask({
        type: 'pdf-merge',
        filename: 'test2.pdf',
        status: 'completed',
        progress: 100
      });
    });

    const pendingTasks = result.current.getTasksByStatus('pending');
    expect(pendingTasks.length).toBe(1);
    expect(pendingTasks[0].filename).toBe('test1.pdf');

    const completedTasks = result.current.getTasksByStatus('completed');
    expect(completedTasks.length).toBe(1);
    expect(completedTasks[0].filename).toBe('test2.pdf');
  });

  it('activeTasksCount를 올바르게 계산해야 함', () => {
    const { result } = renderHook(() => useTaskStore());

    act(() => {
      result.current.addTask({
        type: 'pdf-to-image',
        filename: 'test1.pdf',
        status: 'pending',
        progress: 0
      });

      result.current.addTask({
        type: 'pdf-merge',
        filename: 'test2.pdf',
        status: 'processing',
        progress: 50
      });

      result.current.addTask({
        type: 'pdf-split',
        filename: 'test3.pdf',
        status: 'completed',
        progress: 100
      });
    });

    expect(result.current.activeTasksCount).toBe(2);
  });

  it('상세보기를 토글할 수 있어야 함', () => {
    const { result } = renderHook(() => useTaskStore());

    expect(result.current.showDetails).toBe(false);

    act(() => {
      result.current.toggleDetails();
    });

    expect(result.current.showDetails).toBe(true);

    act(() => {
      result.current.toggleDetails();
    });

    expect(result.current.showDetails).toBe(false);
  });

  it('작업을 취소할 수 있어야 함', () => {
    const { result } = renderHook(() => useTaskStore());

    let taskId: string;

    act(() => {
      taskId = result.current.addTask({
        type: 'pdf-to-image',
        filename: 'test.pdf',
        status: 'processing',
        progress: 50
      });
    });

    act(() => {
      result.current.cancelTask(taskId);
    });

    const task = result.current.getTaskById(taskId);
    expect(task?.status).toBe('cancelled');
    expect(result.current.activeTasksCount).toBe(0);
  });
});

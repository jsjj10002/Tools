import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '@/stores/appStore';

describe('useAppStore', () => {
  beforeEach(() => {
    // 스토어 초기화
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.setOnlineStatus(true);
      result.current.setSidebarOpen(false);
      // theme은 기본값이 'light'이므로 변경하지 않음
    });
  });

  it('초기 상태를 올바르게 설정해야 함', () => {
    const { result } = renderHook(() => useAppStore());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.theme).toBe('light');
    expect(result.current.sidebarOpen).toBe(false);
  });

  it('온라인 상태를 변경할 수 있어야 함', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setOnlineStatus(false);
    });

    expect(result.current.isOnline).toBe(false);

    act(() => {
      result.current.setOnlineStatus(true);
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('테마를 토글할 수 있어야 함', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
  });

  it('사이드바 상태를 토글할 수 있어야 함', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.toggleSidebar();
    });

    expect(result.current.sidebarOpen).toBe(true);

    act(() => {
      result.current.toggleSidebar();
    });

    expect(result.current.sidebarOpen).toBe(false);
  });

  it('사이드바 상태를 직접 설정할 수 있어야 함', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setSidebarOpen(true);
    });

    expect(result.current.sidebarOpen).toBe(true);

    act(() => {
      result.current.setSidebarOpen(false);
    });

    expect(result.current.sidebarOpen).toBe(false);
  });
});

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface IAppState {
  // 앱 상태
  isOnline: boolean;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  
  // 액션
  setOnlineStatus: (isOnline: boolean) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<IAppState>()(
  devtools(
    (set) => ({
      // 초기 상태
      isOnline: navigator.onLine,
      theme: 'light',
      sidebarOpen: false,
      
      // 액션
      setOnlineStatus: (isOnline) => set({ isOnline }),
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),
      toggleSidebar: () => set((state) => ({ 
        sidebarOpen: !state.sidebarOpen 
      })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    { name: 'app-store' }
  )
);
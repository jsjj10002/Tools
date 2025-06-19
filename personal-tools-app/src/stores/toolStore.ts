import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ITool, IToolState } from '@/types/tool';
import { IProcessResult, ProcessStatus } from '@/types/common';

interface IToolStoreState extends IToolState {
  availableTools: ITool[];
  
  // 액션
  setCurrentTool: (tool: ITool | null) => void;
  setStatus: (status: ProcessStatus) => void;
  setProgress: (progress: number) => void;
  setResult: (result: IProcessResult | null) => void;
  setError: (error: string | null) => void;
  registerTool: (tool: ITool) => void;
  unregisterTool: (toolId: string) => void;
  resetToolState: () => void;
}

export const useToolStore = create<IToolStoreState>()(
  devtools(
    (set) => ({
      // 초기 상태
      currentTool: null,
      status: 'idle',
      progress: 0,
      result: null,
      error: null,
      availableTools: [],
      
      // 액션
      setCurrentTool: (tool) => set({ currentTool: tool }),
      setStatus: (status) => set({ status }),
      setProgress: (progress) => set({ progress }),
      setResult: (result) => set({ result }),
      setError: (error) => set({ error }),
      
      registerTool: (tool) => set((state) => ({
        availableTools: [...state.availableTools, tool]
      })),
      
      unregisterTool: (toolId) => set((state) => ({
        availableTools: state.availableTools.filter(t => t.id !== toolId)
      })),
      
      resetToolState: () => set({
        currentTool: null,
        status: 'idle',
        progress: 0,
        result: null,
        error: null
      }),
    }),
    { name: 'tool-store' }
  )
);
export interface IProcessResult {
    success: boolean;
    data?: any;
    error?: string;
    fileName?: string;
    fileSize?: number;
    processingTime?: number;
  }
  
  export interface IFileInfo {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  }
  
  export type ProcessStatus = 'idle' | 'processing' | 'completed' | 'error';
  
  export type ToolCategory = 'file' | 'image' | 'video' | 'ai';
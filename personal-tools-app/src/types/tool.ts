import { IProcessResult, IFileInfo, ProcessStatus, ToolCategory } from './common';

export interface ITool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  offlineSupported: boolean;
  acceptedFileTypes: string[];
  maxFileSize?: number; // bytes
  process: (input: File | FileList) => Promise<IProcessResult>;
  validate: (file: File) => boolean;
}

export interface IToolState {
  currentTool: ITool | null;
  status: ProcessStatus;
  progress: number;
  result: IProcessResult | null;
  error: string | null;
}
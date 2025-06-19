export type TaskType = 
  | 'pdf-to-image'
  | 'image-resize'
  | 'image-compress'
  | 'encoding-convert'
  | 'format-convert'
  | 'pdf-merge'
  | 'pdf-split'
  | 'video-audio-extract'
  | 'media-convert';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  progress: number; // 0-100
  filename: string;
  totalFiles?: number; // 배치 처리시
  currentFile?: number; // 현재 처리중인 파일 번호
  result?: string | string[]; // 결과 파일 경로
  error?: string;
  startTime: number;
  endTime?: number;
  config?: Record<string, any>; // 작업별 설정
}

export interface TaskProgress {
  taskId: string;
  progress: number;
  currentStep?: string;
  message?: string;
}

export interface PdfToImageConfig {
  startPage: number;
  endPage: number;
  quality: 'medium' | 'high' | 'ultra';
  format: 'png' | 'jpg' | 'webp';
  outputPath: string;
  createFolder: boolean; // filename_img 폴더 생성 여부
}

export interface ImageProcessConfig {
  quality?: number; // 10-80 압축률
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
  format?: 'png' | 'jpg' | 'webp' | 'avif';
  outputPath: string;
}

export interface PdfMergeConfig {
  outputFileName: string;
  outputPath: string;
  createSeparateFiles: boolean; // 구분선으로 여러 파일 생성 여부
  separatorIndices: number[]; // 구분선 위치 (파일 인덱스)
}

export interface PdfSplitConfig {
  outputPath: string;
  splitPages: number[]; // 분할할 페이지 번호들
  outputFilePrefix: string;
}

export interface MergeablePdf {
  file: File;
  id: string;
  totalPages: number;
  thumbnailUrl?: string;
  isLoaded: boolean;
}
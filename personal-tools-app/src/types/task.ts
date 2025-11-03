export type TaskType = 
  | 'pdf-to-image'
  | 'image-resize'
  | 'image-compress'
  | 'image-format-convert'
  | 'encoding-convert'
  | 'format-convert'
  | 'document-to-pdf'
  | 'pdf-merge'
  | 'pdf-split'
  | 'zip-compress'
  | 'zip-extract'
  | 'video-audio-extract'
  | 'audio-format-convert'
  | 'video-format-convert'
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

export interface EncodingConvertConfig {
  sourceEncoding?: string; // 자동 감지시 undefined
  targetEncoding: string; // UTF-8, EUC-KR, ASCII 등
  outputPath: string;
  overwriteOriginal: boolean; // 원본 파일 덮어쓰기 여부
}

export interface FormatConvertConfig {
  sourceFormat: 'csv' | 'json' | 'xml';
  targetFormat: 'csv' | 'json' | 'xml';
  outputPath: string;
  preserveStructure: boolean; // 데이터 구조 유지 여부
}

export interface DocumentToPdfConfig {
  documentType: 'html' | 'markdown' | 'ipynb';
  outputPath: string;
  preserveStyles: boolean; // 스타일 유지 여부
  pageSize: 'A4' | 'Letter' | 'Legal';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface VideoAudioExtractConfig {
  audioFormat: 'mp3' | 'wav' | 'aac' | 'flac';
  quality: 'low' | 'medium' | 'high' | 'lossless';
  outputPath: string;
  startTime?: number; // 시작 시간 (초)
  duration?: number; // 추출 길이 (초)
}

export interface MediaConvertConfig {
  sourceFormat: string;
  targetFormat: string;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  outputPath: string;
  videoCodec?: string;
  audioCodec?: string;
  bitrate?: number;
  resolution?: {
    width: number;
    height: number;
  };
}
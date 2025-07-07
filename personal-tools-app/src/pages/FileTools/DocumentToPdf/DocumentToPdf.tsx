import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { marked } from 'marked';
import styles from './DocumentToPdf.module.css';

interface DocumentFile {
  file: File;
  id: string;
  type: 'markdown' | 'html' | 'ipynb';
  content: string;
  htmlContent: string;
  preview: string;
  detectedEncoding?: string;
  confidence?: number;
}

interface PdfSettings {
  scale: number;
  pageSize: 'A4' | 'A3' | 'Letter' | 'Legal' | 'Tabloid';
  orientation: 'portrait' | 'landscape';
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  quality: number;
}

const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
  Legal: { width: 216, height: 356 },
  Tabloid: { width: 279, height: 432 }
};

const SCALE_PRESETS = [
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1.0 },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5 }
];

// 브라우저 호환 인코딩 감지 함수 (간소화 버전)
const detectTextEncoding = (bytes: Uint8Array): { encoding: string; confidence: number } => {
  // BOM 감지
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return { encoding: 'UTF-8', confidence: 100 };
  }
  
  if (bytes.length >= 2) {
    if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
      return { encoding: 'UTF-16LE', confidence: 100 };
    } else if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
      return { encoding: 'UTF-16BE', confidence: 100 };
    }
  }
  
  // ASCII 검사
  let isAscii = true;
  for (let i = 0; i < Math.min(bytes.length, 1000); i++) {
    if (bytes[i] > 127) {
      isAscii = false;
      break;
    }
  }
  
  if (isAscii) {
    return { encoding: 'ASCII', confidence: 95 };
  }
  
  // UTF-8 유효성 간단 검사
  let utf8Valid = true;
  let i = 0;
  
  while (i < Math.min(bytes.length, 1000) && utf8Valid) {
    const byte = bytes[i];
    
    if (byte <= 0x7F) {
      i++;
    } else if ((byte & 0xE0) === 0xC0) {
      if (i + 1 < bytes.length && (bytes[i + 1] & 0xC0) === 0x80) {
        i += 2;
      } else {
        utf8Valid = false;
      }
    } else if ((byte & 0xF0) === 0xE0) {
      if (i + 2 < bytes.length && 
          (bytes[i + 1] & 0xC0) === 0x80 && 
          (bytes[i + 2] & 0xC0) === 0x80) {
        i += 3;
      } else {
        utf8Valid = false;
      }
    } else {
      utf8Valid = false;
    }
  }
  
  return utf8Valid ? 
    { encoding: 'UTF-8', confidence: 85 } : 
    { encoding: 'ISO-8859-1', confidence: 60 };
};

// 브라우저 호환 텍스트 읽기
const readTextContent = (bytes: Uint8Array, encoding: string): string => {
  try {
    const encodingMap: { [key: string]: string } = {
      'UTF-8': 'utf-8',
      'UTF-16LE': 'utf-16le',
      'UTF-16BE': 'utf-16be',
      'ASCII': 'ascii',
      'ISO-8859-1': 'latin1',
    };
    
    const decoderEncoding = encodingMap[encoding] || 'utf-8';
    const decoder = new TextDecoder(decoderEncoding, { fatal: false });
    return decoder.decode(bytes);
  } catch (error) {
    console.warn(`인코딩 ${encoding} 실패, UTF-8로 시도:`, error);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    return decoder.decode(bytes);
  }
};

// HTML 정화 함수 (보안 및 스타일 간섭 방지)
const sanitizeHtml = (html: string): string => {
  // 위험한 태그 제거
  let sanitized = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '')
    .replace(/<input[^>]*>/gi, '')
    .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '');
  
  // 스타일을 PDF 컨테이너 내부로 제한
  sanitized = sanitized.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
    // CSS 규칙을 .pdf-content 클래스 내부로 제한
    const scopedCss = css.replace(/([^{}]+){/g, (rule: string) => {
      const selector = rule.slice(0, -1).trim();
      if (selector.startsWith('@') || selector.includes('.pdf-content')) {
        return rule;
      }
      return `.pdf-content ${selector} {`;
    });
    return `<style>${scopedCss}</style>`;
  });
  
  return sanitized;
};

export default function DocumentToPdf() {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfSettings, setPdfSettings] = useState<PdfSettings>({
    scale: 1.0,
    pageSize: 'A4',
    orientation: 'portrait',
    margin: { top: 20, right: 20, bottom: 20, left: 20 },
    quality: 0.8
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // 파일 타입 감지
  const detectFileType = (file: File): 'markdown' | 'html' | 'ipynb' | null => {
    const extension = file.name.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'html':
      case 'htm':
        return 'html';
      case 'ipynb':
        return 'ipynb';
      default:
        return null;
    }
  };

  // Markdown을 HTML로 변환
  const convertMarkdownToHtml = (markdown: string): string => {
    try {
      return marked(markdown, {
        breaks: true,
        gfm: true,
      });
    } catch (error) {
      console.error('Markdown 변환 오류:', error);
      return `<pre>${markdown}</pre>`;
    }
  };

  // Jupyter Notebook을 HTML로 변환
  const convertIpynbToHtml = (content: string): string => {
    try {
      const notebook = JSON.parse(content);
      let html = '<div class="jupyter-notebook">';
      
      if (notebook.cells && Array.isArray(notebook.cells)) {
        notebook.cells.forEach((cell: any) => {
          if (cell.cell_type === 'markdown' && cell.source) {
            const markdownContent = Array.isArray(cell.source) 
              ? cell.source.join('') 
              : cell.source;
            html += `<div class="markdown-cell">${marked(markdownContent)}</div>`;
          } else if (cell.cell_type === 'code' && cell.source) {
            const codeContent = Array.isArray(cell.source) 
              ? cell.source.join('') 
              : cell.source;
            html += `<div class="code-cell">`;
            html += `<div class="code-input"><pre><code>${codeContent}</code></pre></div>`;
            
            if (cell.outputs && Array.isArray(cell.outputs)) {
              cell.outputs.forEach((output: any) => {
                if (output.output_type === 'stream' && output.text) {
                  const outputText = Array.isArray(output.text) 
                    ? output.text.join('') 
                    : output.text;
                  html += `<div class="code-output"><pre>${outputText}</pre></div>`;
                } else if (output.output_type === 'display_data' || output.output_type === 'execute_result') {
                  if (output.data && output.data['text/plain']) {
                    const outputText = Array.isArray(output.data['text/plain']) 
                      ? output.data['text/plain'].join('') 
                      : output.data['text/plain'];
                    html += `<div class="code-output"><pre>${outputText}</pre></div>`;
                  }
                }
              });
            }
            html += '</div>';
          }
        });
      }
      
      html += '</div>';
      
      // Jupyter 스타일 추가
      const jupyterStyles = `
        <style>
          .pdf-content .jupyter-notebook { font-family: Arial, sans-serif; line-height: 1.6; }
          .pdf-content .markdown-cell { margin: 20px 0; }
          .pdf-content .code-cell { margin: 20px 0; }
          .pdf-content .code-input { background: #f8f9fa; padding: 15px; border-left: 4px solid #007acc; }
          .pdf-content .code-input pre { margin: 0; font-family: 'Courier New', monospace; }
          .pdf-content .code-output { background: #fff; padding: 10px; border-left: 4px solid #28a745; margin-top: 10px; }
          .pdf-content .code-output pre { margin: 0; font-family: 'Courier New', monospace; color: #333; }
        </style>
      `;
      
      return jupyterStyles + html;
    } catch (error) {
      console.error('Jupyter Notebook 파싱 오류:', error);
      return `<pre>${content}</pre>`;
    }
  };

  const processFiles = async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    
    const newFiles: DocumentFile[] = [];
    
    for (const file of acceptedFiles) {
      try {
        const fileType = detectFileType(file);
        if (!fileType) {
          alert(`파일 "${file.name}"은 지원되지 않는 형식입니다.`);
          continue;
        }
        
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const encodingResult = detectTextEncoding(bytes);
        const content = readTextContent(bytes, encodingResult.encoding);
        
        let htmlContent = '';
        
        switch (fileType) {
          case 'markdown':
            htmlContent = convertMarkdownToHtml(content);
            break;
          case 'html':
            htmlContent = sanitizeHtml(content);
            break;
          case 'ipynb':
            htmlContent = convertIpynbToHtml(content);
            break;
        }
        
        const preview = content.length > 500 ? content.substring(0, 500) + '...' : content;
        
        newFiles.push({
          file,
          id: Math.random().toString(36).substr(2, 9),
          type: fileType,
          content,
          htmlContent,
          preview,
          detectedEncoding: encodingResult.encoding,
          confidence: encodingResult.confidence,
        });
      } catch (error) {
        console.error('파일 처리 오류:', error);
        alert(`파일 "${file.name}" 처리 중 오류가 발생했습니다: ${error}`);
      }
    }
    
    setFiles(prev => [...prev, ...newFiles]);
    setIsProcessing(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processFiles,
    accept: {
      'text/markdown': ['.md', '.markdown'],
      'text/html': ['.html', '.htm'],
      'application/json': ['.ipynb'],
    },
    multiple: true,
  });

  // PDF 설정 업데이트
  const updatePdfSettings = (updates: Partial<PdfSettings>) => {
    setPdfSettings(prev => ({ ...prev, ...updates }));
  };

  const updateMargin = (position: keyof PdfSettings['margin'], value: number) => {
    setPdfSettings(prev => ({
      ...prev,
      margin: { ...prev.margin, [position]: value }
    }));
  };

  // PDF 생성
  const generatePdf = async (docFile: DocumentFile) => {
    if (!previewRef.current) return;
    
    try {
      setIsProcessing(true);
      
      // 임시 컨테이너 생성 (화면에 보이지 않음)
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '800px';
      tempContainer.style.padding = '40px';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.lineHeight = '1.6';
      tempContainer.className = 'pdf-content';
      
      // 기본 스타일 추가
      const baseStyles = `
        <style>
          .pdf-content { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .pdf-content h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
          .pdf-content h2 { color: #34495e; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; }
          .pdf-content h3 { color: #7f8c8d; }
          .pdf-content pre { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007acc; }
          .pdf-content code { background: #f1f2f6; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
          .pdf-content blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 20px; color: #666; }
          .pdf-content table { border-collapse: collapse; width: 100%; margin: 20px 0; }
          .pdf-content table th, .pdf-content table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .pdf-content table th { background-color: #f2f2f2; font-weight: bold; }
        </style>
      `;
      
      tempContainer.innerHTML = baseStyles + docFile.htmlContent;
      document.body.appendChild(tempContainer);
      
      // 페이지 크기 계산
      const pageSize = PAGE_SIZES[pdfSettings.pageSize];
      const isLandscape = pdfSettings.orientation === 'landscape';
      const pageWidth = isLandscape ? pageSize.height : pageSize.width;
      const pageHeight = isLandscape ? pageSize.width : pageSize.height;
      
      // PDF 생성
      const pdf = new jsPDF({
        orientation: pdfSettings.orientation,
        unit: 'mm',
        format: [pageWidth, pageHeight],
      });
      
      // 컨텐츠를 이미지로 변환
      const canvas = await toPng(tempContainer, {
        quality: pdfSettings.quality,
        backgroundColor: 'white',
        width: 800 * pdfSettings.scale,
        height: tempContainer.scrollHeight * pdfSettings.scale,
      });
      
      // 이미지를 PDF에 추가
      const imgWidth = pageWidth - pdfSettings.margin.left - pdfSettings.margin.right;
      const imgHeight = (tempContainer.scrollHeight * imgWidth) / 800;
      
      // 페이지 높이에 맞게 분할
      const maxContentHeight = pageHeight - pdfSettings.margin.top - pdfSettings.margin.bottom;
      
      if (imgHeight <= maxContentHeight) {
        // 한 페이지에 들어감
        pdf.addImage(
          canvas,
          'PNG',
          pdfSettings.margin.left,
          pdfSettings.margin.top,
          imgWidth,
          imgHeight
        );
      } else {
        // 여러 페이지에 걸쳐 분할
        let remainingHeight = imgHeight;
        let currentY = 0;
        let pageCount = 0;
        
        while (remainingHeight > 0) {
          if (pageCount > 0) {
            pdf.addPage();
          }
          
          const heightToAdd = Math.min(remainingHeight, maxContentHeight);
          const sourceY = currentY * (800 / imgWidth);
          const sourceHeight = heightToAdd * (800 / imgWidth);
          
          // 캔버스에서 해당 부분 추출
          const pageCanvas = document.createElement('canvas');
          const pageCtx = pageCanvas.getContext('2d');
          const img = new Image();
          
          await new Promise((resolve) => {
            img.onload = () => {
              pageCanvas.width = 800;
              pageCanvas.height = sourceHeight;
              pageCtx?.drawImage(
                img,
                0, sourceY,
                800, sourceHeight,
                0, 0,
                800, sourceHeight
              );
              
              pdf.addImage(
                pageCanvas.toDataURL('image/png'),
                'PNG',
                pdfSettings.margin.left,
                pdfSettings.margin.top,
                imgWidth,
                heightToAdd
              );
              
              resolve(null);
            };
            img.src = canvas;
          });
          
          remainingHeight -= heightToAdd;
          currentY += heightToAdd;
          pageCount++;
        }
      }
      
      // PDF 다운로드
      const fileName = `${docFile.file.name.split('.')[0]}.pdf`;
      pdf.save(fileName);
      
      // 임시 컨테이너 제거
      document.body.removeChild(tempContainer);
      
    } catch (error) {
      console.error('PDF 생성 오류:', error);
      alert(`PDF 생성 중 오류가 발생했습니다: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const clearAll = () => {
    setFiles([]);
  };

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroIcon}>📄➡️📑</div>
        <h1 className={styles.heroTitle}>문서 → PDF 변환</h1>
        <p className={styles.heroSubtitle}>
          Markdown, HTML, Jupyter Notebook 파일을 고품질 PDF로 변환하세요. 
          자동 인코딩 감지, 다양한 페이지 설정, 실시간 미리보기를 지원합니다.
        </p>
        
        <div className={styles.formatShowcase}>
          <div className={styles.formatBadge}>
            <span className={styles.formatIcon}>📝</span>
            <span className={styles.formatLabel}>Markdown</span>
          </div>
          <div className={styles.formatBadge}>
            <span className={styles.formatIcon}>🌐</span>
            <span className={styles.formatLabel}>HTML</span>
          </div>
          <div className={styles.formatBadge}>
            <span className={styles.formatIcon}>📓</span>
            <span className={styles.formatLabel}>Jupyter</span>
          </div>
          <div className={styles.formatBadge}>
            <span className={styles.formatIcon}>📑</span>
            <span className={styles.formatLabel}>PDF</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {files.length === 0 ? (
          <div className={styles.uploadSection}>
            <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.dragActive : ''}`}>
              <input {...getInputProps()} />
              <div className={styles.dropzoneContent}>
                <div className={styles.uploadIcon}>📄</div>
                <h3>문서 파일을 드래그하거나 클릭하여 업로드</h3>
                <p>Markdown (.md), HTML (.html), Jupyter Notebook (.ipynb) 파일을 지원합니다</p>
                <div className={styles.uploadFeatures}>
                  <span>🎯 자동 인코딩 감지</span>
                  <span>🖼️ 고품질 변환</span>
                  <span>📐 페이지 설정</span>
                  <span>👁️ 실시간 미리보기</span>
                </div>
              </div>
            </div>
            
            <div className={styles.uploadActions}>
              <button 
                className={styles.primaryButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                <span>📁</span>
                파일 선택
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.processingArea}>
            <div className={styles.controlPanel}>
              <div className={styles.panelHeader}>
                <h3>🔧 PDF 설정</h3>
                <div className={styles.fileCounter}>
                  <span>📄</span>
                  <span className={styles.fileCount}>{files.length}</span>
                  <span>개 파일</span>
                </div>
              </div>

              {/* 배율 설정 */}
              <div className={styles.settingGroup}>
                <h4>📏 배율 설정</h4>
                <div className={styles.scaleControls}>
                  <div className={styles.scaleSlider}>
                    <label htmlFor="scale-slider">배율: {Math.round(pdfSettings.scale * 100)}%</label>
                    <input
                      id="scale-slider"
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.1"
                      value={pdfSettings.scale}
                      onChange={(e) => updatePdfSettings({ scale: parseFloat(e.target.value) })}
                      className={styles.slider}
                    />
                  </div>
                  <div className={styles.scalePresets}>
                    {SCALE_PRESETS.map(preset => (
                      <button
                        key={preset.value}
                        className={`${styles.presetButton} ${pdfSettings.scale === preset.value ? styles.active : ''}`}
                        onClick={() => updatePdfSettings({ scale: preset.value })}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 용지 설정 */}
              <div className={styles.settingGroup}>
                <h4>📄 용지 설정</h4>
                <div className={styles.pageSettings}>
                  <div className={styles.settingRow}>
                    <label htmlFor="page-size">용지 크기:</label>
                    <select
                      id="page-size"
                      value={pdfSettings.pageSize}
                      onChange={(e) => updatePdfSettings({ pageSize: e.target.value as any })}
                      className={styles.select}
                    >
                      <option value="A4">A4 (210×297mm)</option>
                      <option value="A3">A3 (297×420mm)</option>
                      <option value="Letter">Letter (216×279mm)</option>
                      <option value="Legal">Legal (216×356mm)</option>
                      <option value="Tabloid">Tabloid (279×432mm)</option>
                    </select>
                  </div>
                  
                  <div className={styles.settingRow}>
                    <label htmlFor="orientation">방향:</label>
                    <select
                      id="orientation"
                      value={pdfSettings.orientation}
                      onChange={(e) => updatePdfSettings({ orientation: e.target.value as any })}
                      className={styles.select}
                    >
                      <option value="portrait">세로 (Portrait)</option>
                      <option value="landscape">가로 (Landscape)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 여백 설정 */}
              <div className={styles.settingGroup}>
                <h4>📐 여백 설정</h4>
                <div className={styles.marginSettings}>
                  <div className={styles.marginGrid}>
                    <div className={styles.marginControl}>
                      <label htmlFor="margin-top">상단</label>
                      <input
                        id="margin-top"
                        type="number"
                        min="0"
                        max="50"
                        value={pdfSettings.margin.top}
                        onChange={(e) => updateMargin('top', parseInt(e.target.value) || 0)}
                        className={styles.numberInput}
                      />
                      <span>mm</span>
                    </div>
                    
                    <div className={styles.marginControl}>
                      <label htmlFor="margin-right">우측</label>
                      <input
                        id="margin-right"
                        type="number"
                        min="0"
                        max="50"
                        value={pdfSettings.margin.right}
                        onChange={(e) => updateMargin('right', parseInt(e.target.value) || 0)}
                        className={styles.numberInput}
                      />
                      <span>mm</span>
                    </div>
                    
                    <div className={styles.marginControl}>
                      <label htmlFor="margin-bottom">하단</label>
                      <input
                        id="margin-bottom"
                        type="number"
                        min="0"
                        max="50"
                        value={pdfSettings.margin.bottom}
                        onChange={(e) => updateMargin('bottom', parseInt(e.target.value) || 0)}
                        className={styles.numberInput}
                      />
                      <span>mm</span>
                    </div>
                    
                    <div className={styles.marginControl}>
                      <label htmlFor="margin-left">좌측</label>
                      <input
                        id="margin-left"
                        type="number"
                        min="0"
                        max="50"
                        value={pdfSettings.margin.left}
                        onChange={(e) => updateMargin('left', parseInt(e.target.value) || 0)}
                        className={styles.numberInput}
                      />
                      <span>mm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 품질 설정 */}
              <div className={styles.settingGroup}>
                <h4>🎨 품질 설정</h4>
                <div className={styles.qualityControl}>
                  <label htmlFor="quality-slider">품질: {Math.round(pdfSettings.quality * 100)}%</label>
                  <input
                    id="quality-slider"
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={pdfSettings.quality}
                    onChange={(e) => updatePdfSettings({ quality: parseFloat(e.target.value) })}
                    className={styles.slider}
                  />
                </div>
              </div>

              <div className={styles.actionButtons}>
                <button 
                  className={styles.primaryButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <span>➕</span>
                  파일 추가
                </button>
                <button 
                  className={styles.dangerButton}
                  onClick={clearAll}
                  disabled={isProcessing}
                >
                  <span>🗑️</span>
                  전체 삭제
                </button>
              </div>
            </div>

            <div className={styles.fileArea}>
              <div className={styles.fileHeader}>
                <h3>📄 파일 목록</h3>
                <div className={styles.fileStats}>
                  준비 완료: {files.length} / {files.length}
                </div>
              </div>

              <div className={styles.fileList}>
                {files.map(file => (
                  <div key={file.id} className={styles.fileCard}>
                    <div className={styles.fileCardHeader}>
                      <div className={styles.fileInfo}>
                        <h4 className={styles.fileName}>{file.file.name}</h4>
                        <div className={styles.fileDetails}>
                          <span className={styles.fileSize}>{(file.file.size / 1024).toFixed(1)} KB</span>
                          <span className={styles.typeBadge}>
                            {file.type === 'markdown' && '📝 Markdown'}
                            {file.type === 'html' && '🌐 HTML'}
                            {file.type === 'ipynb' && '📓 Jupyter'}
                          </span>
                          {file.detectedEncoding && (
                            <span className={styles.encodingBadge}>
                              🎯 {file.detectedEncoding} ({file.confidence}%)
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        className={styles.removeButton}
                        onClick={() => removeFile(file.id)}
                      >
                        ✕
                      </button>
                    </div>

                    {/* 원본 미리보기 */}
                    <div className={styles.previewSection}>
                      <h5>📝 원본 내용</h5>
                      <div className={styles.previewBox}>
                        <pre>{file.preview}</pre>
                      </div>
                    </div>

                    {/* HTML 미리보기 */}
                    <div className={styles.htmlPreviewSection}>
                      <h5>👁️ 변환 미리보기</h5>
                      <div className={styles.htmlPreviewContainer}>
                        <iframe
                          srcDoc={`
                            <!DOCTYPE html>
                            <html>
                            <head>
                              <meta charset="UTF-8">
                              <style>
                                body { 
                                  font-family: Arial, sans-serif; 
                                  line-height: 1.6; 
                                  margin: 20px; 
                                  color: #333; 
                                }
                                .pdf-content h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                                .pdf-content h2 { color: #34495e; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; }
                                .pdf-content h3 { color: #7f8c8d; }
                                .pdf-content pre { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007acc; }
                                .pdf-content code { background: #f1f2f6; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
                                .pdf-content blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 20px; color: #666; }
                              </style>
                            </head>
                            <body class="pdf-content">
                              ${file.htmlContent}
                            </body>
                            </html>
                          `}
                          className={styles.htmlPreview}
                          sandbox="allow-same-origin"
                        />
                      </div>
                    </div>

                    {/* PDF 생성 */}
                    <div className={styles.conversionSection}>
                      <h5>📑 PDF 생성</h5>
                      <button
                        className={styles.generateButton}
                        onClick={() => generatePdf(file)}
                        disabled={isProcessing}
                      >
                        <span>📑</span>
                        PDF 생성 및 다운로드
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div ref={previewRef} style={{ display: 'none' }} />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".md,.markdown,.html,.htm,.ipynb"
        onChange={(e) => e.target.files && processFiles(Array.from(e.target.files))}
        style={{ display: 'none' }}
      />
    </div>
  );
}
import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import styles from './FormatConverter.module.css';

interface FileData {
  file: File;
  id: string;
  originalFormat: string;
  parsedData: any[][];
  headers: string[];
  headerRowIndex: number;
  sheets?: { [key: string]: any[][] };
  selectedSheet?: string;
  preview: any[][];
  targetFormat?: string;
  convertedData?: string;
  detectedEncoding?: string;
  confidence?: number;
}

const FORMAT_CONFIGS = {
  csv: {
    icon: '📊',
    label: 'CSV',
    description: '쉼표로 구분된 값',
    color: '#22c55e',
    accept: ['.csv'],
    mimeTypes: ['text/csv']
  },
  json: {
    icon: '🗂️',
    label: 'JSON',
    description: 'JavaScript 객체 표기법',
    color: '#3b82f6',
    accept: ['.json'],
    mimeTypes: ['application/json']
  },
  xml: {
    icon: '📋',
    label: 'XML',
    description: '확장 마크업 언어',
    color: '#f59e0b',
    accept: ['.xml'],
    mimeTypes: ['text/xml', 'application/xml']
  },
  excel: {
    icon: '📗',
    label: 'Excel',
    description: 'Microsoft Excel',
    color: '#059669',
    accept: ['.xlsx', '.xls'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
  }
};

// 브라우저 호환 인코딩 감지 함수 (간소화 버전)
const detectEncodingSimple = (bytes: Uint8Array): { encoding: string; confidence: number } => {
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
const readTextWithEncoding = (bytes: Uint8Array, encoding: string): string => {
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

export default function FormatConverter() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 형식 감지
  const detectFormat = (file: File): string => {
    const extension = file.name.toLowerCase().split('.').pop();
    const mimeType = file.type.toLowerCase();
    
    if (['.csv'].includes(`.${extension}`) || mimeType.includes('csv')) {
      return 'csv';
    } else if (['.json'].includes(`.${extension}`) || mimeType.includes('json')) {
      return 'json';
    } else if (['.xml'].includes(`.${extension}`) || mimeType.includes('xml')) {
      return 'xml';
    } else if (['.xlsx', '.xls'].includes(`.${extension}`) || 
               mimeType.includes('spreadsheet') || 
               mimeType.includes('excel')) {
      return 'excel';
    }
    
    return 'csv'; // 기본값
  };

  // CSV 파싱 (기본 파싱)
  const parseCSV = (content: string): any[][] => {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"' && (i === 0 || line[i-1] === ',')) {
          inQuotes = true;
        } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
          inQuotes = false;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      values.push(current.trim());
      return values;
    });
  };

  // JSON 파싱
  const parseJSON = (content: string): any[][] => {
    try {
      const data = JSON.parse(content);
      
      if (Array.isArray(data)) {
        if (data.length === 0) return [];
        
        // 객체 배열인 경우
        if (typeof data[0] === 'object' && data[0] !== null) {
          const keys = Object.keys(data[0]);
          const result = [keys]; // 헤더
          
          data.forEach(item => {
            const row = keys.map(key => item[key] || '');
            result.push(row);
          });
          
          return result;
        } else {
          // 단순 배열인 경우
          return data.map(item => [item]);
        }
      } else if (typeof data === 'object' && data !== null) {
        // 단일 객체인 경우
        const keys = Object.keys(data);
        return [keys, keys.map(key => data[key])];
      }
      
      return [[data]];
    } catch (error) {
      throw new Error('잘못된 JSON 형식입니다.');
    }
  };

  // XML 파싱
  const parseXML = (content: string): any[][] => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');
      
      if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('잘못된 XML 형식입니다.');
      }
      
      const result: any[][] = [];
      const root = xmlDoc.documentElement;
      
      // 첫 번째 자식 요소들을 행으로 처리
      const children = Array.from(root.children);
      
      if (children.length === 0) {
        return [[root.textContent || '']];
      }
      
      // 헤더 생성 (첫 번째 요소의 속성과 자식 요소들)
      const firstChild = children[0];
      const headers: string[] = [];
      
      // 속성들을 헤더에 추가
      for (let i = 0; i < firstChild.attributes.length; i++) {
        headers.push(`@${firstChild.attributes[i].name}`);
      }
      
      // 자식 요소들을 헤더에 추가
      Array.from(firstChild.children).forEach(child => {
        headers.push(child.tagName);
      });
      
      // 텍스트 컨텐츠가 있으면 추가
      if (firstChild.textContent && firstChild.textContent.trim() && firstChild.children.length === 0) {
        headers.push('textContent');
      }
      
      if (headers.length > 0) {
        result.push(headers);
        
        // 각 자식 요소를 행으로 변환
        children.forEach(child => {
          const row: any[] = [];
          
          // 속성값들 추가
          for (let i = 0; i < child.attributes.length; i++) {
            row.push(child.attributes[i].value);
          }
          
          // 자식 요소값들 추가
          Array.from(child.children).forEach(grandChild => {
            row.push(grandChild.textContent || '');
          });
          
          // 텍스트 컨텐츠 추가
          if (child.textContent && child.textContent.trim() && child.children.length === 0) {
            row.push(child.textContent.trim());
          }
          
          result.push(row);
        });
      } else {
        // 단순 텍스트만 있는 경우
        result.push([root.tagName]);
        result.push([root.textContent || '']);
      }
      
      return result;
    } catch (error) {
      throw new Error('XML 파싱 중 오류가 발생했습니다.');
    }
  };

  // Excel 파싱
  const parseExcel = (arrayBuffer: ArrayBuffer): { [key: string]: any[][] } => {
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheets: { [key: string]: any[][] } = {};
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        sheets[sheetName] = jsonData as any[][];
      });
      
      return sheets;
    } catch (error) {
      throw new Error('Excel 파일 파싱 중 오류가 발생했습니다.');
    }
  };

  const processFiles = async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    
    const newFiles: FileData[] = [];
    
    for (const file of acceptedFiles) {
      try {
        const format = detectFormat(file);
        let parsedData: any[][] = [];
        let sheets: { [key: string]: any[][] } | undefined;
        let selectedSheet: string | undefined;
        let detectedEncoding: string | undefined;
        let confidence: number | undefined;
        
        if (format === 'excel') {
          const arrayBuffer = await file.arrayBuffer();
          sheets = parseExcel(arrayBuffer);
          const sheetNames = Object.keys(sheets);
          selectedSheet = sheetNames[0];
          parsedData = sheets[selectedSheet] || [];
        } else {
          // 텍스트 파일들은 인코딩 감지
          const arrayBuffer = await file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          const encodingResult = detectEncodingSimple(bytes);
          detectedEncoding = encodingResult.encoding;
          confidence = encodingResult.confidence;
          
          const content = readTextWithEncoding(bytes, encodingResult.encoding);
          
          switch (format) {
            case 'csv':
              parsedData = parseCSV(content);
              break;
            case 'json':
              parsedData = parseJSON(content);
              break;
            case 'xml':
              parsedData = parseXML(content);
              break;
            default:
              parsedData = parseCSV(content);
          }
        }
        
        const headers = parsedData.length > 0 ? parsedData[0] : [];
        const preview = parsedData.slice(0, 7); // 헤더 + 6행
        
        newFiles.push({
          file,
          id: Math.random().toString(36).substr(2, 9),
          originalFormat: format,
          parsedData,
          headers,
          headerRowIndex: 0,
          sheets,
          selectedSheet,
          preview,
          detectedEncoding,
          confidence,
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
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: true,
  });

  // 헤더 행 변경
  const updateHeaderRow = (fileId: string, headerRowIndex: number) => {
    setFiles(prev => prev.map(file => {
      if (file.id === fileId) {
        const newHeaders = file.parsedData[headerRowIndex] || [];
        const newPreview = file.parsedData.slice(0, 7);
        
        return {
          ...file,
          headerRowIndex,
          headers: newHeaders,
          preview: newPreview,
        };
      }
      return file;
    }));
  };

  // 시트 변경 (Excel)
  const updateSelectedSheet = (fileId: string, sheetName: string) => {
    setFiles(prev => prev.map(file => {
      if (file.id === fileId && file.sheets) {
        const parsedData = file.sheets[sheetName] || [];
        const headers = parsedData.length > 0 ? parsedData[0] : [];
        const preview = parsedData.slice(0, 7);
        
        return {
          ...file,
          selectedSheet: sheetName,
          parsedData,
          headers,
          preview,
          headerRowIndex: 0,
        };
      }
      return file;
    }));
  };

  // 형식 변환
  const convertToFormat = (fileId: string, targetFormat: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    
    try {
      let convertedData = '';
      const data = file.parsedData;
      
      switch (targetFormat) {
        case 'csv':
          convertedData = data.map(row => 
            row.map(cell => {
              const cellStr = String(cell || '');
              return cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') 
                ? `"${cellStr.replace(/"/g, '""')}"` 
                : cellStr;
            }).join(',')
          ).join('\n');
          break;
          
        case 'json':
          if (data.length > 1) {
            const headers = data[0];
            const rows = data.slice(1);
            const jsonArray = rows.map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = row[index] || '';
              });
              return obj;
            });
            convertedData = JSON.stringify(jsonArray, null, 2);
          } else {
            convertedData = JSON.stringify(data, null, 2);
          }
          break;
          
        case 'xml':
          let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<data>\n';
          if (data.length > 1) {
            const headers = data[0];
            const rows = data.slice(1);
            rows.forEach(row => {
              xml += '  <row>\n';
              headers.forEach((header, index) => {
                const value = row[index] || '';
                const safeHeader = String(header).replace(/[^a-zA-Z0-9]/g, '_');
                const safeValue = String(value)
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&apos;');
                xml += `    <${safeHeader}>${safeValue}</${safeHeader}>\n`;
              });
              xml += '  </row>\n';
            });
          } else {
            data.forEach((row, rowIndex) => {
              xml += `  <row${rowIndex}>\n`;
              row.forEach((cell, cellIndex) => {
                const safeValue = String(cell || '')
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
                xml += `    <cell${cellIndex}>${safeValue}</cell${cellIndex}>\n`;
              });
              xml += `  </row${rowIndex}>\n`;
            });
          }
          xml += '</data>';
          convertedData = xml;
          break;
          
        case 'excel':
          // Excel 변환은 다운로드에서 직접 처리
          convertedData = 'Excel 파일로 변환됩니다.';
          break;
          
        default:
          throw new Error('지원하지 않는 변환 형식입니다.');
      }
      
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, targetFormat, convertedData } : f
      ));
    } catch (error) {
      console.error('변환 오류:', error);
      alert(`변환 중 오류가 발생했습니다: ${error}`);
    }
  };

  // 변환된 파일 다운로드
  const downloadConvertedFile = (file: FileData) => {
    if (!file.targetFormat) {
      alert('먼저 변환할 형식을 선택하세요.');
      return;
    }
    
    try {
      if (file.targetFormat === 'excel') {
        // Excel 다운로드
        const worksheet = XLSX.utils.aoa_to_sheet(file.parsedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        
        const fileName = `${file.file.name.split('.')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
      } else {
        // 기타 형식 다운로드
        const mimeTypes = {
          csv: 'text/csv',
          json: 'application/json',
          xml: 'text/xml'
        };
        
        const extensions = {
          csv: 'csv',
          json: 'json',
          xml: 'xml'
        };
        
        const mimeType = mimeTypes[file.targetFormat as keyof typeof mimeTypes] || 'text/plain';
        const extension = extensions[file.targetFormat as keyof typeof extensions] || 'txt';
        
        const blob = new Blob([file.convertedData || ''], { type: `${mimeType};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${file.file.name.split('.')[0]}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('다운로드 오류:', error);
      alert(`다운로드 중 오류가 발생했습니다: ${error}`);
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
        <div className={styles.heroIcon}>🔄📊</div>
        <h1 className={styles.heroTitle}>포맷 변환기</h1>
        <p className={styles.heroSubtitle}>
          CSV, JSON, XML, Excel 파일을 서로 변환하세요. 
          자동 인코딩 감지와 실시간 미리보기로 안전하고 정확한 변환을 제공합니다.
        </p>
        
        <div className={styles.formatShowcase}>
          {Object.entries(FORMAT_CONFIGS).map(([key, config]) => (
            <div key={key} className={styles.formatBadge} style={{ '--format-color': config.color } as any}>
              <span className={styles.formatIcon}>{config.icon}</span>
              <span className={styles.formatLabel}>{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        {files.length === 0 ? (
          <div className={styles.uploadSection}>
            <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.dragActive : ''}`}>
              <input {...getInputProps()} />
              <div className={styles.dropzoneContent}>
                <div className={styles.uploadIcon}>📄</div>
                <h3>파일을 드래그하거나 클릭하여 업로드</h3>
                <p>CSV, JSON, XML, Excel 파일을 지원합니다</p>
                <div className={styles.uploadFeatures}>
                  <span>🎯 자동 인코딩 감지</span>
                  <span>📊 실시간 미리보기</span>
                  <span>🔄 양방향 변환</span>
                  <span>📗 다중 시트 지원</span>
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
                <h3>🔧 변환 설정</h3>
                <div className={styles.fileCounter}>
                  <span>📄</span>
                  <span className={styles.fileCount}>{files.length}</span>
                  <span>개 파일</span>
                </div>
              </div>

              <div className={styles.formatInfo}>
                <h4>📊 지원 형식</h4>
                <div className={styles.formatGrid}>
                  {Object.entries(FORMAT_CONFIGS).map(([key, config]) => (
                    <div key={key} className={styles.formatCard}>
                      <div className={styles.formatIcon}>{config.icon}</div>
                      <div className={styles.formatDetails}>
                        <div className={styles.formatName}>{config.label}</div>
                        <div className={styles.formatDesc}>{config.description}</div>
                      </div>
                    </div>
                  ))}
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
                  처리 완료: {files.length} / {files.length}
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
                          <span 
                            className={styles.dataBadge}
                            style={{ 
                              '--format-color': FORMAT_CONFIGS[file.originalFormat as keyof typeof FORMAT_CONFIGS].color 
                            } as any}
                          >
                            {FORMAT_CONFIGS[file.originalFormat as keyof typeof FORMAT_CONFIGS].icon}
                            {FORMAT_CONFIGS[file.originalFormat as keyof typeof FORMAT_CONFIGS].label}
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

                    {/* 시트 선택 (Excel만) */}
                    {file.sheets && Object.keys(file.sheets).length > 1 && (
                      <div className={styles.sheetSelector}>
                        <h5>📗 시트 선택</h5>
                        <select
                          value={file.selectedSheet || ''}
                          onChange={(e) => updateSelectedSheet(file.id, e.target.value)}
                          className={styles.sheetSelect}
                        >
                          {Object.keys(file.sheets).map(sheetName => (
                            <option key={sheetName} value={sheetName}>
                              {sheetName}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* 헤더 설정 */}
                    <div className={styles.headerSection}>
                      <h5>📋 헤더 설정</h5>
                      <div className={styles.headerSelector}>
                        <label htmlFor={`header-${file.id}`}>헤더 행:</label>
                        <select
                          id={`header-${file.id}`}
                          value={file.headerRowIndex}
                          onChange={(e) => updateHeaderRow(file.id, parseInt(e.target.value))}
                          className={styles.headerSelect}
                        >
                          {Array.from({ length: Math.min(20, file.parsedData.length) }, (_, i) => (
                            <option key={i} value={i}>
                              {i + 1}행 (헤더)
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className={styles.currentHeaders}>
                        <span>현재 헤더:</span>
                        <div className={styles.headerList}>
                          {file.headers.slice(0, 5).map((header, index) => (
                            <span key={index} className={styles.headerTag}>
                              {String(header).substring(0, 15)}
                              {String(header).length > 15 ? '...' : ''}
                            </span>
                          ))}
                          {file.headers.length > 5 && (
                            <span className={styles.headerMore}>
                              +{file.headers.length - 5}개 더
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 미리보기 */}
                    <div className={styles.previewSection}>
                      <h5>👁️ 데이터 미리보기</h5>
                      <div className={styles.tableContainer}>
                        <div className={styles.tableScroll}>
                          <table className={styles.previewTable}>
                            <thead>
                              <tr>
                                {file.headers.map((header, index) => (
                                  <th key={index} title={String(header)}>
                                    {String(header)}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {file.preview.slice(1, 7).map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                  {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} title={String(cell)}>
                                      {String(cell)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* 변환 설정 */}
                    <div className={styles.conversionSection}>
                      <h5>🔄 형식 변환</h5>
                      <div className={styles.formatSelector}>
                        {Object.entries(FORMAT_CONFIGS).map(([key, config]) => (
                          <button
                            key={key}
                            className={`${styles.formatButton} ${file.targetFormat === key ? styles.active : ''}`}
                            style={{ '--format-color': config.color, '--format-color-rgb': config.color.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(', ') } as any}
                            onClick={() => convertToFormat(file.id, key)}
                            disabled={file.originalFormat === key}
                          >
                            <span className={styles.formatIcon}>{config.icon}</span>
                            <span className={styles.formatLabel}>{config.label}</span>
                          </button>
                        ))}
                      </div>
                      
                      {file.convertedData && file.targetFormat && (
                        <div className={styles.conversionResult}>
                          <div className={styles.resultInfo}>
                            <span className={styles.successBadge}>✅ 변환 완료</span>
                            <span className={styles.targetBadge}>
                              → {FORMAT_CONFIGS[file.targetFormat as keyof typeof FORMAT_CONFIGS].label}
                            </span>
                          </div>
                          <button
                            className={styles.downloadButton}
                            onClick={() => downloadConvertedFile(file)}
                          >
                            <span>💾</span>
                            다운로드
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".csv,.json,.xml,.xlsx,.xls"
        onChange={(e) => e.target.files && processFiles(Array.from(e.target.files))}
        style={{ display: 'none' }}
      />
    </div>
  );
}
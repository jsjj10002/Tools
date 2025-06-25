import { Link } from 'react-router-dom';
import styles from './FileTools.module.css';

interface FileToolCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  status: 'available' | 'coming-soon';
}

export default function FileTools() {
  const fileTools: FileToolCard[] = [
    {
      id: 'pdf-to-image',
      title: 'PDF → 이미지 변환',
      description: 'PDF 파일을 이미지로 변환합니다. 페이지 범위 선택, 품질 조정, 다양한 포맷 지원',
      icon: '📄➡️🖼️',
      path: '/pdf-to-image',
      status: 'available'
    },
    {
      id: 'pdf-merge',
      title: 'PDF 결합',
      description: '여러 PDF 파일을 하나로 결합합니다. 드래그앤드롭으로 순서 조정, 구분선으로 파일 분할 가능',
      icon: '📄🔗📄',
      path: '/pdf-merge',
      status: 'available'
    },
    {
      id: 'pdf-split',
      title: 'PDF 분할',
      description: 'PDF 파일을 여러 파일로 분할합니다. 구분 페이지 설정으로 원하는 개수만큼 분할',
      icon: '📄✂️📄',
      path: '/pdf-split',
      status: 'available'
    },
    {
      id: 'text-encoding',
      title: '텍스트 인코딩 변환',
      description: '텍스트/CSV 파일의 인코딩을 변환합니다. 자동 감지 및 다양한 인코딩 지원 (UTF-8, EUC-KR 등)',
      icon: '📝🔄📝',
      path: '/text-encoding',
      status: 'available'
    },
    {
      id: 'format-converter',
      title: '포맷 변환기',
      description: 'CSV ↔ JSON ↔ XML 형식 간 변환을 지원합니다. 일괄 처리 및 구조 미리보기 제공',
      icon: '📊🔄📊',
      path: '/format-converter',
      status: 'available'
    },
    {
      id: 'document-to-pdf',
      title: '문서 → PDF 변환',
      description: 'HTML, Markdown, IPYNB 파일을 PDF로 변환합니다. 스타일 유지 및 고품질 렌더링',
      icon: '📃➡️📄',
      path: '/document-to-pdf',
      status: 'available'
    },
    {
      id: 'file-compress',
      title: '파일 압축/해제',
      description: 'ZIP, RAR 등 압축 파일 생성 및 해제. 패스워드 보호 및 압축률 조정 가능',
      icon: '🗜️',
      path: '/file-compress',
      status: 'coming-soon'
    },
    {
      id: 'batch-file-processor',
      title: '일괄 파일 처리',
      description: '여러 파일을 동시에 처리합니다. 이름 변경, 포맷 변환, 압축 등 일괄 작업',
      icon: '📦',
      path: '/batch-file-processor',
      status: 'coming-soon'
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📁 파일 처리 도구</h1>
        <p>PDF 변환, 텍스트 인코딩, 문서 변환, 포맷 변환 등 다양한 파일 처리 작업을 로컬에서 안전하게 수행하세요</p>
      </div>

      <div className={styles.toolsGrid}>
        {fileTools.map((tool) => (
          <div key={tool.id} className={styles.toolCard}>
            <div className={styles.toolIcon}>{tool.icon}</div>
            <div className={styles.toolContent}>
              <h3 className={styles.toolTitle}>{tool.title}</h3>
              <p className={styles.toolDescription}>{tool.description}</p>
              
              <div className={styles.toolFooter}>
                {tool.status === 'available' ? (
                  <Link to={tool.path} className={styles.toolButton}>
                    사용하기
                  </Link>
                ) : (
                  <button className={styles.toolButtonDisabled} disabled>
                    개발 예정
                  </button>
                )}
                <span className={`${styles.status} ${tool.status === 'available' ? styles.available : styles['coming-soon']}`}>
                  {tool.status === 'available' ? '사용 가능' : '개발 예정'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.info}>
        <div className={styles.infoCard}>
          <h3>🔒 완전한 개인정보 보호</h3>
          <p>모든 파일 처리는 브라우저 내에서 로컬로 수행되며, 파일이 서버로 전송되지 않습니다.</p>
        </div>
        <div className={styles.infoCard}>
          <h3>⚡ 고성능 처리</h3>
          <p>최신 웹 기술을 활용하여 빠르고 효율적인 파일 처리를 제공합니다.</p>
        </div>
        <div className={styles.infoCard}>
          <h3>📱 멀티태스킹</h3>
          <p>여러 작업을 동시에 진행할 수 있으며, 실시간으로 진행상황을 확인할 수 있습니다.</p>
        </div>
      </div>

      <div className={styles.features}>
        <h2>주요 기능</h2>
        <ul className={styles.featureList}>
          <li>📄 PDF 페이지별 미리보기 및 범위 선택</li>
          <li>🎨 최고품질부터 중품질까지 해상도 조정</li>
          <li>🔧 다중 파일 일괄 처리</li>
          <li>💾 사용자 지정 출력 폴더 선택</li>
          <li>🚀 비동기 처리로 멀티태스킹 지원</li>
          <li>📊 실시간 진행률 및 상태 표시</li>
          <li>🔄 자동 인코딩 감지 및 변환</li>
          <li>📋 구조화된 데이터 미리보기</li>
        </ul>
      </div>

      <div className={styles.supportedFormats}>
        <h3>📋 지원 포맷</h3>
        <div className={styles.formatGrid}>
          <div className={styles.formatCategory}>
            <h4>📄 문서</h4>
            <ul>
              <li>PDF (읽기/쓰기)</li>
              <li>HTML → PDF</li>
              <li>Markdown → PDF</li>
              <li>Jupyter Notebook → PDF</li>
            </ul>
          </div>
          <div className={styles.formatCategory}>
            <h4>📊 데이터</h4>
            <ul>
              <li>CSV ↔ JSON ↔ XML</li>
              <li>텍스트 인코딩 변환</li>
              <li>UTF-8, EUC-KR, ASCII</li>
              <li>구조화된 데이터 검증</li>
            </ul>
          </div>
          <div className={styles.formatCategory}>
            <h4>🗜️ 압축</h4>
            <ul>
              <li>ZIP 생성/해제</li>
              <li>패스워드 보호</li>
              <li>압축률 조정</li>
              <li>폴더 구조 유지</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
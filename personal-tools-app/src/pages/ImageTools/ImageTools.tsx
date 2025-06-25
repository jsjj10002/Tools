import { Link } from 'react-router-dom';
import styles from './ImageTools.module.css';

interface ImageToolCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  status: 'available' | 'coming-soon';
}

export default function ImageTools() {
  const imageTools: ImageToolCard[] = [
    {
      id: 'image-compress',
      title: '이미지 압축',
      description: '이미지 품질을 10%~80%까지 조절하여 파일 크기를 줄입니다. 미리보기 지원',
      icon: '🗜️',
      path: '/image-compress',
      status: 'available'
    },
    {
      id: 'image-resize',
      title: '이미지 리사이즈',
      description: '이미지 크기를 원하는 치수로 조정합니다. 비율 유지 옵션 포함',
      icon: '📏',
      path: '/image-resize',
      status: 'available'
    },
    {
      id: 'image-format-converter',
      title: '이미지 포맷 변환',
      description: 'JPG, PNG, WebP, BMP, GIF 등 다양한 이미지 포맷 간 변환',
      icon: '🔄',
      path: '/image-format-converter',
      status: 'available'
    },
    {
      id: 'image-batch-processor',
      title: '일괄 처리',
      description: '여러 이미지를 동시에 처리합니다. 압축, 리사이즈, 포맷 변환 일괄 적용',
      icon: '📦',
      path: '/image-batch-processor',
      status: 'coming-soon'
    },
    {
      id: 'image-optimization',
      title: '이미지 최적화',
      description: '웹용 이미지 최적화, 메타데이터 제거, 품질 조정을 통한 종합 최적화',
      icon: '⚡',
      path: '/image-optimization',
      status: 'coming-soon'
    },
    {
      id: 'image-metadata-editor',
      title: '메타데이터 편집기',
      description: 'EXIF 데이터 조회, 편집, 제거 기능. 개인정보 보호를 위한 메타데이터 정리',
      icon: '🏷️',
      path: '/image-metadata-editor',
      status: 'coming-soon'
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🖼️ 이미지 처리 도구</h1>
        <p>이미지 압축, 리사이즈, 포맷 변환 등 다양한 이미지 처리 작업을 로컬에서 안전하게 수행하세요</p>
      </div>

      <div className={styles.toolsGrid}>
        {imageTools.map((tool) => (
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
          <h3>🔒 개인정보 보호</h3>
          <p>모든 이미지 처리는 브라우저 내에서 수행되며, 이미지가 서버로 전송되지 않습니다.</p>
        </div>
        <div className={styles.infoCard}>
          <h3>🎨 고품질 처리</h3>
          <p>최신 Canvas API와 WebAssembly를 활용하여 고품질 이미지 처리를 제공합니다.</p>
        </div>
        <div className={styles.infoCard}>
          <h3>📱 다중 포맷 지원</h3>
          <p>JPG, PNG, WebP, BMP, GIF 등 웹에서 지원하는 모든 이미지 포맷을 처리할 수 있습니다.</p>
        </div>
      </div>

      <div className={styles.features}>
        <h2>주요 기능</h2>
        <ul className={styles.featureList}>
          <li>✨ 실시간 미리보기 지원</li>
          <li>📊 압축률 10%~80% 자유 조절</li>
          <li>🔧 다중 파일 일괄 처리</li>
          <li>💾 원하는 폴더에 결과 저장</li>
          <li>🚀 비동기 처리로 멀티태스킹 지원</li>
          <li>📏 정확한 픽셀 단위 리사이징</li>
        </ul>
      </div>
    </div>
  );
}
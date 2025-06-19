import { Link } from 'react-router-dom';
import styles from './VideoTools.module.css';

interface VideoToolCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  status: 'available' | 'coming-soon';
}

export default function VideoTools() {
  const videoTools: VideoToolCard[] = [
    {
      id: 'audio-extraction',
      title: '영상에서 음성 추출',
      description: '영상 파일에서 음성만 추출합니다. MP3, WAV, AAC 등 다양한 포맷 지원',
      icon: '🎵',
      path: '/audio-extraction',
      status: 'coming-soon'
    },
    {
      id: 'video-format-converter',
      title: '영상 포맷 변환',
      description: 'MP4, AVI, MOV, WebM, MKV 등 다양한 영상 포맷 간 변환',
      icon: '🎬',
      path: '/video-format-converter',
      status: 'coming-soon'
    },
    {
      id: 'audio-format-converter',
      title: '음성 포맷 변환',
      description: 'MP3, WAV, AAC, FLAC, OGG 등 음성 포맷 간 변환',
      icon: '🔊',
      path: '/audio-format-converter',
      status: 'coming-soon'
    },
    {
      id: 'video-compressor',
      title: '영상 압축',
      description: '영상 파일 크기를 줄이면서 품질을 유지합니다. 비트레이트 조정 가능',
      icon: '🗜️',
      path: '/video-compressor',
      status: 'coming-soon'
    },
    {
      id: 'video-trimmer',
      title: '영상 자르기',
      description: '영상의 특정 구간을 잘라내거나 분할합니다. 정확한 타임스탬프 지원',
      icon: '✂️',
      path: '/video-trimmer',
      status: 'coming-soon'
    },
    {
      id: 'subtitle-extractor',
      title: '자막 추출',
      description: '영상에서 자막을 추출하고 SRT, VTT 등의 포맷으로 저장',
      icon: '📄',
      path: '/subtitle-extractor',
      status: 'coming-soon'
    },
    {
      id: 'video-info',
      title: '영상 정보 분석',
      description: '영상 파일의 코덱, 해상도, 비트레이트, 메타데이터 등 상세 정보 분석',
      icon: '📊',
      path: '/video-info',
      status: 'coming-soon'
    },
    {
      id: 'batch-video-processor',
      title: '일괄 처리',
      description: '여러 영상 파일을 동시에 처리합니다. 포맷 변환, 압축 등 일괄 작업',
      icon: '📦',
      path: '/batch-video-processor',
      status: 'coming-soon'
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🎬 영상 처리 도구</h1>
        <p>영상 변환, 음성 추출, 압축 등 다양한 영상 처리 작업을 로컬에서 안전하게 수행하세요</p>
      </div>

      <div className={styles.toolsGrid}>
        {videoTools.map((tool) => (
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
          <h3>🔒 완전한 보안</h3>
          <p>모든 영상 처리는 브라우저 내에서 수행되며, 영상이 서버로 전송되지 않습니다.</p>
        </div>
        <div className={styles.infoCard}>
          <h3>⚡ WebAssembly 기반</h3>
          <p>FFmpeg.wasm을 활용하여 브라우저에서 네이티브급 성능의 영상 처리를 제공합니다.</p>
        </div>
        <div className={styles.infoCard}>
          <h3>🎯 다양한 포맷 지원</h3>
          <p>MP4, AVI, MOV, WebM, MKV 등 거의 모든 영상 포맷을 지원합니다.</p>
        </div>
      </div>

      <div className={styles.features}>
        <h2>주요 기능</h2>
        <ul className={styles.featureList}>
          <li>🎵 고품질 음성 추출 (MP3, WAV, AAC)</li>
          <li>🔄 무손실 포맷 변환</li>
          <li>📐 비트레이트/해상도 조정</li>
          <li>⏱️ 정확한 타임스탬프 편집</li>
          <li>🚀 멀티스레딩 처리</li>
          <li>💾 대용량 파일 지원</li>
          <li>📊 실시간 진행률 표시</li>
          <li>🔧 일괄 처리 기능</li>
        </ul>
      </div>

      <div className={styles.warning}>
        <h3>⚠️ 주의사항</h3>
        <p>영상 처리는 CPU 집약적인 작업으로 처리 시간이 오래 걸릴 수 있습니다. 
        대용량 파일의 경우 충분한 메모리와 시간이 필요하며, 다른 탭에서 동시 작업 시 성능이 저하될 수 있습니다.</p>
      </div>
    </div>
  );
}
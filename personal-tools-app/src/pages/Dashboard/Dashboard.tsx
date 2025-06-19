import { Link } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { isOnline } = useAppStore();

  const tools = [
    {
      id: 'file-tools',
      title: '파일 처리 도구',
      description: 'PDF 변환, 텍스트 인코딩, 문서 변환, 포맷 변환',
      icon: '📁',
      path: '/file-tools',
      offline: true,
    },
    {
      id: 'image-tools',
      title: '이미지 처리 도구',
      description: '이미지 리사이징, 압축, 포맷 변환, 최적화',
      icon: '🖼️',
      path: '/image-tools',
      offline: true,
    },
    {
      id: 'video-tools',
      title: '영상 처리 도구',
      description: '영상 변환, 음성 추출, 포맷 변환',
      icon: '🎬',
      path: '/video-tools',
      offline: true,
    },
    {
      id: 'ai-tools',
      title: 'AI 도구',
      description: 'AI 기반 텍스트/이미지 처리 (개발 예정)',
      icon: '🤖',
      path: '/ai-tools',
      offline: false,
      disabled: true,
    },
  ];

  return (
    <div className="container">
      <div className={styles.hero}>
        <h1 className={styles.title}>개인용 도구 모음</h1>
        <p className={styles.subtitle}>
          모든 작업을 로컬에서 안전하게 처리하는 개인 도구 모음입니다
        </p>
        
        {!isOnline && (
          <div className={styles.offlineNotice}>
            ⚠️ 현재 오프라인 모드입니다. 일부 기능이 제한될 수 있습니다.
          </div>
        )}
      </div>

      <div className={styles.toolGrid}>
        {tools.map((tool) => (
          <div key={tool.id} className={styles.toolCard}>
            {tool.disabled ? (
              <div className={`${styles.toolContent} ${styles.disabled}`}>
                <div className={styles.toolIcon}>{tool.icon}</div>
                <h3 className={styles.toolTitle}>{tool.title}</h3>
                <p className={styles.toolDescription}>{tool.description}</p>
                <div className={styles.comingSoon}>개발 예정</div>
              </div>
            ) : (
              <Link 
                to={tool.path} 
                className={`${styles.toolContent} ${
                  !isOnline && !tool.offline ? styles.unavailable : ''
                }`}
              >
                <div className={styles.toolIcon}>{tool.icon}</div>
                <h3 className={styles.toolTitle}>{tool.title}</h3>
                <p className={styles.toolDescription}>{tool.description}</p>
                
                <div className={styles.toolStatus}>
                  {tool.offline ? (
                    <span className={styles.offlineSupported}>🟢 오프라인 지원</span>
                  ) : (
                    <span className={styles.onlineRequired}>🌐 온라인 필요</span>
                  )}
                </div>
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className={styles.features}>
        <div className={styles.featureCard}>
          <h3>🔒 완전한 개인정보 보호</h3>
          <p>모든 파일 처리는 브라우저 내에서 로컬로 수행되며, 서버로 전송되지 않습니다.</p>
        </div>
        <div className={styles.featureCard}>
          <h3>⚡ 멀티태스킹 지원</h3>
          <p>여러 작업을 동시에 진행할 수 있으며, 실시간으로 진행상황을 확인할 수 있습니다.</p>
        </div>
        <div className={styles.featureCard}>
          <h3>📱 반응형 설계</h3>
          <p>데스크톱부터 모바일까지 모든 기기에서 최적화된 경험을 제공합니다.</p>
        </div>
      </div>
    </div>
  );
}
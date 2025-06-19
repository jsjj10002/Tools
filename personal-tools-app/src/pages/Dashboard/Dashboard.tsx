import { Link } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { isOnline } = useAppStore();

  const tools = [
    {
      id: 'file-tools',
      title: '파일 처리 도구',
      description: '텍스트 파일 변환, 압축/해제, 파일 정보 분석',
      icon: '📄',
      path: '/file-tools',
      offline: true,
    },
    {
      id: 'image-tools',
      title: '이미지 처리 도구',
      description: '이미지 리사이징, 포맷 변환, 압축, PDF 결합',
      icon: '🖼️',
      path: '/image-tools',
      offline: true,
    },
    {
      id: 'video-tools',
      title: '영상 처리 도구',
      description: '영상 변환, 음성 추출, 영상 압축',
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
          필요한 도구를 선택해서 편리하게 작업하세요
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
    </div>
  );
}
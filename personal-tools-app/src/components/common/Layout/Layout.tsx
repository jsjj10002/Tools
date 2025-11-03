import { ReactNode, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import PWAInstallButton from '@/components/PWAInstallButton/PWAInstallButton';
import TaskProgressBar from '@/components/common/TaskSystem/TaskProgressBar';
import CompletionToast from '@/components/common/TaskSystem/CompletionToast';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { isOnline, theme, toggleTheme } = useAppStore();

  const navItems = useMemo(() => [
    { path: '/', label: '홈', icon: '🏠' },
    { path: '/file-tools', label: '파일 도구', icon: '📁' },
    { path: '/image-tools', label: '이미지 도구', icon: '🖼️' },
    { path: '/video-tools', label: '영상 도구', icon: '🎬' },
  ], []);

  const handleThemeToggle = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  return (
    <div className={styles.layout}>
      {/* Task 진행상황 표시 */}
      <TaskProgressBar />
      
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <h1>🛠️ 도구 모음</h1>
          </div>
          
          <nav className={styles.nav}>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`${styles.navLink} ${
                  location.pathname === item.path ? styles.active : ''
                }`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            ))}
          </nav>
          
          <div className={styles.headerActions}>
            <div className={`${styles.status} ${isOnline ? styles.online : styles.offline}`}>
              {isOnline ? '🟢 온라인' : '🔴 오프라인'}
            </div>
            
            <PWAInstallButton />
            
            <button
              onClick={handleThemeToggle}
              className={styles.themeToggle}
              aria-label="테마 변경"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </header>
      
      <main className={styles.main}>
        {children}
      </main>
      
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>개인용 도구 모음 v1.0</p>
          <p className="text-muted">
            {isOnline ? '모든 기능 사용 가능' : '오프라인 기능만 사용 가능'}
          </p>
        </div>
      </footer>
      
      {/* 완료 알림 토스트 */}
      <CompletionToast />
    </div>
  );
}
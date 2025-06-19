import { useEffect, useState } from 'react';

export const usePWA = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('PWA 설치 프롬프트 감지됨');
      // 기본 설치 프롬프트 방지
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // PWA 설치 조건을 체크하는 함수
    const checkInstallability = () => {
      // 개발 환경에서는 항상 버튼을 표시 (테스트용)
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('개발 환경: PWA 설치 버튼 표시');
        setIsInstallable(true);
        return;
      }

      // 이미 설치되어 있는지 확인
      if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('이미 PWA로 설치됨');
        setIsInstallable(false);
        return;
      }

      // Service Worker 지원 확인
      if ('serviceWorker' in navigator) {
        console.log('Service Worker 지원됨');
        setIsInstallable(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // 초기 체크
    checkInstallability();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) {
      console.log('설치 프롬프트가 없습니다. 수동으로 브라우저 메뉴에서 설치하세요.');
      alert('브라우저 주소창 옆의 설치 아이콘을 클릭하거나, 메뉴에서 "설치" 또는 "홈 화면에 추가"를 선택하세요.');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA 설치됨');
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return {
    isInstallable,
    installPWA
  };
};
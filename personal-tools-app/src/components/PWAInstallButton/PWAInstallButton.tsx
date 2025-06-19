import { usePWA } from '@/hooks/usePWA';
import './PWAInstallButton.css';

export default function PWAInstallButton() {
  const { isInstallable, installPWA } = usePWA();

  if (!isInstallable) return null;

  return (
    <button 
      className="installButton"
      onClick={installPWA}
      title="앱 설치"
    >
      📱 앱 설치
    </button>
  );
}
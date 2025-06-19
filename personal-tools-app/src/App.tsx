import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import Layout from '@/components/common/Layout/Layout';
import Dashboard from '@/pages/Dashboard/Dashboard';
import FileTools from '@/pages/FileTools/FileTools';
import ImageTools from '@/pages/ImageTools/ImageTools';
import VideoTools from '@/pages/VideoTools/VideoTools';
import PdfToImage from '@/pages/PdfTools/PdfToImage/PdfToImage';
import '@/styles/globals.css';

function App() {
  const { setOnlineStatus, theme } = useAppStore();

  useEffect(() => {
    // 온라인 상태 감지
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus]);

  // 테마 적용
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/file-tools" element={<FileTools />} />
          <Route path="/image-tools" element={<ImageTools />} />
          <Route path="/video-tools" element={<VideoTools />} />
          <Route path="/pdf-to-image" element={<PdfToImage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { ErrorBoundary } from '@/components/common/ErrorBoundary/ErrorBoundary';
import Layout from '@/components/common/Layout/Layout';
import Dashboard from '@/pages/Dashboard/Dashboard';
import FileTools from '@/pages/FileTools/FileTools';
import ImageTools from '@/pages/ImageTools/ImageTools';
import VideoTools from '@/pages/VideoTools/VideoTools';
import PdfToImage from '@/pages/PdfTools/PdfToImage/PdfToImage';
import PdfMerge from '@/pages/PdfTools/PdfMerge/PdfMerge';
import PdfSplit from '@/pages/PdfTools/PdfSplit/PdfSplit';
import ImageCompress from '@/pages/ImageTools/ImageCompress/ImageCompress';
import ImageResize from '@/pages/ImageTools/ImageResize/ImageResize';
import ImageFormatConverter from '@/pages/ImageTools/ImageFormatConverter/ImageFormatConverter';
import TextEncoding from '@/pages/FileTools/TextEncoding/TextEncoding';
import FormatConverter from '@/pages/FileTools/FormatConverter/FormatConverter';
import DocumentToPdf from '@/pages/FileTools/DocumentToPdf/DocumentToPdf';
// import ImageBatchProcessor from '@/pages/ImageTools/ImageBatchProcessor/ImageBatchProcessor';
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
    <ErrorBoundary>
      <Router>
        <Layout>
          <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/file-tools" element={<FileTools />} />
          <Route path="/image-tools" element={<ImageTools />} />
          <Route path="/video-tools" element={<VideoTools />} />
          <Route path="/pdf-to-image" element={<PdfToImage />} />
          <Route path="/pdf-merge" element={<PdfMerge />} />
          <Route path="/pdf-split" element={<PdfSplit />} />
          <Route path="/image-compress" element={<ImageCompress />} />
          <Route path="/image-resize" element={<ImageResize />} />
          <Route path="/image-format-converter" element={<ImageFormatConverter />} />
          <Route path="/text-encoding" element={<TextEncoding />} />
          <Route path="/format-converter" element={<FormatConverter />} />
          <Route path="/document-to-pdf" element={<DocumentToPdf />} />
          {/* <Route path="/image-batch-processor" element={<ImageBatchProcessor />} /> */}
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { useAppStore } from './stores/appStore'

// 온라인/오프라인 상태 감지
const updateOnlineStatus = () => {
  useAppStore.getState().setOnlineStatus(navigator.onLine);
};

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// 초기 상태 설정
updateOnlineStatus();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
# 개인용 다기능 도구 웹앱

> React 기반 PWA로 구현된 개인용 멀티툴 웹 애플리케이션

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg)](https://vitejs.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-green.svg)](https://web.dev/progressive-web-apps/)
[![Development](https://img.shields.io/badge/Status-Phase%202%20Active-brightgreen.svg)](#)

## 📱 실시간 데모

**🚀 현재 배포된 버전**: [https://your-domain.vercel.app](https://your-domain.vercel.app) (예정)

> PWA로 설치 가능하며, 오프라인에서도 작동합니다!

## 프로젝트 소개

파일 처리, 이미지 편집, 영상 변환 등 개인적으로 자주 사용하는 도구들을 한 곳에 모은 웹 애플리케이션입니다. 오프라인에서도 작동하며, 모든 처리는 브라우저 내에서 이루어져 개인정보를 보호합니다.

### 핵심 특징

- 🔄 **오프라인 우선**: 인터넷 연결 없이도 대부분 기능 사용 가능
- 🔒 **프라이버시 보호**: 모든 파일 처리가 클라이언트 사이드에서 진행
- ⚡ **빠른 성능**: Web Worker와 코드 분할로 최적화
- 📱 **반응형 디자인**: 데스크톱과 모바일 모두 지원
- 🌙 **테마 지원**: 라이트/다크 테마 전환
- 📲 **PWA**: 홈 화면에 설치하여 네이티브 앱처럼 사용

## ✨ 구현된 기능

### ✅ 현재 사용 가능 (Phase 1 + Phase 2 부분 완료)
- **📱 PWA 지원**: 홈 화면 설치, 오프라인 동작, 푸시 알림 준비
- **🎨 UI/UX**: 반응형 네비게이션, 테마 전환, 온라인/오프라인 상태 표시  
- **⚡ 성능**: Service Worker 캐싱, 최적화된 번들링
- **🔧 개발 환경**: TypeScript, Zustand 상태 관리, 모듈화된 구조

### 🎯 PDF 처리 도구 ✅ 완료 (2025.6.20)
- **📄➡️🖼️ PDF → 이미지 변환**: PNG, JPG, WebP 형식 지원
- **📁 다중 파일 처리**: 여러 PDF 파일 동시 업로드 및 변환
- **🎚️ 페이지 범위 선택**: 슬라이더 또는 직접 입력으로 변환할 페이지 선택
- **⚙️ 품질 설정**: 중품질, 고품질, 최고품질 선택 가능
- **👁️ 실시간 미리보기**: 선택한 페이지의 썸네일 미리보기
- **📊 진행률 표시**: 실시간 변환 진행률 및 작업 관리 시스템
- **🎯 드래그앤드롭**: 직관적인 파일 업로드 인터페이스
- **📱 반응형 UI**: 모바일과 데스크톱 모두 최적화된 사용자 경험

### 🔄 개발 진행 중 (Phase 2 계속)
- **🖼️ 이미지 처리**: 리사이징, 포맷 변환, 압축, PDF 결합 (6월 21일 시작 예정)
- **🎥 영상 처리**: 음성 추출, 포맷 변환, 압축, 기본 편집 (7월 초 시작 예정)

### 🔮 향후 계획 (Phase 3-4)
- **📁 파일 처리**: CSV/JSON/XML 변환, ZIP 압축/해제, 메타데이터 분석
- **🤖 AI 연동**: OpenAI/Google Cloud AI API 활용
- **⚙️ 고급 기능**: 배치 처리, 워크플로우, 히스토리 관리

## 📊 개발 현황

**📅 프로젝트 시작**: 2024년 6월 19일  
**⏸️ 개발 중단**: 2024년 12월 22일 ~ 2025년 6월 18일 (약 6개월)  
**🔄 개발 재시작**: 2025년 6월 19일  
**🎯 현재 단계**: Phase 2 진행 중 - PDF 도구 완성  
**📋 상세 계획**: [개발 계획서](./docs/개발계획.md)

### 🎯 전체 진행률: 50%

```
██████████░░░░░░░░░░ 50%

Phase 1 (기초 설정): ████████████████████ 100% ✅
개발 중단 기간:      ░░░░░░░░░░░░░░░░░░░░ (6개월) 💤
Phase 2 (핵심 도구): ██████████░░░░░░░░░░  50% 🚀 진행중
  - PDF 도구:        ████████████████████ 100% ✅ 완료
  - 이미지 도구:     ░░░░░░░░░░░░░░░░░░░░   0% 📝 다음
  - 영상 도구:       ░░░░░░░░░░░░░░░░░░░░   0% 📝 예정
Phase 3 (확장 기능): ░░░░░░░░░░░░░░░░░░░░   0% 
Phase 4 (AI 연동):   ░░░░░░░░░░░░░░░░░░░░   0%
```

### 🏆 Phase 1 주요 성과 (2024.12.21 완료)

#### ✅ 핵심 인프라 구축
- [x] **프로젝트 설정**: Vite + React + TypeScript 완벽 설정
- [x] **PWA 구현**: Service Worker, 앱 매니페스트, 설치 버튼
- [x] **상태 관리**: Zustand 기반 효율적인 상태 관리
- [x] **라우팅**: React Router 기반 SPA 구조

#### ✅ UI/UX 완성
- [x] **레이아웃**: 헤더, 네비게이션, 푸터 포함 완전한 레이아웃
- [x] **네비게이션**: 활성 메뉴 하이라이트, 반응형 디자인
- [x] **테마 시스템**: 라이트/다크 테마 완벽 지원
- [x] **상태 표시**: 실시간 온라인/오프라인 상태 모니터링

#### ✅ 개발 환경 최적화
- [x] **타입 시스템**: 완전한 TypeScript 타입 정의
- [x] **스타일 시스템**: CSS Variables 기반 디자인 토큰
- [x] **성능 최적화**: 코드 분할, 트리 쉐이킹, 번들 최적화

### 🚀 Phase 2 현재 성과 (2025.6.19~6.20)

#### ✅ 개발 재시작 및 환경 점검
- [x] **의존성 업데이트**: 보안 취약점 해결 및 최신 버전 적용
- [x] **개발 환경 재설정**: 개발 서버 및 빌드 시스템 정상화
- [x] **기존 기능 검증**: PWA 기능 및 기본 UI 정상 작동 확인

#### 🎯 PDF 처리 도구 완전 구현 ✅
- [x] **PDF.js 통합**: Mozilla PDF.js 라이브러리 완전 통합
- [x] **다중 파일 시스템**: 여러 PDF 파일 동시 업로드 및 관리
- [x] **페이지 선택 UI**: 슬라이더와 직접 입력 방식 모두 지원
- [x] **품질 설정**: 중품질(150dpi), 고품질(300dpi), 최고품질(600dpi)
- [x] **실시간 썸네일**: 선택된 페이지 범위의 미리보기 자동 생성
- [x] **작업 관리 시스템**: 실시간 진행률 추적 및 완료 알림
- [x] **반응형 UI**: 모바일과 데스크톱 최적화된 인터페이스
- [x] **에러 처리**: 파일 검증, 메모리 관리, 사용자 피드백

#### 🔧 작업 관리 시스템 구축 ✅
- [x] **TaskStore**: Zustand 기반 작업 상태 관리
- [x] **실시간 진행률**: 페이지별 변환 진행률 실시간 업데이트
- [x] **작업 완료 처리**: 자동 완료 감지 및 3초 후 정리
- [x] **상세보기 토글**: 작업 목록 상세 정보 표시/숨김
- [x] **시각적 피드백**: 진행 중, 완료, 오류 상태별 색상 구분

### 🔄 다음 목표 (Phase 2 계속 - 6월 21일부터)

#### 🎯 이미지 처리 도구 (6/21-7/7)
1. **이미지 업로드 시스템**
   - 다중 이미지 파일 업로드
   - 드래그앤드롭 인터페이스
   - 실시간 미리보기

2. **이미지 편집 기능**
   - Canvas API 기반 편집 엔진
   - 리사이징 (픽셀, 퍼센트, 비율 유지)
   - 회전 및 플립
   - 크롭 기능

3. **포맷 및 최적화**
   - PNG, JPG, WebP, AVIF 변환
   - 압축 및 품질 조절
   - 배치 처리 지원

4. **PDF 생성**
   - 여러 이미지를 PDF로 결합
   - 페이지 크기 및 여백 설정

#### 🎥 영상 처리 도구 (7/8-7/21)
- FFmpeg.wasm 통합
- 영상에서 음성 추출
- 포맷 변환 및 압축
- 기본 편집 기능

## 🛠️ 기술 스택

### Core Framework
- **Frontend**: React 18 + TypeScript 5.0
- **Build Tool**: Vite 5.0 + SWC
- **State Management**: Zustand
- **Routing**: React Router DOM v6

### PWA & Performance
- **Service Worker**: Workbox (Vite PWA Plugin)
- **Caching Strategy**: Cache First + Network First 하이브리드
- **Code Splitting**: Dynamic Imports + React.lazy
- **Bundle Optimization**: Tree Shaking + Dead Code Elimination

### UI/UX
- **Styling**: CSS Modules + CSS Variables
- **Theme**: Light/Dark 모드 지원
- **Responsive**: Mobile-First 반응형 디자인
- **Icons**: Unicode Emoji (추후 Icon Library 검토)

### PDF Processing ✅ 구현 완료
- **PDF Engine**: PDF.js (Mozilla) - 완전 통합
- **Canvas Rendering**: HTML5 Canvas API
- **File Handling**: File API + FileReader
- **Image Export**: Canvas.toBlob() + FileSaver.js
- **Progress Tracking**: Custom Task Management System
- **Memory Management**: 대용량 파일 최적화

### File Processing (Phase 2에서 추가 예정)
- **Image**: Canvas API + WebAssembly (Sharp.js)
- **Video**: FFmpeg.wasm
- **PDF Generation**: PDF-lib + jsPDF
- **Compression**: JSZip + Pako
- **Parsing**: PapaParse (CSV) + xml-js

### Storage & Offline
- **Large Data**: IndexedDB (Dexie.js)
- **Settings**: LocalStorage
- **Cache**: Cache API + Service Worker

## 🏗️ 프로젝트 구조

```
tools/
├── personal-tools-app/              # 🎯 메인 애플리케이션
│   ├── public/                      # 정적 자원
│   │   ├── favicon.ico             # ✅ 파비콘 설정 완료
│   │   ├── pwa-*.png               # ✅ PWA 아이콘 완료
│   │   ├── apple-touch-icon.png    # ✅ 애플 아이콘 완료
│   │   └── pdf.worker.min.mjs      # ✅ PDF.js 워커 파일
│   ├── src/
│   │   ├── components/             # ✅ 컴포넌트 시스템
│   │   │   ├── common/             # ✅ 공통 컴포넌트
│   │   │   │   ├── Layout/         # ✅ 레이아웃 완료
│   │   │   │   ├── TaskSystem/     # ✅ 작업 관리 시스템 완료
│   │   │   │   └── PWAUpdatePrompt/ # ✅ PWA 업데이트 프롬프트
│   │   │   ├── PWAInstallButton/   # ✅ PWA 설치 버튼
│   │   │   ├── forms/              # 📝 폼 컴포넌트 (Phase 2)
│   │   │   └── ui/                 # 📝 기본 UI (Phase 2)
│   │   ├── pages/                  # ✅ 페이지 구조 완료
│   │   │   ├── Dashboard/          # ✅ 대시보드
│   │   │   ├── PdfTools/           # ✅ PDF 도구 완성
│   │   │   │   └── PdfToImage/     # ✅ PDF → 이미지 변환 완료
│   │   │   ├── ImageTools/         # 🔄 이미지 도구 (6/21 시작)
│   │   │   └── VideoTools/         # 📝 영상 도구 (7/8 시작)
│   │   ├── hooks/                  # ✅ 커스텀 훅
│   │   │   └── usePWA.ts          # ✅ PWA 훅 완료
│   │   ├── stores/                 # ✅ 상태 관리 완료
│   │   │   ├── appStore.ts         # ✅ 앱 전역 상태
│   │   │   ├── toolStore.ts        # ✅ 도구 상태
│   │   │   └── taskStore.ts        # ✅ 작업 관리 상태 완료
│   │   ├── types/                  # ✅ 타입 정의 완료
│   │   │   ├── common.ts           # ✅ 공통 타입
│   │   │   ├── tool.ts             # ✅ 도구 타입
│   │   │   ├── task.ts             # ✅ 작업 타입 완료
│   │   │   └── pwa.ts              # ✅ PWA 타입
│   │   ├── styles/                 # ✅ 스타일 시스템 완료
│   │   │   ├── variables.css       # ✅ 디자인 토큰
│   │   │   └── globals.css         # ✅ 전역 스타일
│   │   ├── utils/                  # 📝 유틸리티 (Phase 2)
│   │   ├── services/               # 📝 서비스 레이어 (Phase 2)
│   │   └── workers/                # 📝 Web Workers (Phase 2)
│   ├── vite.config.ts              # ✅ Vite 설정 완료
│   └── package.json                # ✅ 의존성 관리 (업데이트됨)
├── docs/                           # 📚 프로젝트 문서
│   └── 개발계획.md                 # ✅ 상세 개발 계획 (업데이트됨)
└── README.md                       # ✅ 프로젝트 개요 (현재 파일)
```

## 🚀 개발 환경 설정

### 필수 요구사항
- **Node.js**: 18.0.0 이상
- **npm**: 9.0.0 이상 또는 **yarn**: 1.22.0 이상
- **Git**: 2.40.0 이상

### 개발 환경 설정 가이드

```bash
# 1. 프로젝트 클론
git clone <repository-url>
cd tools/personal-tools-app

# 2. 의존성 설치
npm install

# 3. 개발 서버 시작
npm run dev            # http://localhost:3000

# 4. 빌드 테스트
npm run build          # 프로덕션 빌드
npm run preview        # 빌드된 앱 미리보기
```

### 📱 PWA 기능 테스트

```bash
# HTTPS 환경에서 PWA 기능 완전 테스트
npm run build
npm run preview
# 또는
npx serve dist -s
```

**확인해야 할 PWA 기능:**
1. ✅ 주소창 우측 설치 아이콘
2. ✅ 개발자 도구 → Application → Manifest
3. ✅ Service Worker 등록 상태
4. ✅ 오프라인 모드 동작
5. ✅ 앱 설치 및 홈 화면 추가

## 🌐 배포 및 브랜치 전략

### 배포 플랫폼
- **Production**: Vercel (자동 배포)
- **Preview**: Vercel Preview (PR별 자동 생성)
- **PWA**: HTTPS 환경에서 완전한 PWA 기능 지원

### Git 브랜치 전략

```
main                    # 🌟 프로덕션 브랜치 (Phase 1 + PDF 도구 완료)
├── develop            # 🔄 개발 통합 브랜치  
└── feature/           # 🚀 기능별 브랜치
    ├── initial-settings  ✅ (완료, 머지됨)
    ├── pdf-tools        ✅ (PDF 도구 완료, 머지됨)
    ├── image-tools      🔄 (이미지 도구, 6/21 시작)
    └── video-tools      📝 (영상 도구, 7/8 시작)
```

### 현재 브랜치 상태
- **main**: Phase 1 + PDF 도구 완료 상태 (안정)
- **feature/pdf-tools**: 완료 및 머지
- **다음 작업**: `feature/image-tools` (6월 21일 시작)

## 📈 성능 지표

### 현재 성과 (Phase 1 + PDF 도구 - 2025.6.20)
- ✅ **Lighthouse PWA Score**: 100/100 (확인됨)
- ✅ **Bundle Size**: < 300KB (gzipped, PDF.js 포함)
- ✅ **First Contentful Paint**: < 1.5초
- ✅ **Time to Interactive**: < 3초
- ✅ **Offline Functionality**: 완전 지원
- ✅ **PDF Processing**: 54페이지 PDF 처리 시간 < 30초

### Phase 2 목표 (2025년 여름)
- 🎯 **이미지 처리 성능**: 4K 이미지 < 3초 리사이징
- 🎯 **영상 처리**: 100MB 영상 파일 < 2분 변환
- 🎯 **메모리 사용량**: < 500MB (대용량 파일 처리 시)
- 🎯 **PWA 스코어**: 100점 유지
- 🎯 **번들 크기**: < 1MB (모든 기능 포함 시)

## 🤝 기여 가이드

### 개발 워크플로우
1. **브랜치 생성**: `feature/기능명` 형태로 생성
2. **개발 & 테스트**: 로컬에서 기능 구현 및 테스트
3. **PR 생성**: 상세한 설명과 스크린샷 포함
4. **리뷰 & 머지**: 코드 리뷰 후 develop 브랜치로 머지

### 코딩 컨벤션
- **파일명**: PascalCase (컴포넌트), camelCase (유틸리티)
- **변수명**: camelCase, 명확한 의미 전달
- **타입**: PascalCase, Interface는 I 접두사
- **상수**: SCREAMING_SNAKE_CASE

## 📚 추가 자료

- 📋 [상세 개발 계획](./docs/개발계획.md) ✅ 업데이트됨 (6/20)
- 🎯 [기능 명세서](./docs/기능명세서.md) (작성 예정)
- 🏗️ [아키텍처 가이드](./docs/아키텍처.md) (작성 예정)
- 🧪 [테스트 가이드](./docs/테스트.md) (작성 예정)

## 📄 라이선스

이 프로젝트는 개인 사용 목적으로 개발되었습니다.

---

<div align="center">

**⭐ 프로젝트가 도움이 되었다면 Star를 눌러주세요!**

![Phase 1 Complete](https://img.shields.io/badge/Phase%201-Complete-success.svg)
![PDF Tools Complete](https://img.shields.io/badge/PDF%20Tools-Complete-success.svg)
![Phase 2 Active](https://img.shields.io/badge/Phase%202-50%25%20Complete-orange.svg)
![PWA Ready](https://img.shields.io/badge/PWA-Ready-green.svg)

**최근 완성**: PDF → 이미지 변환 도구 (2025년 6월 20일)  
**다음 마일스톤**: 이미지 처리 도구 개발 (6월 21일 시작)  
**목표**: 2025년 8월 최종 완료



# 개인용 다기능 도구 웹앱

> React 기반 PWA로 구현된 개인용 멀티툴 웹 애플리케이션

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg)](https://vitejs.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-green.svg)](https://web.dev/progressive-web-apps/)

## 프로젝트 소개

파일 처리, 이미지 편집, 영상 변환 등 개인적으로 자주 사용하는 도구들을 한 곳에 모은 웹 애플리케이션입니다. 오프라인에서도 작동하며, 모든 처리는 브라우저 내에서 이루어져 개인정보를 보호합니다.

### 핵심 특징

- 🔄 **오프라인 우선**: 인터넷 연결 없이도 대부분 기능 사용 가능
- 🔒 **프라이버시 보호**: 모든 파일 처리가 클라이언트 사이드에서 진행
- ⚡ **빠른 성능**: Web Worker와 코드 분할로 최적화
- 📱 **반응형 디자인**: 데스크톱과 모바일 모두 지원
- 🎯 **확장 가능**: 플러그인 아키텍처로 새 도구 추가 용이

## 기능 개요

### 1차 기능 (개발 예정)
- **파일 처리**: CSV/JSON/XML 변환, ZIP 압축/해제, 메타데이터 분석
- **이미지 처리**: 리사이징, 포맷 변환, 압축, PDF 결합
- **영상 처리**: 음성 추출, 포맷 변환, 압축, 기본 편집

### 2차 기능 (확장 예정)
- **AI 연동**: OpenAI/Google Cloud AI API 활용
- **고급 기능**: 배치 처리, 워크플로우, 히스토리 관리

## 개발 현황

**📅 프로젝트 시작**: 2024년 6월 19일  
**🎯 현재 단계**: Phase 1 - 기반 구축  
**📋 상세 계획**: [개발 계획서](./docs/개발계획.md)

### 진행 상황

#### ✅ 완료된 작업 (2024.06.19)
- [x] 프로젝트 초기 설정 (Vite + React + TypeScript)
- [x] 기본 프로젝트 구조 생성
- [x] 개발 계획 및 문서화
- [x] 기본 의존성 설치

#### 🔄 진행 중
- [ ] PWA 설정 (Service Worker, Manifest)
- [ ] 기본 라우팅 및 레이아웃 구조
- [ ] 상태 관리 (Zustand) 설정

#### ⏳ 예정 작업
- [ ] 공통 컴포넌트 개발
- [ ] 브라우저 API 추상화 레이어
- [ ] 에러 바운더리 및 로딩 상태 관리

## 기술 스택

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Routing**: React Router DOM
- **Styling**: CSS Modules

### PWA & Performance
- **Service Worker**: 오프라인 캐싱
- **Web Workers**: 멀티스레딩 처리
- **Code Splitting**: 지연 로딩

### File Processing
- **Image**: Canvas API, Sharp.js (WASM)
- **Video**: FFmpeg.wasm
- **PDF**: PDF-lib
- **Compression**: JSZip, Pako

### Storage
- **Large Data**: IndexedDB (Dexie.js)
- **Settings**: LocalStorage
- **Cache**: Cache API

## 프로젝트 구조

```
tools/
├── personal-tools-app/     # React 앱 메인 디렉토리
│   ├── src/               # 소스 코드
│   │   ├── components/    # 재사용 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── hooks/         # 커스텀 훅
│   │   ├── utils/         # 유틸리티 함수
│   │   ├── services/      # 서비스 레이어
│   │   ├── stores/        # 상태 관리
│   │   ├── types/         # TypeScript 타입
│   │   └── styles/        # 스타일
│   ├── public/            # 정적 자원
│   └── package.json       # 의존성 관리
├── docs/                  # 프로젝트 문서
│   └── 개발계획.md        # 상세 개발 계획
└── README.md              # 프로젝트 개요
```

## 개발 환경 설정

### 필수 요구사항
- Node.js 18+
- npm 또는 yarn
- Git

### 설치 및 실행

```bash
# 프로젝트 클론
git clone <repository-url>
cd tools

# 의존성 설치
cd personal-tools-app
npm install

# 개발 서버 시작
npm run dev

# 빌드
npm run build

# 빌드 미리보기
npm run preview
```

## 배포 계획

- **플랫폼**: Vercel
- **도메인**: TBD
- **환경**: Production, Preview 자동 생성
- **PWA**: 앱 설치 지원

## 개발 브랜치 전략

```
main              # 프로덕션 브랜치
├── develop       # 개발 브랜치
└── feature/*     # 기능별 브랜치
    ├── feature/initial-settings
    ├── feature/file-tools
    ├── feature/image-tools
    └── feature/video-tools
```

## 라이선스

이 프로젝트는 개인 사용 목적으로 개발되었습니다.

## 문서

- 📋 [상세 개발 계획](./docs/개발계획.md)
- 🎯 [기능 명세서](./docs/기능명세서.md) (작성 예정)
- 🏗️ [아키텍처 가이드](./docs/아키텍처.md) (작성 예정)

---

**Last Updated**: 2024년 6월 19일  
**Developer**: Personal Project  
**Status**: 🚧 개발 중

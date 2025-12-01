# 프로젝트 구조

## 전체 디렉토리 구조

```
hackServer/
├── app/                          # Next.js App Router
│   ├── api/                      # API 라우트
│   │   ├── documents/
│   │   │   ├── route.ts          # 문서 목록 조회, 생성
│   │   │   └── [id]/
│   │   │       └── route.ts      # 문서 조회, 수정, 삭제
│   │   ├── edit-logs/
│   │   │   └── route.ts          # 편집 로그 조회
│   │   └── socket/
│   │       └── route.ts         # Socket.IO 플레이스홀더
│   ├── docs/
│   │   ├── page.tsx             # 문서 목록 페이지
│   │   └── [id]/
│   │       └── page.tsx         # 문서 편집 페이지
│   ├── layout.tsx               # 루트 레이아웃
│   ├── page.tsx                 # 홈 페이지 (닉네임 입력)
│   └── globals.css              # 전역 스타일
├── components/                   # React 컴포넌트
│   ├── DocumentEditor.tsx       # 문서 편집기 컴포넌트
│   ├── Timeline.tsx             # 타임라인 패널 컴포넌트
│   └── UserList.tsx             # 사용자 목록 컴포넌트
├── lib/                         # 유틸리티 및 훅
│   ├── hooks/
│   │   ├── usePresence.ts       # 접속자 관리 훅
│   │   ├── useDocumentSync.ts   # 문서 동기화 훅
│   │   └── useTimeline.ts       # 타임라인 훅
│   ├── prisma.ts                # Prisma 클라이언트 싱글톤
│   ├── types.ts                 # TypeScript 타입 정의
│   └── websocket.ts             # Socket.IO 서버 설정
├── prisma/
│   └── schema.prisma            # 데이터베이스 스키마
├── server.ts                    # 커스텀 서버 (Socket.IO 포함)
├── package.json                 # 프로젝트 설정 및 의존성
├── tsconfig.json                # TypeScript 설정
├── tailwind.config.ts           # Tailwind CSS 설정
├── postcss.config.js            # PostCSS 설정
├── next.config.js               # Next.js 설정
├── .gitignore                   # Git 무시 파일
├── README.md                    # 프로젝트 문서
└── PROJECT_STRUCTURE.md         # 이 파일
```

## 주요 파일 설명

### 서버 및 설정 파일

- **server.ts**: Next.js 커스텀 서버. Socket.IO를 초기화하고 HTTP 서버를 실행합니다.
- **lib/websocket.ts**: Socket.IO 서버 로직. 문서별 방(room) 관리, 접속자 관리, 실시간 이벤트 브로드캐스트를 처리합니다.

### 데이터베이스

- **prisma/schema.prisma**: 데이터베이스 스키마 정의
  - `Document`: 문서 테이블
  - `EditLog`: 편집 로그 테이블
- **lib/prisma.ts**: Prisma 클라이언트 싱글톤 인스턴스

### API 라우트

- **app/api/documents/route.ts**: 문서 목록 조회(GET), 문서 생성(POST)
- **app/api/documents/[id]/route.ts**: 문서 조회(GET), 수정(PATCH), 삭제(DELETE)
- **app/api/edit-logs/route.ts**: 편집 로그 조회(GET)

### 페이지

- **app/page.tsx**: 홈 페이지. 닉네임 입력 및 localStorage 저장
- **app/docs/page.tsx**: 문서 목록 페이지. 문서 카드 표시 및 새 문서 생성
- **app/docs/[id]/page.tsx**: 문서 편집 페이지. 실시간 협업 편집, 타임라인 표시

### 컴포넌트

- **components/DocumentEditor.tsx**: 
  - 텍스트 에디터 (textarea 기반)
  - 실시간 동기화
  - 편집 로그 자동 생성
  - 타임라인 클릭 시 스크롤 기능

- **components/UserList.tsx**: 
  - 현재 접속 중인 사용자 목록 표시
  - 편집 중인 사용자 표시

- **components/Timeline.tsx**: 
  - 편집 로그 리스트 표시
  - 시간순 정렬 (최신이 위)
  - 클릭 시 해당 위치로 스크롤

### 커스텀 훅

- **lib/hooks/usePresence.ts**: 
  - Socket.IO 연결 관리
  - 접속자 목록 관리
  - 편집 상태 관리 (startEditing, stopEditing)

- **lib/hooks/useDocumentSync.ts**: 
  - 문서 내용 실시간 동기화
  - 디바운스를 통한 자동 저장
  - WebSocket 이벤트 수신 및 처리

- **lib/hooks/useTimeline.ts**: 
  - 편집 로그 조회 및 관리
  - 실시간 편집 로그 수신
  - 편집 로그 생성 함수 제공

### 타입 정의

- **lib/types.ts**: 
  - WebSocket 이벤트 타입 정의
  - Collaborator 인터페이스
  - 클라이언트-서버 이벤트 타입

## 데이터 흐름

### 문서 편집 흐름

1. 사용자가 텍스트 입력
2. `DocumentEditor`의 `handleChange` 호출
3. `useDocumentSync`의 `updateDocument` 호출 (디바운스 500ms)
4. 디바운스 후:
   - WebSocket으로 다른 클라이언트에 브로드캐스트
   - API를 통해 DB에 저장

### 실시간 동기화 흐름

1. 클라이언트 A가 문서 수정
2. WebSocket 이벤트 `update_document` 전송
3. 서버가 같은 방의 다른 클라이언트들에게 브로드캐스트
4. 클라이언트 B가 `document_updated` 이벤트 수신
5. `useDocumentSync`가 콜백 호출하여 UI 업데이트

### 타임라인 생성 흐름

1. 사용자가 의미 있는 변경 수행 (Enter, 마침표, blur)
2. `DocumentEditor`의 `handleEditLog` 호출
3. 줄 번호 및 요약 텍스트 계산
4. `useTimeline`의 `createEditLog` 호출
5. WebSocket으로 서버에 전송
6. 서버가 DB에 저장 후 모든 클라이언트에 브로드캐스트
7. 모든 클라이언트의 타임라인에 새 항목 추가

### 접속자 관리 흐름

1. 사용자가 문서 페이지 접속
2. `usePresence` 훅이 Socket.IO 연결
3. `join_document` 이벤트 전송
4. 서버가 방에 사용자 추가
5. 모든 클라이언트에 `collaborator_joined` 이벤트 브로드캐스트
6. 모든 클라이언트의 사용자 목록 업데이트

## 주요 기술적 결정

1. **Socket.IO 사용**: 실시간 양방향 통신을 위해 WebSocket 기반 Socket.IO 사용
2. **디바운스**: 과도한 네트워크 요청 방지를 위해 문서 저장 및 편집 로그 생성에 디바운스 적용
3. **문서별 방(room)**: Socket.IO의 room 기능을 사용하여 문서별로 접속자 관리
4. **메모리 기반 접속자 관리**: 서버 재시작 시 초기화되지만, 간단한 MVP에서는 충분
5. **SQLite 사용**: 로컬 개발 환경에서 쉽게 사용할 수 있는 파일 기반 데이터베이스
6. **커스텀 서버**: Socket.IO를 Next.js와 통합하기 위해 커스텀 서버 사용


# 기능 추가 요약

## 추가된 기능

### 1. 세션 히스토리(리플레이) 기능

문서의 변경 이력을 시간순으로 재생하여 볼 수 있는 기능입니다.

#### 구현 파일

- **`lib/hooks/useSessionReplay.ts`**: 리플레이 로직을 관리하는 커스텀 훅
  - EditLog를 시간순으로 정렬하여 재생
  - 재생/일시정지, 이전/다음 스텝 이동, 속도 조절 기능 제공
  - 각 EditLog 시점의 문서 내용을 추정하여 히스토리 생성

- **`components/SessionReplay.tsx`**: 리플레이 UI 컴포넌트
  - 재생 컨트롤 패널 (재생/일시정지, 이전/다음 버튼)
  - 속도 조절 (1x, 2x, 4x)
  - 진행 바 (슬라이더)
  - 현재 재생 중인 로그 정보 표시

#### 동작 방식

1. **데이터 준비**
   - EditLog를 `createdAt` 기준 오름차순으로 정렬
   - 각 EditLog의 summary를 기반으로 문서 내용 변화 시뮬레이션
   - 각 시점의 내용을 배열로 저장 (`contentHistoryRef`)

2. **재생 로직**
   - `setInterval`을 사용하여 지정된 속도로 자동 재생
   - 각 스텝마다 해당 시점의 문서 내용을 메인 에디터에 표시
   - 리플레이 모드일 때는 실제 편집 비활성화 (readOnly)

3. **상태 관리**
   - `isReplaying`: 재생 중 여부
   - `currentIndex`: 현재 재생 중인 EditLog 인덱스
   - `replayContent`: 현재 재생 중인 문서 내용
   - `speed`: 재생 속도 (1x, 2x, 4x)

#### 주요 특징

- 기존 EditLog 데이터를 재활용하여 구현 (추가 스키마 변경 없음)
- 리플레이 모드일 때 실시간 편집과 충돌하지 않도록 분리
- 메인 에디터를 읽기 전용으로 전환하여 리플레이 내용 표시

---

### 2. 유저별 기여도 바 차트

문서에 대한 각 사용자의 편집 기여도를 막대 그래프로 시각화하는 기능입니다.

#### 구현 파일

- **`app/api/edit-logs/stats/route.ts`**: 기여도 통계 API
  - EditLog를 사용자별로 집계
  - 기간 필터 지원 (전체, 오늘, 최근 7일)
  - 사용자별 편집 횟수와 비율 계산

- **`lib/hooks/useContributionStats.ts`**: 기여도 통계 훅
  - API를 호출하여 통계 데이터 로드
  - 기간 필터 변경 시 자동 재로드

- **`components/ContributionChart.tsx`**: 기여도 차트 컴포넌트
  - 가로 막대 그래프 형태로 표시
  - 사용자별 편집 횟수와 비율 표시
  - 기간 필터 버튼 (전체/오늘/7일)

#### 동작 방식

1. **데이터 집계**
   - 해당 문서의 EditLog를 사용자별로 그룹화
   - 각 사용자의 EditLog 개수 계산
   - 전체 대비 비율 계산 (`count / totalCount * 100`)

2. **기간 필터**
   - `all`: 전체 기간
   - `today`: 오늘 생성된 EditLog만
   - `week`: 최근 7일간 생성된 EditLog만

3. **시각화**
   - Tailwind CSS만으로 구현한 가로 막대 그래프
   - 가장 많은 기여를 한 사용자의 막대를 100%로 설정
   - 나머지 사용자는 상대 비율로 표시

#### 주요 특징

- 별도 차트 라이브러리 없이 Tailwind CSS만으로 구현
- 기간별 필터링으로 다양한 관점에서 기여도 확인 가능
- 실시간으로 업데이트되는 EditLog를 반영하여 통계 자동 갱신

---

## 통합 및 수정 사항

### `app/docs/[id]/page.tsx` 수정

1. **새로운 훅 추가**
   - `useSessionReplay`: 리플레이 상태 관리
   - `useContributionStats`: 기여도 통계 로드

2. **상태 추가**
   - `showReplay`: 리플레이 모드 표시 여부
   - `contributionPeriod`: 기여도 차트 기간 필터

3. **UI 구조 변경**
   - 우측 사이드바에 리플레이 모드와 일반 모드 분리
   - 일반 모드: 기여도 차트 + 히스토리 재생 버튼 + 타임라인
   - 리플레이 모드: 리플레이 컨트롤 패널

4. **편집 제어**
   - 리플레이 모드일 때 `DocumentEditor`를 읽기 전용으로 설정
   - 리플레이 모드일 때 실시간 WebSocket 업데이트 비활성화

### `components/DocumentEditor.tsx` 수정

1. **readOnly prop 추가**
   - 리플레이 모드일 때 편집 불가능하도록 설정
   - 읽기 전용일 때 시각적 피드백 제공 (배경색 변경)

2. **편집 이벤트 처리**
   - `readOnly`가 true일 때는 편집 이벤트 무시

---

## 데이터 흐름

### 세션 리플레이 흐름

```
1. 사용자가 "히스토리 재생" 버튼 클릭
   ↓
2. useSessionReplay 훅이 EditLog를 시간순으로 정렬
   ↓
3. 각 EditLog의 summary를 기반으로 내용 히스토리 생성
   ↓
4. 재생 시작 시 setInterval로 자동 재생
   ↓
5. 각 스텝마다 replayContent 업데이트
   ↓
6. DocumentEditor에 readOnly 모드로 표시
```

### 기여도 통계 흐름

```
1. 문서 페이지 로드 시 useContributionStats 훅 실행
   ↓
2. /api/edit-logs/stats API 호출
   ↓
3. Prisma로 EditLog 조회 및 사용자별 집계
   ↓
4. 사용자별 count와 ratio 계산
   ↓
5. ContributionChart 컴포넌트에 전달하여 표시
   ↓
6. 기간 필터 변경 시 API 재호출하여 갱신
```

---

## 변경된 파일 목록

### 새로 생성된 파일

1. `lib/hooks/useSessionReplay.ts` - 리플레이 로직 훅
2. `lib/hooks/useContributionStats.ts` - 기여도 통계 훅
3. `components/SessionReplay.tsx` - 리플레이 UI 컴포넌트
4. `components/ContributionChart.tsx` - 기여도 차트 컴포넌트
5. `app/api/edit-logs/stats/route.ts` - 기여도 통계 API

### 수정된 파일

1. `app/docs/[id]/page.tsx` - 두 기능 통합 및 UI 구조 변경
2. `components/DocumentEditor.tsx` - readOnly prop 추가

---

## 사용 방법

### 세션 히스토리 재생

1. 문서 편집 페이지의 우측 사이드바에서 "히스토리 재생" 버튼 클릭
2. 리플레이 컨트롤 패널이 표시됨
3. 재생/일시정지 버튼으로 자동 재생 제어
4. 이전/다음 버튼으로 수동 스텝 이동
5. 슬라이더로 특정 시점으로 이동
6. 속도 버튼으로 재생 속도 조절 (1x, 2x, 4x)
7. "중지" 버튼 또는 X 버튼으로 리플레이 모드 종료

### 유저별 기여도 확인

1. 문서 편집 페이지의 우측 사이드바 상단에 기여도 차트 표시
2. "전체", "오늘", "최근 7일" 버튼으로 기간 필터 변경
3. 각 사용자의 편집 횟수와 비율을 막대 그래프로 확인

---

## 기술적 고려사항

### 세션 리플레이

- **제한사항**: EditLog의 summary만으로는 정확한 문서 내용 변화를 재현하기 어려움
  - 현재는 summary를 기반으로 간단한 시뮬레이션 수행
  - 향후 개선 시: EditLog에 변경 전/후 내용 스냅샷 저장 필요

- **성능**: 많은 EditLog가 있을 경우 메모리 사용량 증가 가능
  - 현재는 모든 히스토리를 메모리에 저장
  - 향후 개선 시: 필요 시점에만 로드하는 방식 고려

### 기여도 통계

- **집계 기준**: EditLog 개수 기준 (1개 EditLog = 1회 기여)
  - 실제 편집량(문자 수 등)과는 다를 수 있음
  - 현재 구조에서는 EditLog가 가장 적절한 지표

- **실시간 업데이트**: EditLog가 추가될 때 자동으로 통계 갱신
  - useContributionStats 훅이 period 변경 시에만 재로드
  - 실시간 갱신이 필요하면 추가 구현 필요

---

## 향후 개선 가능 사항

1. **세션 리플레이**
   - EditLog에 변경 전/후 내용 스냅샷 저장하여 정확한 재현
   - 리플레이 중 특정 시점의 내용을 새 문서로 저장하는 기능
   - 리플레이 속도 더 세밀한 조절 (0.5x, 3x 등)

2. **기여도 차트**
   - 편집량(문자 수) 기준 기여도 계산
   - 시간대별 기여도 추이 그래프
   - 사용자별 색상 일관성 유지 (UserList와 동일한 색상 사용)

3. **전체적인 개선**
   - 리플레이와 기여도 차트를 별도 페이지로 분리하여 더 넓은 화면 활용
   - 리플레이 내보내기 기능 (비디오 또는 GIF로 저장)


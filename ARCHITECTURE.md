# 🏗 burst-landing 아키텍처

Step 0A 완료 시점 기준 프론트엔드 구조·설계 원칙·백엔드 연동 방안.

---

## 🎯 핵심 설계 원칙 (v2.1 확정)

### 1. Single Source of Truth — SessionEngine
- 게임 상태의 "진짜 정답"은 `src/lib/session-engine.ts` 한 군데
- sessionStorage 기반, 탭 단위 유지
- `GameProvider`는 이걸 읽어서 React 트리에 뿌리는 **렌더용 캐시**

```
┌──────────────────┐
│ SessionEngine    │  ← 여기가 유일한 "쓰기" 진입점
│ (sessionStorage) │
└─────────┬────────┘
          │ read
          ▼
┌──────────────────┐
│ GameProvider     │  ← React Context
└─────────┬────────┘
          │ useGame()
          ▼
┌──────────────────┐
│ 페이지 컴포넌트   │
└──────────────────┘
```

### 2. Scenario 전파 규칙
- `?scenario=<name>` 파라미터는 **첫 진입 시 1회**만 SessionEngine이 읽고 sessionStorage에 저장
- 이후 URL에서 파라미터가 사라져도 세션 유지
- `?reset=1`로 명시적 초기화

### 3. Self-Healing Route Guard (GuardShell)
- 모든 페이지 진입 시 `useRouteGuard` 호출
- 기대 phase와 실제 phase가 불일치하면 `router.replace`
- 판단 중(`isResolving=true`)일 때 Skeleton 렌더 → **"잠깐 잘못된 화면" 방지**

리다이렉트 규칙:

| 현재 페이지 | 실제 phase | 리다이렉트 |
|---|---|---|
| /waiting | LIVE | /play |
| /waiting | ENDED | /result/{success,fail} |
| /play | WAITING | /waiting |
| /play | ENDED | /result/{success,fail} |
| /result | WAITING | /waiting |
| /result | LIVE | /play |

### 4. Terminal 단방향
- `SessionEngine.setTerminal()`은 한 번 설정 후 덮어쓰지 않음
- 우선순위: `SOLD_OUT > BURST > TIME_UP` (서버가 원자 처리, 클라는 그대로 반영)

### 5. 접근성 (prefers-reduced-motion)
- `useMotionPreference()` 훅이 감지
- true일 때 끄는 항목:
  - confetti
  - 사이렌 / 테두리 맥동
  - 박 흔들림 약화
  - `navigator.vibrate` 진동

---

## 📊 데이터 흐름

### 대기실 (/waiting)
```
Page 진입
  → useRouteGuard("waiting") : phase 확인
  → useServerTime()           : 200ms마다 현재 시각
  → 카운트다운 = session.openAt - serverNow
  → openAt 도달 시 SessionEngine.transition("LIVE") + router.replace("/play")
```

### 게임 (/play)
```
Page 진입
  → useRouteGuard("play")     : phase 확인
  → useServerTime()           : 타이머 표시
  → useBurstGauge()           : 온도계 ratio 수신
  → useSmash(eventId)         : 드래그 놓으면 smash() 호출
  → smash 응답 LAST_HIT이면 terminal 확정됨 (서버가) → 10초 경과 후 결과 페이지
```

### 결과 (/result/success | /result/fail)
```
Page 진입
  → useRouteGuard("result")   : phase=ENDED 확인
  → fetchResult(eventId)로 terminalState 복구
  → BURST + isWinner면 success / 아니면 fail 렌더
```

---

## 🔌 Mock → 실서버 전환 전략

현재 `src/lib/mock/*`가 응답을 시뮬레이션. 백엔드 연동 시:

### 교체 대상
```
src/lib/mock/mock-api.ts  →  src/lib/api/burst-api.ts  (axios/fetch)
src/lib/mock/mock-ws.ts   →  src/lib/ws/stomp-client.ts (stompjs + sockjs-client)
src/lib/mock/mock-data.ts  →  삭제
```

### 유지되는 것
- `src/types/game.ts` — 타입 계약 (백엔드 DTO와 동기화)
- `src/hooks/*` — 훅 인터페이스 (내부 구현만 교체)
- `src/lib/session-engine.ts` — 로컬 세션 캐시 역할로 유지

### API 계약
백엔드 OpenAPI 스펙 참조: [burst-api/docs/openapi.yaml](https://github.com/burst-bak/burst-api/blob/main/docs/openapi.yaml)

주요 엔드포인트:
```
POST   /api/v1/auth/kakao/callback
POST   /api/v1/events/{eventId}/smash
GET    /api/v1/events/{eventId}
GET    /api/v1/events/{eventId}/result
WS     /ws/events/{eventId}/burst
```

---

## 🗂 Step 0A 파일 책임 매트릭스

| 파일 | 책임 | 의존성 |
|---|---|---|
| `types/game.ts` | API/모델 타입 | 없음 |
| `lib/session-engine.ts` | 세션 상태 읽기·쓰기 | types |
| `lib/mock/mock-api.ts` | HTTP 시뮬레이션 | session-engine |
| `lib/mock/mock-ws.ts` | WebSocket 시뮬레이션 | session-engine |
| `store/auth-context.tsx` | 인증 상태 | types, mock-data |
| `store/game-context.tsx` | 세션 상태 읽기 전용 래퍼 | session-engine |
| `hooks/useAuth.ts` | AuthContext 소비 | auth-context |
| `hooks/useGame.ts` | GameContext 소비 | game-context |
| `hooks/useRouteGuard.ts` | 라우트 가드 | session-engine, next/navigation |
| `hooks/useServerTime.ts` | 서버 시각 구독 | mock-ws |
| `hooks/useSmash.ts` | 발사 요청 | mock-api |
| `hooks/useBurstGauge.ts` | 게이지 구독 | mock-ws |
| `hooks/useMotionPreference.ts` | a11y 모션 감지 | 없음 |

---

## 🧪 수동 검증 시나리오

Step 0A 기준. 0B 이후 페이지 생기면 추가.

```
1. /waiting/test-event?scenario=wait5
   → 콘솔: SessionEngine.getState() 결과 확인
   → scenario=wait5, phase=WAITING, openAt ≈ now + 5000

2. 새로고침 (URL에서 scenario 빼기)
   → SessionEngine.getState() 결과 유지 (scenario=wait5)

3. ?reset=1 쿼리로 재접속
   → 세션 초기화 후 새 상태

4. 5초 경과 후 /waiting 재진입
   → useRouteGuard가 /play로 리다이렉트 (0B 이후 확인 가능)
```

---

## 🔮 Phase 확장 (향후 로드맵)

### Phase 0B (다음 작업)
- Bak / Sandbag / Thermometer / GameTimer / CountdownOverlay / TeacherPopup 컴포넌트
- drag input을 `InputStrategy` 패턴으로 추상화 (drag → tap 확장 용이)

### Phase 1~5
- `/waiting`, `/play`, `/result/*` 페이지
- 랜딩에 "운동장 가기" 버튼 (우측 상단)

### Phase B (백엔드 연동)
- mock 레이어 교체
- Kakao OAuth 실제 플로우
- STOMP + SockJS WebSocket 연결

### Phase C (최적화·바이럴)
- FCM Web Push
- Lighthouse 최적화
- Sentry / Error tracking

---

## 🔗 참고 문서

- [README.md](./README.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- 기획 원본 (옵시디언): `10_Wiki/Projects/박터트리기*.md`
- 계획 v2.1: `10_Wiki/Projects/박터트리기_프론트구현계획_v2.md`

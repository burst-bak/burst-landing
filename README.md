# 🎃 burst-landing

> **박 터트리기 Vol.1** 프론트엔드 (랜딩 + 대기실 + 게임 + 결과)

10초 안에 서버의 HP를 0으로 만들면 상금. 동시성·Race Condition·DDoS 방어를 실제 트래픽으로 검증하는 **살아 있는 포트폴리오 이벤트**.

- **배포 URL**: https://burst-landing.vercel.app
- **백엔드 레포**: [burst-bak/burst-api](https://github.com/burst-bak/burst-api)
- **오픈 목표일**: 2026-05-05 (Vol.1)

---

## 🚀 빠른 시작

```bash
npm install
npm run dev        # http://localhost:3000
npx tsc --noEmit   # 타입 체크
npm run build      # 프로덕션 빌드
```

### 시나리오별 테스트

mock 시나리오를 URL 쿼리로 선택 (SessionEngine이 sessionStorage에 저장):

```
/waiting/test-event?scenario=wait5    # 5초 뒤 게임 시작
/waiting/test-event?scenario=burst    # 7초에 BURST
/waiting/test-event?scenario=soldout  # 5초에 SOLD_OUT
/waiting/test-event?scenario=timeup   # 10초 풀타임 TIME_UP (기본)
/waiting/test-event?reset=1           # 세션 초기화
/waiting/test-event?mockDelay=2000    # 느린 네트워크 시뮬레이션
```

---

## 🏗 아키텍처 한눈에 보기

```
┌──────────────────────────────────────────────────────┐
│  Next.js 16 (App Router) + React 19 + TypeScript    │
└────────────┬─────────────────────────────────────────┘
             │
  ┌──────────┴──────────┐
  │  AuthProvider       │  ← 카카오 OAuth (MVP는 mock 유저)
  │  GameProvider       │  ← SessionEngine 읽기 전용 래퍼
  └──────────┬──────────┘
             │
  ┌──────────┴──────────┐
  │  SessionEngine      │  ⭐ 단일 진실 소스 (sessionStorage)
  └──────────┬──────────┘
             │
  ┌──────────┴──────────┐
  │  mock-api / mock-ws │  ← 백엔드 연동 전 시뮬레이션
  └─────────────────────┘
             ▲
             │ (실제 서버 연동 시 이 레이어만 교체)
  ┌──────────┴──────────┐
  │ burst-api (Spring)  │  ← Redis Lua + WebSocket STOMP
  └─────────────────────┘
```

상세: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 📂 디렉토리 구조 (Step 0A 기준)

```
src/
├── app/                     Next.js App Router
│   ├── layout.tsx           AuthProvider + GameProvider 래핑
│   ├── page.tsx             랜딩 (기배포)
│   └── preview/             UI 컴포넌트 프리뷰
├── components/ui/           공용 UI
├── hooks/                   커스텀 훅
│   ├── useAuth.ts
│   ├── useGame.ts
│   ├── useRouteGuard.ts     ⭐ GuardShell 핵심
│   ├── useServerTime.ts
│   ├── useSmash.ts
│   ├── useBurstGauge.ts
│   └── useMotionPreference.ts
├── lib/
│   ├── session-engine.ts    ⭐ 단일 진실 소스
│   └── mock/
│       ├── mock-api.ts      fetchEvent / postSmash / fetchResult
│       ├── mock-ws.ts       serverTime / burstGauge
│       └── mock-data.ts     fixtures
├── store/
│   ├── auth-context.tsx
│   └── game-context.tsx
└── types/
    └── game.ts              API 계약 TypeScript 표현
```

---

## 🗺 다음 작업 (팀 온보딩 진입점)

Step 0A (타입·세션·훅) **완료**. 이후 순서:

| Step | 내용 | 담당 |
|---|---|---|
| **0B** | Bak · Sandbag · Thermometer · GameTimer · CountdownOverlay · TeacherPopup 컴포넌트 추출 | 찬호 |
| **1**  | `/waiting/[eventId]/page.tsx` — 대기실 | 찬호 |
| **2**  | `/play/[eventId]/page.tsx` — 게임 (핵심, 14h) | **프론트 Dev 1** |
| **3**  | `/result/success/[eventId]/page.tsx` | 프론트 Dev 1 |
| **4**  | `/result/fail/[eventId]/page.tsx` | 프론트 Dev 1 |
| **5**  | 랜딩 "운동장 가기" 버튼 + 공용 정리 | 프론트 Dev 1 |

**팀원 온보딩 가이드**: [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 🔑 환경 변수

현재 MVP는 public key만 사용:

```
NEXT_PUBLIC_GA_ID=G-6MWNGFTX8V
NEXT_PUBLIC_KAKAO_JS_KEY=<카카오 JS Key>
```

백엔드 연동 후 추가:

```
NEXT_PUBLIC_API_BASE_URL=https://api.burst.XX
NEXT_PUBLIC_WS_URL=wss://api.burst.XX/ws
```

---

## 🔗 관련 문서

- 제품/기획 (옵시디언): `10_Wiki/Projects/박터트리기*.md`
- 프론트 구현 계획 v2.1: `10_Wiki/Projects/박터트리기_프론트구현계획_v2.md`
- 백엔드 API 계약: [burst-api/API.md](https://github.com/burst-bak/burst-api/blob/main/API.md)

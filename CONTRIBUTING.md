# 🤝 burst-landing 기여 가이드

박터트리기 프론트엔드 레포 팀 온보딩 문서. **처음 합류했다면 이 문서부터.**

---

## 🏁 로컬 세팅 (10분)

```bash
git clone https://github.com/burst-bak/burst-landing.git
cd burst-landing
npm install
npm run dev
```

브라우저에서 http://localhost:3000 → 랜딩 확인 → `?scenario=wait5` 붙여서 테스트.

### 모바일 확인
로컬 IP로 휴대폰 접속 (같은 WiFi 필수):
```bash
# 내 IP 확인 후
npm run dev -- -H 0.0.0.0
# → http://192.168.x.x:3000
```

---

## 🌿 브랜치 · 커밋 · PR

### 브랜치 네이밍
```
feature/step-2-play-page        기능
fix/route-guard-flicker          버그
chore/update-deps                잡무
docs/add-api-examples            문서
```

### 커밋 메시지
한글 OK. 접두사 권장:
```
feat: /play 페이지 기본 레이아웃
fix: 쿨다운 타이머 음수 값 방지
refactor: Sandbag 드래그 로직 훅 분리
docs: SessionEngine 사용 예시 추가
```

### PR 체크리스트
- [ ] `npx tsc --noEmit` 에러 없음
- [ ] `npm run build` 성공
- [ ] 관련 시나리오 수동 테스트 완료 (`?scenario=...`)
- [ ] 모바일(작은 화면) 확인 (safe-area 레이아웃 깨짐 여부)
- [ ] `CHANGELOG`에 해당하는 경우 업데이트

**리뷰어 최소 1명.** main 직접 push 금지 (브랜치 보호 설정됨).

---

## 📐 코드 스타일

### 주석 정책 (⚠️ 이 레포 한정 예외)
일반적으로 "주석 최소"가 좋지만, **이 프로젝트는 팀 온보딩 최적화**를 위해:
- 퍼블릭 인터페이스(export 함수/클래스)에는 **JSDoc 필수**
- 복잡한 로직·비즈니스 규칙은 **WHY 중심 주석**
- 파일 상단 블록 주석에 **파일 목적 + 소비자 + 주의사항** 기록

### TypeScript
- `strict: true` 유지, `any` 사용 시 PR 리뷰에서 반드시 설명
- 타입은 `src/types/`에 모으고 `import type`으로 불러옴
- API 계약 타입(`src/types/game.ts`)은 백엔드 OpenAPI와 **반드시 동기화** — 변경 시 백엔드 채널에 고지

### 네이밍
- 훅: `useXxx`
- Context: `XxxContext`, Provider: `XxxProvider`
- 이벤트 핸들러: `onXxx` (props), `handleXxx` (내부)

---

## 🧭 주요 파일별 담당 영역

| 파일 | 소유자 | 수정 시 주의 |
|---|---|---|
| `src/lib/session-engine.ts` | 찬호 (코어) | Split-brain 방지 원칙 필독. 변경 시 모든 페이지 검증 필수 |
| `src/lib/mock/*.ts` | 프론트 팀 공동 | 백엔드 연동 시 이 레이어만 교체. 인터페이스 유지 |
| `src/hooks/useRouteGuard.ts` | 찬호 (코어) | 리다이렉트 규칙 변경 시 문서 동기화 필수 |
| `src/components/ui/*` | 디자인 주도 | 기존 6개 재사용 원칙. 새 variant 추가 OK |
| `src/app/layout.tsx` | 찬호 (코어) | Provider 순서 변경은 팀 논의 필수 |

---

## 🚧 자주 겪는 함정

1. **"Split-brain"**
   - 게임 상태를 `useState`로 따로 관리하지 말 것
   - 무조건 SessionEngine → GameProvider 경유

2. **직접 진입 리다이렉트 플리커**
   - 페이지 진입 시 `useRouteGuard(...)` 호출 후 `{isResolving}`이 true인 동안 Skeleton 렌더
   - `isResolving === false` 확인 후 실제 UI 렌더

3. **모바일 safe-area**
   - `100vh` 사용 금지 → `100dvh` 사용
   - 하단은 `pb-[env(safe-area-inset-bottom)]`

4. **prefers-reduced-motion**
   - 진동·confetti·깜빡임 붙일 때 반드시 `useMotionPreference` 체크
   - 빼먹으면 a11y 테스트에서 드롭

---

## 📣 질문할 곳

- 팀 슬랙 `#burst-frontend` (예정)
- 코드 리뷰 코멘트
- 찬호에게 DM

---

## 🔗 참고

- [README.md](./README.md) — 빠른 시작
- [ARCHITECTURE.md](./ARCHITECTURE.md) — 구조 심화
- 제품 문서(옵시디언): `10_Wiki/Projects/박터트리기*.md`

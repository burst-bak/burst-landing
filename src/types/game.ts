/**
 * ============================================================================
 * 박터트리기 게임 핵심 타입 정의
 * ============================================================================
 *
 * 이 파일은 프론트·백엔드 간 API 계약의 TypeScript 표현이다.
 * 백엔드 (burst-api) OpenAPI 스펙과 1:1 매핑되며, 변경 시 양쪽 동기화 필수.
 *
 * 📌 팀 온보딩 포인트
 *  - SessionEngine, mock-api, mock-ws, 모든 페이지가 이 타입을 참조한다
 *  - 필드 추가/변경은 반드시 PR 리뷰로 (브레이킹 체인지 추적)
 *  - 백엔드 DTO와 동기화 규칙은 ARCHITECTURE.md 참고
 *
 * 📌 종료 상태 우선순위 (서버 원자 처리)
 *    SOLD_OUT > BURST > TIME_UP
 *    → 자세한 설명은 옵시디언 박터트리기_도메인_게임중.md 참고
 * ============================================================================
 */

/**
 * 게임 전체 라이프사이클 단계
 * - WAITING : 오픈 전 대기실 (/waiting)
 * - LIVE    : 10초 게임 진행 중 (/play)
 * - ENDED   : 10초 경과 후 결과 화면 (/result/*)
 */
export type GamePhase = "WAITING" | "LIVE" | "ENDED";

/**
 * 이벤트 종료 상태 — 결과 분기 기준
 * - BURST     : 10초 안에 서버 임계치 돌파 → 성공, 마지막 성공자에게 본상금
 * - SOLD_OUT  : 10초 안에 재고(내구도) 0 → 실패 UI, 마지막 재고 유저는 이스터에그 (비공개)
 * - TIME_UP   : 10초 만료, 재고·서버 모두 생존 → 실패
 *
 * v2.1 확정: 상금은 BURST 1인 구조 단일화. SOLD_OUT 공식 상금 없음 (비공개 개별 연락)
 */
export type TerminalState = "BURST" | "SOLD_OUT" | "TIME_UP";

/**
 * 이벤트 기본 정보 (mock-api의 fetchEvent 응답)
 * - openAt / closeAt은 서버 기준 timestamp (ms)
 * - 클라이언트는 serverTime 훅으로 보정된 "서버 현재 시각"과 비교하여 phase 판정
 */
export interface BurstEvent {
  eventId: string;
  title: string;
  openAt: number;   // epoch ms, 게임 시작 시각 (서버 시각 기준)
  closeAt: number;  // epoch ms, 게임 종료 시각 (openAt + 10_000)
}

/**
 * 발사 요청 응답
 * - LAST_HIT: 이 요청으로 BURST 또는 SOLD_OUT 확정 (마지막 한 방)
 * - HIT     : 정상 타격
 * - REJECT  : 쿨다운/중복/재고소진 거절 (클라는 UI로만 피드백, 토스트 안 띄움)
 */
export interface SmashResponse {
  status: "HIT" | "LAST_HIT" | "REJECT";
  reason?: "COOLDOWN" | "DUPLICATE" | "SOLD_OUT" | "TIME_UP" | "NOT_LIVE";
  hitCount: number;          // 이 유저 누적 성공 타격 수
  cooldownUntil?: number;    // epoch ms, 다음 발사 가능 시각 (쿨다운)
}

/**
 * 이벤트 최종 결과 (mock-api의 fetchResult 응답)
 * - terminalState 값에 따라 /result/success 또는 /result/fail 라우팅
 * - isWinner: BURST의 마지막 성공자일 때만 true
 */
export interface EventResult {
  eventId: string;
  terminalState: TerminalState;
  endedAt: number;           // epoch ms
  myHitCount: number;
  isWinner: boolean;         // BURST의 마지막 성공 요청자인가
}

/**
 * WebSocket으로 주기적 수신하는 burst 게이지 데이터
 * - ratio: 0~1+ 비율 (온도계 렌더링용). 1.0이 임계선
 * - serverNow: 서버 기준 현재 시각 (ms) — 클라이언트 타이머 보정용
 * - 전송 주기 200~500ms (백엔드 BroadcastService 참고)
 */
export interface BurstGaugeData {
  ratio: number;
  serverNow: number;
}

/**
 * 인증된 유저 (MVP는 카카오 OAuth2)
 * - id: 내부 user_id (PostgreSQL users.id)
 * - kakaoId: 카카오 고유 id (선택적 노출)
 */
export interface AuthUser {
  id: string;
  nickname: string;
  kakaoId?: string;
}

/**
 * SessionEngine이 sessionStorage에 보관하는 단일 진실 소스 상태
 * 이 구조가 곧 "탭 단위 게임 세션"의 전부. 새로고침·페이지 이동 시 여기서 복구.
 *
 * 🚨 주의: 이 값을 직접 건드리지 말고 SessionEngine API를 통해서만 조작할 것.
 */
export interface SessionState {
  eventId: string;
  scenario: MockScenario;
  phase: GamePhase;
  terminalState: TerminalState | null;
  myHitCount: number;
  startedAt: number;         // SessionEngine.init() 호출 시각 (epoch ms)
  openAt: number;            // 이 세션 기준 게임 시작 시각
  closeAt: number;           // 이 세션 기준 게임 종료 시각
  isWinner: boolean;
}

/**
 * Mock 시나리오 — 백엔드 없이 프론트 단독 개발·테스트 용도
 * URL에 ?scenario=<name>으로 진입 시 SessionEngine.init에 고정 저장됨.
 * 이후 URL에서 파라미터가 사라져도 sessionStorage에 남아 일관된 결말 재생.
 *
 * - wait30: 30초 대기 → TIME_UP
 * - wait5 : 5초 대기 → 자동 전환 테스트
 * - burst : 7초에 BURST 발생
 * - soldout: 5초에 SOLD_OUT 발생
 * - timeup: 10초 풀타임 후 TIME_UP (기본값)
 */
export type MockScenario = "wait30" | "wait5" | "burst" | "soldout" | "timeup";

export const DEFAULT_SCENARIO: MockScenario = "timeup";
export const MOCK_SCENARIOS: readonly MockScenario[] = [
  "wait30",
  "wait5",
  "burst",
  "soldout",
  "timeup",
] as const;

/**
 * ============================================================================
 * SessionEngine — 게임 세션의 단일 진실 소스 (Single Source of Truth)
 * ============================================================================
 *
 * 🎯 역할
 *  - 탭 단위로 게임 세션 상태를 sessionStorage에 보관
 *  - /waiting → /play → /result 전 구간에서 일관된 phase/scenario 유지
 *  - 새로고침/페이지 이동해도 시뮬레이션이 처음부터 재시작되지 않도록 보장
 *
 * 🚨 이 파일이 프론트엔드 아키텍처의 핵심이다. 팀이 손대기 전에 꼭 읽을 것.
 *
 * 📌 설계 원칙 (v2.1 확정 사항)
 *  1. Split-brain 방지 : 게임 상태 저장 위치는 오직 여기. GameProvider는 읽기 전용.
 *  2. Scenario 고정   : init() 시점에 URL 쿼리에서 1회만 읽고 sessionStorage에 저장.
 *                        이후 URL에서 파라미터 사라져도 유지. ?reset=1로 초기화.
 *  3. Phase 전이 원자성: transition()은 허용된 전이만 실행 (WAITING→LIVE→ENDED).
 *  4. Terminal 단방향  : 한 번 설정되면 되돌릴 수 없음.
 *
 * 📌 백엔드 전환 시 교체 지점
 *  - fetchEvent/postSmash/fetchResult mock 함수가 SessionEngine을 읽고 있지만,
 *    실제 API 연동 후에는 "결정 권한"이 서버로 넘어가고 SessionEngine은 캐시로 전락.
 *  - 본격 통합 시 mock-api.ts만 교체하면 여기는 거의 그대로 재사용 가능.
 *
 * 📌 SSR 안전성
 *  - sessionStorage 접근은 반드시 isBrowser() 가드 뒤에서. 서버에서 호출되면 no-op.
 * ============================================================================
 */

import {
  DEFAULT_SCENARIO,
  MOCK_SCENARIOS,
  type GamePhase,
  type MockScenario,
  type SessionState,
  type TerminalState,
} from "@/types/game";

const STORAGE_KEY = "burst:session";

/** 게임 총 지속시간 (ms). 서버 측 closeAt 계산 기준. */
export const GAME_DURATION_MS = 10_000;

/** 시나리오별 "오픈까지 대기 시간"(ms) — 실제 서버에서는 DB의 event.openAt */
const SCENARIO_WAIT_MS: Record<MockScenario, number> = {
  wait30: 30_000,
  wait5: 5_000,
  burst: 3_000,
  soldout: 3_000,
  timeup: 3_000,
};

/** 시나리오별 "게임 시작 후 종료까지 시각"(ms) — 0이면 자연 종료(TIME_UP) */
export const SCENARIO_TERMINAL_AT: Record<MockScenario, number> = {
  wait30: 0,
  wait5: 0,
  burst: 7_000,
  soldout: 5_000,
  timeup: 0,
};

export const SCENARIO_TERMINAL_STATE: Record<
  MockScenario,
  TerminalState | null
> = {
  wait30: "TIME_UP",
  wait5: "TIME_UP",
  burst: "BURST",
  soldout: "SOLD_OUT",
  timeup: "TIME_UP",
};

const isBrowser = () => typeof window !== "undefined";

function readStorage(): SessionState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

function writeStorage(state: SessionState): void {
  if (!isBrowser()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearStorage(): void {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * URL 쿼리 파라미터에서 scenario 값 파싱
 * - 유효하지 않으면 DEFAULT_SCENARIO 반환
 * - 서버 렌더 시에는 DEFAULT_SCENARIO
 */
function parseScenarioFromUrl(): MockScenario {
  if (!isBrowser()) return DEFAULT_SCENARIO;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("scenario");
  if (raw && (MOCK_SCENARIOS as readonly string[]).includes(raw)) {
    return raw as MockScenario;
  }
  return DEFAULT_SCENARIO;
}

function shouldReset(): boolean {
  if (!isBrowser()) return false;
  return new URLSearchParams(window.location.search).get("reset") === "1";
}

/**
 * 허용된 phase 전이만 true 반환
 * - WAITING → LIVE
 * - LIVE → ENDED
 * - 역행 금지, 점프 금지
 */
function canTransition(from: GamePhase, to: GamePhase): boolean {
  if (from === "WAITING" && to === "LIVE") return true;
  if (from === "LIVE" && to === "ENDED") return true;
  return false;
}

/**
 * 초기 세션 상태 생성 — 시나리오 기반 openAt/closeAt 계산
 */
function createInitialState(
  eventId: string,
  scenario: MockScenario,
): SessionState {
  const now = Date.now();
  const openAt = now + SCENARIO_WAIT_MS[scenario];
  return {
    eventId,
    scenario,
    phase: "WAITING",
    terminalState: null,
    myHitCount: 0,
    startedAt: now,
    openAt,
    closeAt: openAt + GAME_DURATION_MS,
    isWinner: false,
  };
}

/**
 * SessionEngine 공개 API
 *
 * 사용 예시 (페이지 진입 시):
 *   const session = SessionEngine.ensure(eventId);
 *   if (session.phase === 'ENDED') router.replace(`/result/.../${eventId}`);
 */
export const SessionEngine = {
  /**
   * 세션 초기화 — 주로 최초 대기실 진입 시 1회 호출
   * 이미 같은 eventId의 세션이 있으면 유지, 다른 eventId거나 reset=1이면 새로 생성
   */
  init(eventId: string): SessionState {
    if (shouldReset()) {
      clearStorage();
    }
    const existing = readStorage();
    if (existing && existing.eventId === eventId) {
      return existing;
    }
    const scenario = parseScenarioFromUrl();
    const fresh = createInitialState(eventId, scenario);
    writeStorage(fresh);
    return fresh;
  },

  /**
   * 실 백엔드 이벤트 데이터로 세션 초기화·동기화.
   * - 기존 세션이 있고 eventId 가 같으면 openAt/closeAt 만 re-sync (서버가 갱신된 경우 대비)
   * - 없으면 WAITING 상태로 새 세션 생성
   * - scenario 필드는 "wait5" 로 고정 (타입 충족용, 실사용 안 함)
   */
  initFromServerEvent(
    eventId: string,
    serverOpenAtMs: number,
    serverCloseAtMs: number,
  ): SessionState {
    if (shouldReset()) clearStorage();
    const existing = readStorage();
    if (existing && existing.eventId === eventId) {
      const updated: SessionState = {
        ...existing,
        openAt: serverOpenAtMs,
        closeAt: serverCloseAtMs,
      };
      writeStorage(updated);
      return updated;
    }
    const now = Date.now();
    const fresh: SessionState = {
      eventId,
      scenario: "wait5",
      phase: "WAITING",
      terminalState: null,
      myHitCount: 0,
      startedAt: now,
      openAt: serverOpenAtMs,
      closeAt: serverCloseAtMs,
      isWinner: false,
    };
    writeStorage(fresh);
    return fresh;
  },

  /**
   * 세션 보장 — 없으면 init, 있으면 기존 반환
   * 페이지 진입 시 첫 호출로 권장 (init을 매번 부르는 것보다 안전)
   */
  ensure(eventId: string): SessionState {
    const existing = readStorage();
    if (existing && existing.eventId === eventId && !shouldReset()) {
      return existing;
    }
    return SessionEngine.init(eventId);
  },

  /**
   * 현재 세션 상태 조회 — 없으면 null
   * 라우트 가드에서 세션 없음 → 랜딩 리다이렉트 판단에 사용
   */
  getState(): SessionState | null {
    return readStorage();
  },

  /**
   * phase 전이 시도 — 허용된 전이만 적용, 실패 시 false
   * - 서버 시간 경과 감지 훅에서 호출됨
   */
  transition(to: GamePhase): boolean {
    const current = readStorage();
    if (!current) return false;
    if (!canTransition(current.phase, to)) return false;
    writeStorage({ ...current, phase: to });
    return true;
  },

  /**
   * 타격 성공 기록 — hitCount++ 및 옵션으로 마지막 히트 플래그 세팅
   * 서버가 LAST_HIT을 반환한 경우 isWinner를 함께 올림
   */
  recordHit(options: { markWinner?: boolean } = {}): number {
    const current = readStorage();
    if (!current) return 0;
    const nextCount = current.myHitCount + 1;
    writeStorage({
      ...current,
      myHitCount: nextCount,
      isWinner: current.isWinner || options.markWinner === true,
    });
    return nextCount;
  },

  /**
   * Terminal 상태 확정 — SOLD_OUT > BURST > TIME_UP 우선순위
   * 이미 설정된 경우 덮어쓰지 않음 (단방향)
   */
  setTerminal(state: TerminalState): void {
    const current = readStorage();
    if (!current || current.terminalState) return;
    writeStorage({
      ...current,
      terminalState: state,
      phase: "ENDED",
    });
  },

  /**
   * 시간 컨텍스트 — 페이지 가드·타이머 계산에 사용
   * serverNow는 실제 서버 시각 훅(useServerTime)에서 주입받는 것이 정석.
   * 여기서는 클라이언트 시각을 근사치로 반환 (mock 전용).
   */
  getTimeContext(): {
    openAt: number;
    closeAt: number;
    now: number;
    elapsedMs: number;
    remainingMs: number;
  } | null {
    const current = readStorage();
    if (!current) return null;
    const now = Date.now();
    return {
      openAt: current.openAt,
      closeAt: current.closeAt,
      now,
      elapsedMs: Math.max(0, now - current.openAt),
      remainingMs: Math.max(0, current.closeAt - now),
    };
  },

  /**
   * 세션 완전 초기화 — 테스트/디버그 용
   * 실사용에서는 ?reset=1 쿼리 파라미터 권장
   */
  reset(): void {
    clearStorage();
  },
};

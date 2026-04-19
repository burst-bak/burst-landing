/**
 * ============================================================================
 * Mock API — SessionEngine 기반 일관된 Mock 응답
 * ============================================================================
 *
 * 🎯 역할
 *  - 백엔드 없이 프론트 페이지·훅이 동작하도록 API를 시뮬레이션
 *  - 모든 응답은 SessionEngine을 경유 → 페이지 이동·새로고침에도 일관성 유지
 *
 * 📌 백엔드 연동 시
 *  - 이 파일 함수들의 signature를 유지한 채 내부만 fetch/axios 호출로 교체
 *  - 페이지 코드는 수정 불필요 (OpenAPI 계약 기반 재구현 예정)
 *
 * 📌 지연 시간 시뮬레이션 (피드백 8번: 느린 네트워크 테스트)
 *  - URL에 ?mockDelay=<ms> 붙이면 모든 응답이 해당 ms만큼 지연
 *  - 스켈레톤 / 버튼 잠금 / 중복 요청 방지 UX 검증용
 * ============================================================================
 */

import {
  GAME_DURATION_MS,
  SCENARIO_TERMINAL_AT,
  SCENARIO_TERMINAL_STATE,
  SessionEngine,
} from "@/lib/session-engine";
import type {
  BurstEvent,
  EventResult,
  SmashResponse,
} from "@/types/game";
import { DEFAULT_MOCK_DELAY_MS, SMASH_COOLDOWN_MS } from "./mock-data";

function resolveDelay(): number {
  if (typeof window === "undefined") return 0;
  const raw = new URLSearchParams(window.location.search).get("mockDelay");
  if (!raw) return DEFAULT_MOCK_DELAY_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_MOCK_DELAY_MS;
}

function delay<T>(value: T): Promise<T> {
  const ms = resolveDelay();
  if (ms === 0) return Promise.resolve(value);
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** 쿨다운 체크용 인메모리 저장소 (탭 종료 시 리셋 — 실서버에서는 Redis에서 관리) */
const lastSmashAt = new Map<string, number>();

/**
 * 이벤트 메타 조회 — /waiting 진입 시 호출
 * SessionEngine에서 openAt/closeAt을 가져와 일관된 시각 제공
 */
export async function fetchEvent(eventId: string): Promise<BurstEvent> {
  const session = SessionEngine.ensure(eventId);
  const event: BurstEvent = {
    eventId: session.eventId,
    title: "박 터트리기 Vol.1",
    openAt: session.openAt,
    closeAt: session.closeAt,
  };
  return delay(event);
}

/**
 * 발사 요청 — /play 진행 중 호출
 *
 * 시나리오별 종료 판정:
 *  - burst 시나리오 + 7초 경과 → LAST_HIT + BURST
 *  - soldout 시나리오 + 5초 경과 → LAST_HIT + SOLD_OUT
 *  - 그 외 → HIT
 *
 * 쿨다운 위반 시 REJECT(COOLDOWN). 클라는 토스트 안 띄우고 애니메이션만으로 피드백.
 */
export async function postSmash(
  eventId: string,
  requestId: string,
): Promise<SmashResponse> {
  const session = SessionEngine.getState();
  if (!session || session.eventId !== eventId) {
    return delay<SmashResponse>({
      status: "REJECT",
      reason: "NOT_LIVE",
      hitCount: 0,
    });
  }

  const now = Date.now();

  if (now < session.openAt) {
    return delay<SmashResponse>({
      status: "REJECT",
      reason: "NOT_LIVE",
      hitCount: session.myHitCount,
    });
  }

  if (session.phase === "ENDED" || session.terminalState) {
    return delay<SmashResponse>({
      status: "REJECT",
      reason: session.terminalState === "SOLD_OUT" ? "SOLD_OUT" : "TIME_UP",
      hitCount: session.myHitCount,
    });
  }

  // 쿨다운 (500ms)
  const last = lastSmashAt.get(requestId) ?? 0;
  const lastAny = Math.max(...Array.from(lastSmashAt.values()), 0);
  if (now - lastAny < SMASH_COOLDOWN_MS) {
    return delay<SmashResponse>({
      status: "REJECT",
      reason: "COOLDOWN",
      hitCount: session.myHitCount,
      cooldownUntil: lastAny + SMASH_COOLDOWN_MS,
    });
  }
  lastSmashAt.set(requestId, now);

  // 종료 조건 감지 (시나리오 기반)
  const elapsed = now - session.openAt;
  const scenarioTerminalAt = SCENARIO_TERMINAL_AT[session.scenario];
  const scenarioTerminal = SCENARIO_TERMINAL_STATE[session.scenario];

  const isTimeUp = elapsed >= GAME_DURATION_MS;
  const isScenarioTerminal =
    scenarioTerminalAt > 0 && elapsed >= scenarioTerminalAt;

  if (isTimeUp || isScenarioTerminal) {
    const terminal =
      isScenarioTerminal && scenarioTerminal
        ? scenarioTerminal
        : scenarioTerminal ?? "TIME_UP";
    const hitCount = SessionEngine.recordHit({ markWinner: terminal === "BURST" });
    SessionEngine.setTerminal(terminal);
    return delay<SmashResponse>({
      status: "LAST_HIT",
      hitCount,
      cooldownUntil: now + SMASH_COOLDOWN_MS,
    });
  }

  const hitCount = SessionEngine.recordHit();
  return delay<SmashResponse>({
    status: "HIT",
    hitCount,
    cooldownUntil: now + SMASH_COOLDOWN_MS,
  });
}

/**
 * 결과 조회 — /result 진입 시 호출
 * terminalState가 아직 없으면 시간 기반으로 추정(TIME_UP 강제 확정)
 */
export async function fetchResult(eventId: string): Promise<EventResult> {
  const session = SessionEngine.ensure(eventId);
  const now = Date.now();

  if (!session.terminalState && now >= session.closeAt) {
    SessionEngine.setTerminal("TIME_UP");
  }

  const refreshed = SessionEngine.getState()!;
  return delay<EventResult>({
    eventId: refreshed.eventId,
    terminalState: refreshed.terminalState ?? "TIME_UP",
    endedAt: refreshed.closeAt,
    myHitCount: refreshed.myHitCount,
    isWinner: refreshed.isWinner,
  });
}

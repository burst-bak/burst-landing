/**
 * ============================================================================
 * Mock WebSocket — SessionEngine 기반 실시간 브로드캐스트 시뮬레이션
 * ============================================================================
 *
 * 🎯 역할
 *  - 실제 WebSocket(STOMP) 연결 없이 serverTime·burstGauge 이벤트를 발행
 *  - 200ms 주기 (서버 스펙과 동일)
 *
 * 📌 백엔드 연동 시
 *  - 이 파일을 실제 STOMP.js + SockJS 구독 로직으로 교체
 *  - 훅(useServerTime, useBurstGauge)은 subscribe() 시그니처만 유지하면 수정 최소
 *
 * 📌 브로드캐스트 데이터
 *  - serverTime : 서버 현재 시각 (RTT 보정용 — mock은 클라이언트 시각)
 *  - burstGauge : 온도계 ratio + serverNow (0~1+ 범위)
 * ============================================================================
 */

import { GAME_DURATION_MS, SessionEngine } from "@/lib/session-engine";
import type { BurstGaugeData } from "@/types/game";

type Listener<T> = (data: T) => void;

const TICK_INTERVAL_MS = 200;

let intervalId: ReturnType<typeof setInterval> | null = null;
const serverTimeListeners = new Set<Listener<number>>();
const burstGaugeListeners = new Set<Listener<BurstGaugeData>>();

/**
 * 시뮬레이션 루프 — 구독자 있을 때만 동작
 * - ratio 계산: 시나리오별로 다르게 증가 (burst 시나리오는 빠르게, timeup은 느리게)
 */
function tick() {
  const session = SessionEngine.getState();
  const now = Date.now();

  serverTimeListeners.forEach((listener) => listener(now));

  if (!session) return;

  // 게임 중일 때만 burstGauge emit
  if (now >= session.openAt && now < session.closeAt) {
    const elapsed = now - session.openAt;
    const progress = elapsed / GAME_DURATION_MS; // 0~1

    // 시나리오별 ratio 곡선 (단순 버전 — 팀이 튜닝할 것)
    let ratio: number;
    switch (session.scenario) {
      case "burst":
        // 빠르게 임계 돌파
        ratio = Math.min(1.1, progress * 1.4);
        break;
      case "soldout":
        // 임계 직전에서 플랫 (재고만 소진)
        ratio = Math.min(0.7, progress * 1.0);
        break;
      default:
        ratio = progress * 0.6; // 임계 못 넘음 → TIME_UP
    }

    const data: BurstGaugeData = { ratio, serverNow: now };
    burstGaugeListeners.forEach((listener) => listener(data));
  }
}

function ensureLoop() {
  if (intervalId !== null) return;
  intervalId = setInterval(tick, TICK_INTERVAL_MS);
}

function maybeStopLoop() {
  if (
    intervalId !== null &&
    serverTimeListeners.size === 0 &&
    burstGaugeListeners.size === 0
  ) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * 서버 시각 구독 — 반환된 unsubscribe 함수를 반드시 호출할 것
 */
export function subscribeServerTime(listener: Listener<number>): () => void {
  serverTimeListeners.add(listener);
  ensureLoop();
  return () => {
    serverTimeListeners.delete(listener);
    maybeStopLoop();
  };
}

/**
 * Burst 게이지 구독 — 반환된 unsubscribe 함수를 반드시 호출할 것
 */
export function subscribeBurstGauge(
  listener: Listener<BurstGaugeData>,
): () => void {
  burstGaugeListeners.add(listener);
  ensureLoop();
  return () => {
    burstGaugeListeners.delete(listener);
    maybeStopLoop();
  };
}

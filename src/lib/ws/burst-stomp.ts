/**
 * ============================================================================
 * burst-stomp — burst-api STOMP over SockJS 클라이언트 래퍼
 * ============================================================================
 *
 * 🎯 구독 대상 토픽
 *   /topic/events/{eventCode}/burst     — 250ms 주기 게이지 (EventBroadcaster)
 *   /topic/events/{eventCode}/terminal  — LAST_HIT 즉시 (TerminalBroadcaster)
 *
 * 📡 백엔드 페이로드
 *   BurstGaugeMessage : { eventCode, state, remaining, timeLeftMs, serverTsMs }
 *   TerminalPayload   : { eventCode, terminalState, winnerUserId, successSeq, winnerTsMs }
 *
 * 🧩 재연결 정책
 *   reconnectDelay 2초. 로컬 Wi-Fi 변경·백엔드 재기동에도 자동 복구.
 * ============================================================================
 */

import { Client, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8081";

export interface BurstGaugePayload {
  eventCode: string;
  state: string;
  remaining: number;
  timeLeftMs: number;
  serverTsMs: number;
}

export interface TerminalPayload {
  eventCode: string;
  terminalState: string;
  winnerUserId: string | null;
  successSeq: number;
  winnerTsMs: number;
}

type GaugeHandler = (payload: BurstGaugePayload) => void;
type TerminalHandler = (payload: TerminalPayload) => void;

export interface BurstStompHandle {
  disconnect: () => void;
}

/**
 * 이벤트 구독 시작. 콜백을 통해 실시간 푸시 수신.
 * 같은 이벤트를 여러 훅에서 구독해도 각각 독립 클라이언트 생성(단순화). MVP 수준에선 OK.
 */
export function connectBurstStomp(
  eventCode: string,
  onGauge?: GaugeHandler,
  onTerminal?: TerminalHandler,
): BurstStompHandle {
  const client = new Client({
    // Spring WebSocketConfig 가 withSockJS() 로 등록 — SockJS handshake 필요
    webSocketFactory: () => new SockJS(`${BASE}/ws`),
    reconnectDelay: 2000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
  });

  let gaugeSub: StompSubscription | null = null;
  let terminalSub: StompSubscription | null = null;

  client.onConnect = () => {
    if (onGauge) {
      gaugeSub = client.subscribe(
        `/topic/events/${eventCode}/burst`,
        (frame) => {
          try {
            onGauge(JSON.parse(frame.body) as BurstGaugePayload);
          } catch (e) {
            console.warn("[stomp] parse gauge failed", e);
          }
        },
      );
    }
    if (onTerminal) {
      terminalSub = client.subscribe(
        `/topic/events/${eventCode}/terminal`,
        (frame) => {
          try {
            onTerminal(JSON.parse(frame.body) as TerminalPayload);
          } catch (e) {
            console.warn("[stomp] parse terminal failed", e);
          }
        },
      );
    }
  };

  client.onStompError = (frame) => {
    console.warn("[stomp] broker error", frame.headers["message"], frame.body);
  };
  client.onWebSocketError = (e) => {
    console.warn("[stomp] ws error", e);
  };

  client.activate();

  return {
    disconnect: () => {
      gaugeSub?.unsubscribe();
      terminalSub?.unsubscribe();
      client.deactivate();
    },
  };
}

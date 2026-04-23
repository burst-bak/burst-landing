"use client";

import {
  connectBurstStomp,
  type BurstGaugePayload,
  type TerminalPayload,
} from "@/lib/ws/burst-stomp";
import { useEffect, useState } from "react";

/**
 * 실 백엔드 STOMP 기반 게이지·종료 이벤트 훅.
 *
 * 📡 수신 주기: 250ms (EventBroadcaster fixedRate).
 * 🧩 terminal 은 즉발 (LAST_HIT 시 TerminalBroadcaster 가 즉시 push).
 *
 * 사용:
 *   const { gauge, terminal } = useRealBurstGauge("vol-1");
 */
export function useRealBurstGauge(eventCode: string | null | undefined): {
  gauge: BurstGaugePayload | null;
  terminal: TerminalPayload | null;
} {
  const [gauge, setGauge] = useState<BurstGaugePayload | null>(null);
  const [terminal, setTerminal] = useState<TerminalPayload | null>(null);

  useEffect(() => {
    if (!eventCode) return;
    const handle = connectBurstStomp(
      eventCode,
      (g) => setGauge(g),
      (t) => setTerminal(t),
    );
    return () => handle.disconnect();
  }, [eventCode]);

  return { gauge, terminal };
}

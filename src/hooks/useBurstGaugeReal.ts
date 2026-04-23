"use client";

import {
  connectBurstStomp,
  type BurstGaugePayload,
  type TerminalPayload,
} from "@/lib/ws/burst-stomp";
import type { BurstGaugeData } from "@/types/game";
import { useEffect, useRef, useState } from "react";

/**
 * ============================================================================
 * useBurstGaugeReal — mock-ws 와 동일 signature 의 실 STOMP 게이지 훅
 * ============================================================================
 *
 * 🎯 반환 shape
 *   gauge : { ratio, serverNow } — BurstBars 컴포넌트 입력 호환
 *   terminal : STOMP terminal push 수신 시 제공 (page 에서 ENDED 전이 트리거)
 *
 * 🧮 ratio 계산
 *   서버가 remaining 만 보내므로 최초 수신값을 initial_stock 으로 추정.
 *   ratio = (initial - remaining) / initial  → 0.0 ~ 1.0
 *
 * 🚨 주의
 *   - initial 값이 첫 수신으로 고정되므로 서버가 재시작되면 ratio 왜곡 가능.
 *     운영에선 서버 응답에 initialStock 포함하는 방향 권장 (Vol.2).
 * ============================================================================
 */
export function useBurstGaugeReal(eventCode: string | null | undefined): {
  gauge: BurstGaugeData | null;
  terminal: TerminalPayload | null;
  rawGauge: BurstGaugePayload | null;
} {
  const [gauge, setGauge] = useState<BurstGaugeData | null>(null);
  const [rawGauge, setRawGauge] = useState<BurstGaugePayload | null>(null);
  const [terminal, setTerminal] = useState<TerminalPayload | null>(null);
  const initialStockRef = useRef<number | null>(null);

  useEffect(() => {
    if (!eventCode) return;
    initialStockRef.current = null;
    setGauge(null);
    setRawGauge(null);
    setTerminal(null);

    const handle = connectBurstStomp(
      eventCode,
      (g) => {
        setRawGauge(g);
        // 최초 수신 remaining 을 initial stock 으로 기록 (서버가 개별로 안 보내므로)
        if (
          initialStockRef.current == null ||
          g.remaining > initialStockRef.current
        ) {
          initialStockRef.current = g.remaining;
        }
        const initial = initialStockRef.current ?? 1;
        const consumed = Math.max(0, initial - g.remaining);
        const ratio = initial > 0 ? consumed / initial : 0;
        setGauge({ ratio, serverNow: g.serverTsMs });
      },
      (t) => setTerminal(t),
    );
    return () => handle.disconnect();
  }, [eventCode]);

  return { gauge, terminal, rawGauge };
}

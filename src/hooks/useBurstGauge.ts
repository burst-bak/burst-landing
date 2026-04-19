"use client";

import { subscribeBurstGauge } from "@/lib/mock/mock-ws";
import type { BurstGaugeData } from "@/types/game";
import { useEffect, useState } from "react";

/**
 * Burst 게이지 구독 훅
 *
 * 📌 역할
 *  - mock-ws에서 200ms마다 수신하는 { ratio, serverNow } 반환
 *  - 게임 페이지(Thermometer 컴포넌트)에서 소비
 *
 * 📌 실서버 교체 시
 *  - STOMP subscribe('/topic/events/{eventId}/burst')로 전환
 *  - 메시지 포맷은 BurstGaugeData 타입 그대로 유지
 */
export function useBurstGauge(): BurstGaugeData | null {
  const [data, setData] = useState<BurstGaugeData | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeBurstGauge((incoming) => {
      setData(incoming);
    });
    return unsubscribe;
  }, []);

  return data;
}

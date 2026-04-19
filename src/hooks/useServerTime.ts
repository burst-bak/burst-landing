"use client";

import { subscribeServerTime } from "@/lib/mock/mock-ws";
import { useEffect, useState } from "react";

/**
 * 서버 시각 훅
 *
 * 📌 역할
 *  - mock-ws에서 200ms마다 수신하는 serverNow 반환
 *  - 실제 서버 연동 후에는 STOMP subscribe('/topic/server-time')로 교체
 *
 * 📌 RTT 보정
 *  - 실제 구현에서는 (수신시각 - 서버 발송시각 + 편차) 보정 필요
 *  - MVP mock은 클라이언트 시각을 그대로 사용 (동일 머신이므로 차이 無)
 *
 * @returns { serverNow: epoch ms, isReady: boolean }
 */
export function useServerTime(): { serverNow: number; isReady: boolean } {
  const [serverNow, setServerNow] = useState<number>(() => Date.now());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeServerTime((now) => {
      setServerNow(now);
      setIsReady(true);
    });
    return unsubscribe;
  }, []);

  return { serverNow, isReady };
}

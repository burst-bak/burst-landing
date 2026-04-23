"use client";

import { postSmash } from "@/lib/api/burst-api";
import { SMASH_COOLDOWN_MS } from "@/lib/mock/mock-data";
import type { SmashResponse } from "@/types/game";
import { useCallback, useRef, useState } from "react";

/**
 * 발사 훅 — 쿨다운·멱등성·요청 중복 방지
 *
 * 📌 역할
 *  - 드래그 놓았을 때 호출되는 단일 진입점
 *  - 로컬 쿨다운으로 매크로·연타 1차 방어 (서버 쿨다운이 최종 방어)
 *  - requestId 자동 생성으로 멱등 처리 (동일 id 재전송 시 서버가 중복 판정)
 *
 * 📌 반환값 사용
 *  - smash() 결과가 LAST_HIT이면 해당 페이지에서 결과 라우팅 트리거
 *  - REJECT(COOLDOWN)는 무시 (UI로 이미 쿨다운 시각화됨)
 *
 * 📌 접근성 — 진동 피드백
 *  - useMotionPreference에서 reduced-motion이면 navigator.vibrate 호출 안 함
 *  - 이 훅은 발사 로직만 담당, 진동은 호출부(Sandbag 컴포넌트)에서 처리
 */
export function useSmash(eventId: string): {
  smash: () => Promise<SmashResponse | null>;
  lastResponse: SmashResponse | null;
  isCoolingDown: boolean;
} {
  const [lastResponse, setLastResponse] = useState<SmashResponse | null>(null);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const inFlight = useRef(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  const smash = useCallback(async (): Promise<SmashResponse | null> => {
    if (inFlight.current || isCoolingDown) return null;
    inFlight.current = true;

    try {
      requestSeq.current += 1;
      const requestId = `${eventId}:${Date.now()}:${requestSeq.current}`;
      const response = await postSmash(eventId, requestId);
      setLastResponse(response);

      if (response.status !== "REJECT") {
        setIsCoolingDown(true);
        if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
        cooldownTimer.current = setTimeout(() => {
          setIsCoolingDown(false);
        }, SMASH_COOLDOWN_MS);
      }

      return response;
    } finally {
      inFlight.current = false;
    }
  }, [eventId, isCoolingDown]);

  return { smash, lastResponse, isCoolingDown };
}

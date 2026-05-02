"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 서버 시각 훅 — 사용자 로컬 시계 무관하게 서버 기준으로 카운트다운 동작.
 *
 * 📡 동기화 방법
 *  1. 페이지 마운트 시 fetchEventFull() 응답의 `serverTime` 으로 첫 anchor 설정.
 *  2. STOMP 게이지가 push 될 때마다 anchor 갱신 (250ms 주기).
 *  3. anchor + (Date.now() - localTs) 보간 → 부드러운 100ms tick 으로 UI 갱신.
 *
 * @param latestServerTime  최근 알고 있는 서버 시각 (epoch ms). null/undefined 면 anchor 갱신 X.
 *                          - 호출처에서 fetchEventFull().serverTime 또는 STOMP gauge.serverNow 를 전달.
 */
export function useServerTime(
  latestServerTime?: number | null,
): { serverNow: number; isReady: boolean } {
  const anchorRef = useRef<{ serverTs: number; localTs: number } | null>(null);
  const [, force] = useState(0);

  // anchor 갱신 — 더 최신 서버 시각이 들어오면 교체.
  if (
    latestServerTime != null &&
    Number.isFinite(latestServerTime) &&
    latestServerTime > 0 &&
    (anchorRef.current == null || latestServerTime > anchorRef.current.serverTs)
  ) {
    anchorRef.current = { serverTs: latestServerTime, localTs: Date.now() };
  }

  // 100ms tick → countdown UI 부드럽게.
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 100);
    return () => clearInterval(id);
  }, []);

  const isReady = anchorRef.current !== null;
  const serverNow = isReady
    ? anchorRef.current!.serverTs + (Date.now() - anchorRef.current!.localTs)
    : Date.now();

  return { serverNow, isReady };
}

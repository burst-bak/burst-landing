"use client";

/**
 * ============================================================================
 * GameTimer — 10초 카운트다운 타이머
 * ============================================================================
 *
 * 🎯 역할
 *  - closeAt - serverNow 기반 남은 시간 표시 (초.밀리초)
 *  - requestAnimationFrame 기반 → React 리렌더 최소화
 *  - 서버 시각(useServerTime)을 직접 받아 내부에서 rAF 보간
 *
 * 📌 포맷
 *   9.234 형태 (정수.3자리 밀리초)
 *
 * 📌 임계 구간 색상 (≤3s 남았을 때 빨간색으로 전환)
 * ============================================================================
 */

import { useEffect, useRef, useState } from "react";

interface GameTimerProps {
  serverNow: number;   // 서버 시각 (ms) — useServerTime에서 주입
  closeAt: number;     // 게임 종료 시각 (ms)
  onExpire?: () => void;
}

const CRITICAL_THRESHOLD_MS = 3000;

export function GameTimer({ serverNow, closeAt, onExpire }: GameTimerProps) {
  const [, forceTick] = useState(0);
  const rafRef = useRef<number | null>(null);
  const baseClientRef = useRef<number>(performance.now());
  const baseServerRef = useRef<number>(serverNow);
  const expiredRef = useRef(false);

  // 외부 serverNow 갱신 시 기준 재설정 (200ms마다 스냅백)
  useEffect(() => {
    baseClientRef.current = performance.now();
    baseServerRef.current = serverNow;
  }, [serverNow]);

  useEffect(() => {
    const loop = () => {
      forceTick((t) => t + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const now = baseServerRef.current + (performance.now() - baseClientRef.current);
  const remaining = Math.max(0, closeAt - now);

  if (remaining === 0 && !expiredRef.current) {
    expiredRef.current = true;
    onExpire?.();
  }

  const isCritical = remaining <= CRITICAL_THRESHOLD_MS;
  const seconds = Math.floor(remaining / 1000);
  const millis = Math.floor(remaining % 1000).toString().padStart(3, "0");

  return (
    <div
      style={{
        fontVariantNumeric: "tabular-nums",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontWeight: 700,
        fontSize: 28,
        color: isCritical ? "#D4443A" : "#1C1917",
        letterSpacing: "-0.02em",
        transition: "color 0.2s",
      }}
      aria-label={`남은 시간 ${seconds}.${millis}초`}
    >
      <span>{seconds}</span>
      <span style={{ opacity: 0.6 }}>.{millis}</span>
    </div>
  );
}

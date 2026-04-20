"use client";

/**
 * ============================================================================
 * CountdownOverlay — 3 → 2 → 1 → GO! 전환 오버레이
 * ============================================================================
 *
 * 🎯 역할
 *  - 대기실에서 openAt 도달 직전 3초 카운트다운
 *  - "GO!" 표시 후 onComplete 콜백 → /play 라우팅
 *
 * 📌 사용 시나리오
 *   - useRouteGuard로 LIVE 감지 직전
 *   - openAt - 3000ms 시점부터 렌더
 *
 * 📌 접근성
 *  - prefers-reduced-motion: 확대 효과 축소, aria-live 유지
 * ============================================================================
 */

import { useMotionPreference } from "@/hooks";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface CountdownOverlayProps {
  /** 카운트다운 시작 시각 (epoch ms). 일반적으로 openAt - 3000 */
  startAt: number;
  onComplete?: () => void;
}

type Tick = 3 | 2 | 1 | "GO!";
const SEQUENCE: Tick[] = [3, 2, 1, "GO!"];

export function CountdownOverlay({ startAt, onComplete }: CountdownOverlayProps) {
  const { prefersReducedMotion } = useMotionPreference();
  const [current, setCurrent] = useState<Tick | null>(null);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    SEQUENCE.forEach((tick, i) => {
      const fireAt = startAt + i * 1000;
      const delay = Math.max(0, fireAt - Date.now());
      timers.push(setTimeout(() => setCurrent(tick), delay));
    });

    // 전체 종료 후 onComplete
    const completeDelay = Math.max(0, startAt + SEQUENCE.length * 1000 - Date.now());
    timers.push(setTimeout(() => onComplete?.(), completeDelay));

    return () => timers.forEach(clearTimeout);
  }, [startAt, onComplete]);

  if (current === null) return null;

  const scale = prefersReducedMotion ? [1, 1.05, 1] : [0.4, 1.2, 1];

  return (
    <motion.div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        zIndex: 100,
        backdropFilter: "blur(4px)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      aria-live="assertive"
      aria-atomic="true"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={String(current)}
          initial={{ scale: scale[0], opacity: 0 }}
          animate={{ scale: scale[1], opacity: 1 }}
          exit={{ scale: prefersReducedMotion ? 0.95 : 1.4, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{
            fontSize: current === "GO!" ? 120 : 180,
            fontWeight: 800,
            color: current === "GO!" ? "#5BBFB5" : "#FFFFFF",
            letterSpacing: "-0.04em",
            textShadow: "0 10px 40px rgba(0,0,0,0.4)",
          }}
        >
          {current}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

"use client";

/**
 * ============================================================================
 * Confetti — 순수 CSS/SVG 폭죽 (canvas-confetti 의존성 없이)
 * ============================================================================
 *
 * 🎯 역할
 *  - /result/success 진입 시 축하 연출
 *  - 한 번만 터지고 사라짐 (반복 애니메이션 아님 — 과한 시각 자극 방지)
 *
 * 📌 접근성
 *  - prefers-reduced-motion이면 렌더 자체 생략
 * ============================================================================
 */

import { useMotionPreference } from "@/hooks";
import { motion } from "framer-motion";
import { useMemo } from "react";

interface ConfettiProps {
  count?: number;
  colors?: string[];
}

const DEFAULT_COLORS = ["#5BBFB5", "#FEE500", "#F59E0B", "#EF4444", "#8B5CF6"];

export function Confetti({
  count = 60,
  colors = DEFAULT_COLORS,
}: ConfettiProps) {
  const { prefersReducedMotion } = useMotionPreference();

  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      color: colors[i % colors.length],
      startX: Math.random() * 100,
      endX: Math.random() * 100,
      size: 4 + Math.random() * 6,
      rotate: Math.random() * 360,
      duration: 1.6 + Math.random() * 1.2,
      delay: Math.random() * 0.3,
    }));
  }, [count, colors]);

  if (prefersReducedMotion) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 40,
      }}
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{
            top: "-10%",
            left: `${p.startX}%`,
            rotate: p.rotate,
            opacity: 1,
          }}
          animate={{
            top: "110%",
            left: `${p.endX}%`,
            rotate: p.rotate + 540,
            opacity: 0,
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

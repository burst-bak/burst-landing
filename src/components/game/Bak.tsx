"use client";

/**
 * ============================================================================
 * Bak — 박 (표적) 컴포넌트
 * ============================================================================
 *
 * 🎯 역할
 *  - 게임 중앙에 놓이는 박 렌더링
 *  - 타격 시 흔들림, BURST 시 터짐, SOLD_OUT 이후 "이미 터진 상태"에서도 흔들림
 *
 * 📌 상태(v2.1)
 *  - idle     : 평상시 (미세한 호흡 효과)
 *  - shaking  : 유저 타격 순간 반응
 *  - bursted  : 확정 종료 후 (SOLD_OUT 이후 던져도 이미 터진 박이 흔들림)
 *
 * 📌 접근성
 *  - prefers-reduced-motion이면 흔들림 진폭 축소
 * ============================================================================
 */

import { useMotionPreference } from "@/hooks";
import { motion } from "framer-motion";
import Image from "next/image";

export type BakState = "idle" | "shaking" | "bursted";

interface BakProps {
  state?: BakState;
  size?: number; // px
}

export function Bak({ state = "idle", size = 220 }: BakProps) {
  const { prefersReducedMotion } = useMotionPreference();
  const amplitude = prefersReducedMotion ? 0.4 : 1;

  const variants = {
    idle: {
      rotate: [0, -1, 0, 1, 0],
      transition: { duration: 3.6, repeat: Infinity, ease: "easeInOut" as const },
    },
    shaking: {
      rotate: [0, -8 * amplitude, 8 * amplitude, -4 * amplitude, 0],
      x: [0, -4 * amplitude, 4 * amplitude, -2 * amplitude, 0],
      transition: { duration: 0.35, ease: "easeOut" as const },
    },
    bursted: {
      rotate: [0, -6 * amplitude, 6 * amplitude, -3 * amplitude, 0],
      transition: { duration: 0.55, ease: "easeOut" as const, repeat: Infinity, repeatDelay: 1.2 },
    },
  };

  return (
    <motion.div
      animate={state}
      variants={variants}
      style={{ width: size, height: size, position: "relative" }}
      aria-label="박"
    >
      <Image
        src="/bak.png"
        alt="박"
        fill
        priority
        style={{ objectFit: "contain" }}
        sizes={`${size}px`}
      />
    </motion.div>
  );
}

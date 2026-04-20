"use client";

/**
 * ============================================================================
 * Sandbag — 모래주머니 (발사 입력 UI)
 * ============================================================================
 *
 * 🎯 역할 (v2.1 확정: 드래그 전용, 탭 확장성 유지)
 *  - 유저가 아래로 당겼다 놓으면 onFire 호출
 *  - 놓는 순간 진동 피드백 (reduced-motion이면 생략)
 *  - 쿨다운 중이면 회색 + 재장전 링 애니메이션
 *
 * 📌 확장 — P2에서 탭 fallback 추가 시
 *  - <InputStrategy> prop으로 "drag" | "tap" | "drag+tap" 주입만 바꾸면 됨
 *  - 현재 DragStrategy 내부에서 짧은 제스처(<150ms & <20px)는 '탭'으로 분류만 해놓고
 *    onFire 호출 안 함 (향후 이 분기로 onFire 허용만 하면 됨)
 *
 * 📌 접근성
 *  - prefers-reduced-motion: 진동 OFF, 쿨다운 링 회전 속도 감쇠
 * ============================================================================
 */

import { useMotionPreference } from "@/hooks";
import { motion, useMotionValue, useTransform } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export type SandbagInputMode = "drag" | "tap" | "drag+tap";

interface SandbagProps {
  onFire: () => void;
  disabled?: boolean;
  cooldownMs?: number;
  isCoolingDown?: boolean;
  size?: number;
  /** v2.1: 기본 drag. P2에서 "drag+tap"으로 교체 예정 */
  inputMode?: SandbagInputMode;
}

/**
 * 드래그 판정 임계값 — 이하면 "짧은 탭"으로 분류
 * (InputStrategy v2 확장에서 사용할 기준)
 */
const TAP_DISTANCE_PX = 20;
const TAP_DURATION_MS = 150;

/**
 * 드래그 최소 거리 — 이만큼은 당겨야 발사 인정
 */
const MIN_FIRE_DISTANCE_PX = 32;

export function Sandbag({
  onFire,
  disabled = false,
  cooldownMs = 500,
  isCoolingDown = false,
  size = 120,
  inputMode = "drag",
}: SandbagProps) {
  const { prefersReducedMotion } = useMotionPreference();
  const y = useMotionValue(0);
  const rotate = useTransform(y, [0, 100], [0, -6]);

  const dragStartRef = useRef<{ time: number; y: number } | null>(null);
  const [cooldownProgress, setCooldownProgress] = useState(0);

  // 쿨다운 진행도 (0~1)
  useEffect(() => {
    if (!isCoolingDown) {
      setCooldownProgress(0);
      return;
    }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / cooldownMs);
      setCooldownProgress(progress);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isCoolingDown, cooldownMs]);

  const handleDragStart = useCallback(() => {
    dragStartRef.current = { time: Date.now(), y: y.get() };
  }, [y]);

  const handleDragEnd = useCallback(() => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (disabled || isCoolingDown || !start) return;

    const endY = y.get();
    const distance = Math.abs(endY - start.y);
    const duration = Date.now() - start.time;

    const isShortTap = distance < TAP_DISTANCE_PX && duration < TAP_DURATION_MS;
    const isValidDrag = distance >= MIN_FIRE_DISTANCE_PX;

    const fireByDrag = inputMode === "drag" || inputMode === "drag+tap";
    const fireByTap = inputMode === "tap" || inputMode === "drag+tap";

    if (isValidDrag && fireByDrag) {
      if (!prefersReducedMotion && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
      onFire();
    } else if (isShortTap && fireByTap) {
      if (!prefersReducedMotion && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(30);
      }
      onFire();
    }
  }, [disabled, isCoolingDown, inputMode, onFire, prefersReducedMotion, y]);

  const isDimmed = disabled || isCoolingDown;

  return (
    <div style={{ width: size, height: size, position: "relative", touchAction: "none" }}>
      {/* 쿨다운 재장전 링 (SVG circle stroke) */}
      {isCoolingDown && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="rgba(91,191,181,0.85)"
            strokeWidth="3"
            strokeDasharray={`${Math.PI * 2 * 48}`}
            strokeDashoffset={`${Math.PI * 2 * 48 * (1 - cooldownProgress)}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </svg>
      )}

      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 140 }}
        dragElastic={0.15}
        dragSnapToOrigin
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{
          y,
          rotate,
          width: size,
          height: size,
          position: "relative",
          cursor: isDimmed ? "not-allowed" : "grab",
          filter: isDimmed ? "grayscale(0.8) brightness(0.9)" : undefined,
          opacity: isDimmed ? 0.65 : 1,
          transition: "filter 0.2s, opacity 0.2s",
        }}
        whileDrag={{ scale: 1.05 }}
        whileTap={{ cursor: "grabbing" }}
        aria-label="모래주머니를 당겼다 놓아 발사"
      >
        <Image
          src="/sand-bag.png"
          alt="모래주머니"
          fill
          draggable={false}
          style={{ objectFit: "contain", pointerEvents: "none" }}
          sizes={`${size}px`}
        />
      </motion.div>
    </div>
  );
}

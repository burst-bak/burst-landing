"use client";

/**
 * ============================================================================
 * Thermometer — Burst 게이지 온도계
 * ============================================================================
 *
 * 🎯 역할
 *  - 서버 측 burst ratio (0~1+)을 세로 게이지로 시각화
 *  - 빨간 임계선(기본 0.8)은 추상화된 목표 — 구체 수치는 비공개
 *  - 유저 타격 시 미세하게 움직이는 피드백
 *
 * 📌 레이아웃
 *  - 히스토그램 스타일: 세로축을 3개 단위 막대로 그룹화 → 최신화 느낌
 *  - 게임 화면 우측에 세로로 배치
 *
 * 📌 상태별 효과 (a11y 적용)
 *  - ratio < 0.8            : 파란~녹색 그라디언트
 *  - 0.8 ≤ ratio < 1.0      : 빨간 내부 깜빡임
 *  - ratio ≥ 1.0           : 사이렌 고정 + 테두리 붉은 맥동
 * ============================================================================
 */

import { useMotionPreference } from "@/hooks";
import { motion } from "framer-motion";

interface ThermometerProps {
  ratio: number;                 // 0~1+
  thresholdRatio?: number;        // 기본 0.8
  width?: number;                 // px
  height?: number;                // px
}

const TOTAL_BARS = 24; // 세로로 쌓일 히스토그램 막대 수

export function Thermometer({
  ratio,
  thresholdRatio = 0.8,
  width = 32,
  height = 260,
}: ThermometerProps) {
  const { prefersReducedMotion } = useMotionPreference();
  const clamped = Math.max(0, Math.min(1.1, ratio));
  const filledBars = Math.min(TOTAL_BARS, Math.floor(clamped * TOTAL_BARS));
  const thresholdY = (1 - thresholdRatio) * height;

  const isWarning = ratio >= thresholdRatio && ratio < 1;
  const isCritical = ratio >= 1;

  return (
    <motion.div
      style={{
        position: "relative",
        width,
        height,
        background: "rgba(240,250,248,0.6)",
        borderRadius: 12,
        border: `2px solid ${isCritical ? "#D4443A" : "#D1E8E4"}`,
        overflow: "hidden",
      }}
      animate={
        isCritical && !prefersReducedMotion
          ? { boxShadow: ["0 0 0 0 rgba(212,68,58,0)", "0 0 0 8px rgba(212,68,58,0.25)", "0 0 0 0 rgba(212,68,58,0)"] }
          : { boxShadow: "0 0 0 0 rgba(212,68,58,0)" }
      }
      transition={{ duration: 0.9, repeat: Infinity }}
      aria-label="박 타격 진행도"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      role="progressbar"
    >
      {/* 막대 스택 (하단부터 위로 차오름) */}
      <div
        style={{
          position: "absolute",
          inset: 2,
          display: "flex",
          flexDirection: "column-reverse",
          gap: 1,
        }}
      >
        {Array.from({ length: TOTAL_BARS }).map((_, i) => {
          const active = i < filledBars;
          const groupIndex = Math.floor(i / 3);
          const hue = isCritical ? 5 : isWarning ? 10 : 170 - groupIndex * 4;
          return (
            <motion.div
              key={i}
              style={{
                flex: 1,
                background: active
                  ? `hsl(${hue}, ${isCritical ? 75 : 65}%, ${isWarning || isCritical ? 55 : 50}%)`
                  : "rgba(91,191,181,0.08)",
                borderRadius: 1,
              }}
              animate={
                active && isWarning && !prefersReducedMotion
                  ? { opacity: [0.7, 1, 0.7] }
                  : { opacity: 1 }
              }
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.02 }}
            />
          );
        })}
      </div>

      {/* 빨간 임계선 (목표 — 추상화된 위치 고정) */}
      <div
        style={{
          position: "absolute",
          left: -4,
          right: -4,
          top: thresholdY,
          height: 2,
          background: "#D4443A",
          boxShadow: "0 0 6px rgba(212,68,58,0.6)",
        }}
      />
    </motion.div>
  );
}

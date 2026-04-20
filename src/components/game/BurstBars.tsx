"use client";

/**
 * ============================================================================
 * BurstBars — 다중 막대 실시간 게이지 (오디오 VU 미터 스타일)
 * ============================================================================
 *
 * 🎯 역할 (v2.1 사용자 피드백 2026-04-20)
 *  - 온도계 단일 막대 → 다중 세로 막대(기본 5개)로 교체
 *  - 각 막대가 독립적으로 출렁여서 "실시간" 감각을 강조
 *  - 평균 높이 ratio에 맞추되, 개별 막대는 노이즈 + 사인파로 변동
 *
 * 📌 동작
 *  - ratio 0~1+ : 전체 평균 높이
 *  - 각 막대 = ratio × (0.7 + sin(t + phase_i) * 0.3)  (±30% 출렁)
 *  - 임계선(기본 0.8) 위 빨강, 1.0 이상 빨간 깜빡
 *
 * 📌 접근성
 *  - prefers-reduced-motion → 출렁 비활성화, 정적 평균 표시
 * ============================================================================
 */

import { useMotionPreference } from "@/hooks";
import { useEffect, useRef, useState } from "react";

interface BurstBarsProps {
  ratio: number;                 // 0~1+
  thresholdRatio?: number;        // 기본 0.8
  barCount?: number;              // 기본 5
  barWidth?: number;              // px, 기본 10
  gap?: number;                   // px, 기본 6
  height?: number;                // px, 기본 120
}

const OSCILLATION_HZ = 0.9;        // 초당 진동 횟수
const OSCILLATION_AMP = 0.3;       // ±30% 진폭

export function BurstBars({
  ratio,
  thresholdRatio = 0.8,
  barCount = 5,
  barWidth = 10,
  gap = 6,
  height = 120,
}: BurstBarsProps) {
  const { prefersReducedMotion } = useMotionPreference();
  const [bars, setBars] = useState<number[]>(
    () => Array.from({ length: barCount }, () => 0),
  );
  const startRef = useRef<number>(performance.now());
  const rafRef = useRef<number | null>(null);
  const ratioRef = useRef(ratio);

  useEffect(() => {
    ratioRef.current = ratio;
  }, [ratio]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setBars(Array.from({ length: barCount }, () => ratioRef.current));
      return;
    }

    const loop = () => {
      const t = (performance.now() - startRef.current) / 1000;
      const next = Array.from({ length: barCount }, (_, i) => {
        const phase = (i / barCount) * Math.PI * 2;
        const osc = Math.sin(t * OSCILLATION_HZ * Math.PI * 2 + phase);
        const jitter = (Math.random() - 0.5) * 0.05;
        return Math.max(
          0,
          ratioRef.current * (1 + osc * OSCILLATION_AMP) + jitter,
        );
      });
      setBars(next);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [prefersReducedMotion, barCount]);

  const isWarning = ratio >= thresholdRatio && ratio < 1;
  const isCritical = ratio >= 1;

  const containerWidth = barCount * barWidth + (barCount - 1) * gap + 12;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(Math.min(1, ratio) * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="박 타격 진행도"
      style={{
        position: "relative",
        width: containerWidth,
        height,
        padding: 6,
        background: "rgba(240,250,248,0.75)",
        border: `2px solid ${isCritical ? "#D4443A" : "#D1E8E4"}`,
        borderRadius: 12,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap,
        overflow: "hidden",
        boxShadow: isCritical
          ? "0 0 18px rgba(212,68,58,0.25)"
          : "0 2px 6px rgba(61,158,148,0.08)",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      {/* 빨간 임계선 */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 2,
          right: 2,
          top: `calc(${(1 - thresholdRatio) * 100}% + 4px)`,
          height: 2,
          background: "#D4443A",
          boxShadow: "0 0 6px rgba(212,68,58,0.55)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      {bars.map((v, i) => {
        const clamped = Math.max(0, Math.min(1.15, v));
        const h = clamped * (height - 12);
        const colorHue = isCritical ? 5 : isWarning ? 14 : 170;
        const colorSat = isCritical ? 75 : isWarning ? 72 : 60;
        const colorLight = isCritical ? 55 : isWarning ? 52 : 48;
        return (
          <div
            key={i}
            style={{
              width: barWidth,
              height: Math.max(3, h),
              background: `linear-gradient(180deg,
                hsl(${colorHue}, ${colorSat}%, ${colorLight + 12}%) 0%,
                hsl(${colorHue}, ${colorSat}%, ${colorLight}%) 100%)`,
              borderRadius: barWidth / 2,
              transition: "height 80ms linear",
              boxShadow: isWarning || isCritical
                ? "0 0 8px rgba(212,68,58,0.35)"
                : "0 0 4px rgba(91,191,181,0.25)",
            }}
          />
        );
      })}
    </div>
  );
}

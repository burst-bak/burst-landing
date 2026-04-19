"use client";

import { useEffect, useState } from "react";

/**
 * 모션 감도 훅 (v2.1 피드백 7번: prefers-reduced-motion)
 *
 * 🎯 역할
 *  - 유저의 "모션 줄이기" 시스템 설정 감지
 *  - true일 때 끄는 것:
 *     • confetti
 *     • 사이렌 · 화면 테두리 맥동
 *     • 박 흔들림 세기 약화
 *     • navigator.vibrate() 진동 피드백 (v2.1 확정)
 *
 * 📌 사용 예
 *   const { prefersReducedMotion } = useMotionPreference();
 *   if (!prefersReducedMotion) navigator.vibrate(50);
 */
export function useMotionPreference(): { prefersReducedMotion: boolean } {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(query.matches);

    const onChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return { prefersReducedMotion };
}

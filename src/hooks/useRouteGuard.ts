"use client";

import { SessionEngine } from "@/lib/session-engine";
import type { GamePhase } from "@/types/game";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * 라우트 가드 훅 (v2.1 피드백 3번: GuardShell)
 *
 * 🎯 역할
 *  - 페이지가 기대하는 phase와 현재 세션 phase를 비교
 *  - 불일치 시 올바른 페이지로 router.replace
 *  - 판단이 끝날 때까지 {isResolving: true} → 페이지에서 Skeleton 표시
 *  - "잠깐 잘못된 화면"이 1프레임도 안 보이도록 가드 완료 전까지 실제 UI 렌더 금지
 *
 * 🗺️ 리다이렉트 규칙
 *  - expected="waiting" + 이미 LIVE          → /play/[eventId]
 *  - expected="waiting" + 이미 ENDED          → /result/{success|fail}/[eventId]
 *  - expected="play"    + 아직 WAITING        → /waiting/[eventId]
 *  - expected="play"    + 이미 ENDED          → /result/{success|fail}/[eventId]
 *  - expected="result"  + WAITING/LIVE 라면    → 해당 단계로 되돌림
 *  - 세션 자체가 없음                          → 랜딩(/)으로
 *
 * 📌 Result 페이지 분기
 *  - terminalState === "BURST"  → /result/success/[eventId]
 *  - 그 외 (TIME_UP, SOLD_OUT)  → /result/fail/[eventId]
 */
export function useRouteGuard(
  expected: "waiting" | "play" | "result",
  eventId: string,
): { isResolving: boolean } {
  const router = useRouter();
  const [isResolving, setIsResolving] = useState(true);

  useEffect(() => {
    const session = SessionEngine.ensure(eventId);
    const now = Date.now();

    // 시간 기반 phase 자동 갱신 (서버 시각이 도달하면 내부 전이)
    if (session.phase === "WAITING" && now >= session.openAt) {
      SessionEngine.transition("LIVE");
    }
    if (session.phase === "LIVE" && now >= session.closeAt) {
      SessionEngine.transition("ENDED");
      if (!SessionEngine.getState()?.terminalState) {
        SessionEngine.setTerminal("TIME_UP");
      }
    }

    const latest = SessionEngine.getState();
    if (!latest) {
      router.replace("/");
      return;
    }

    const resultPath =
      latest.terminalState === "BURST"
        ? `/result/success/${eventId}`
        : `/result/fail/${eventId}`;

    const redirectTo = computeRedirect(expected, latest.phase, resultPath, eventId);
    if (redirectTo) {
      router.replace(redirectTo);
    } else {
      setIsResolving(false);
    }
  }, [expected, eventId, router]);

  return { isResolving };
}

function computeRedirect(
  expected: "waiting" | "play" | "result",
  currentPhase: GamePhase,
  resultPath: string,
  eventId: string,
): string | null {
  if (expected === "waiting") {
    if (currentPhase === "LIVE") return `/play/${eventId}`;
    if (currentPhase === "ENDED") return resultPath;
    return null;
  }
  if (expected === "play") {
    if (currentPhase === "WAITING") return `/waiting/${eventId}`;
    if (currentPhase === "ENDED") return resultPath;
    return null;
  }
  // expected === "result"
  if (currentPhase === "WAITING") return `/waiting/${eventId}`;
  if (currentPhase === "LIVE") return `/play/${eventId}`;
  return null;
}

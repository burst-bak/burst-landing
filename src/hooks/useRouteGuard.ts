"use client";

import { fetchEventFull } from "@/lib/api/burst-api";
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
 *
 * 🗺️ 리다이렉트 규칙
 *  - expected="waiting" + 이미 LIVE          → /play/[eventId]
 *  - expected="waiting" + 이미 ENDED          → /result/{success|fail}/[eventId]
 *  - expected="play"    + 아직 WAITING        → /waiting/[eventId]
 *  - expected="play"    + 이미 ENDED          → /result/{success|fail}/[eventId]
 *  - expected="result"  + 백엔드 LIVE         → /play/[eventId]  (서버 검증)
 *  - 세션 자체가 없음                          → 랜딩(/)으로
 *
 * 📌 Result 페이지 분기 (Vol.1: BURST 미구현 — SOLD_OUT/BURST = 성공, TIME_UP = 실패)
 *  - terminalState === "TIME_UP"             → /result/fail/[eventId]
 *  - 그 외 (SOLD_OUT, BURST)                 → /result/success/[eventId]
 *
 * 🆕 result 모드 direct-share 보강 (5/1 audit fix)
 *  - 로컬 세션이 없거나 WAITING 인데 result 페이지 직접 진입한 경우:
 *    백엔드 fetchEventFull 로 진짜 state 확인 후 분기. mock fallback 제거.
 */
export function useRouteGuard(
  expected: "waiting" | "play" | "result",
  eventId: string,
): { isResolving: boolean } {
  const router = useRouter();
  const [isResolving, setIsResolving] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // expected === "result" 의 경우 — 직접 공유 진입을 고려해 백엔드 검증 우선.
      if (expected === "result") {
        const local = SessionEngine.getState();
        const localEnded =
          local?.eventId === eventId &&
          local.phase === "ENDED" &&
          local.terminalState != null;
        if (!localEnded) {
          try {
            const ev = await fetchEventFull(eventId);
            if (cancelled) return;
            const ended = ev.terminalState != null;
            if (!ended) {
              // 아직 끝나지 않음 → state 에 따라 적절히 보냄
              if (ev.state === "LIVE") {
                router.replace(`/play/${eventId}`);
              } else {
                router.replace(`/waiting/${eventId}`);
              }
              return;
            }
            // 백엔드가 ENDED 라고 확인 → 로컬 세션 brid 또는 새로 만들어 ENDED 로
            SessionEngine.initFromServerEvent(eventId, ev.openAt, ev.closeAt);
            SessionEngine.transition("LIVE");
            SessionEngine.transition("ENDED");
            SessionEngine.setTerminal(ev.terminalState!);
          } catch (e) {
            if (cancelled) return;
            console.error("[guard] result fetch failed", e);
            router.replace("/");
            return;
          }
        }
        // 라우팅: TIME_UP 만 fail, 나머지(SOLD_OUT/BURST) 는 success
        const latest = SessionEngine.getState();
        if (!latest) {
          router.replace("/");
          return;
        }
        const expectedPath = resultPathFor(latest.terminalState, eventId);
        // 현재 success 페이지 진입했는데 실제는 TIME_UP → fail 로 보내거나 그 반대.
        const currentSlot = window.location.pathname.includes("/result/success/")
          ? "success"
          : "fail";
        const shouldBe = expectedPath.includes("/result/success/")
          ? "success"
          : "fail";
        if (currentSlot !== shouldBe) {
          router.replace(expectedPath);
          return;
        }
        setIsResolving(false);
        return;
      }

      // waiting / play 모드: 기존 로직 유지
      const session = SessionEngine.ensure(eventId);
      const now = Date.now();

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

      const resultPath = resultPathFor(latest.terminalState, eventId);
      const redirectTo = computeRedirect(expected, latest.phase, resultPath, eventId);
      if (redirectTo) {
        router.replace(redirectTo);
      } else {
        setIsResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [expected, eventId, router]);

  return { isResolving };
}

/** Vol.1 라우팅: TIME_UP 만 fail. SOLD_OUT/BURST 는 모두 success(이벤트 종료 성공). */
function resultPathFor(
  terminalState: "SOLD_OUT" | "BURST" | "TIME_UP" | null | undefined,
  eventId: string,
): string {
  if (terminalState === "TIME_UP") return `/result/fail/${eventId}`;
  return `/result/success/${eventId}`;
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
  // expected === "result" 는 위에서 직접 처리 — 여기 도달하지 않음.
  return null;
}

"use client";

/**
 * ============================================================================
 * /play/[eventId] — 10초 게임 (핵심 페이지)
 * ============================================================================
 *
 * 🎯 구성
 *  - 좌상단: GameTimer (9.234 형태)
 *  - 우측 세로: Thermometer (burst ratio)
 *  - 중앙: Bak (박)
 *  - 하단: Sandbag (드래그 입력)
 *
 * 📌 흐름
 *  1. useRouteGuard("play") — phase 검증 + GuardShell Skeleton
 *  2. useServerTime + useBurstGauge — 실시간 서버 상태
 *  3. useSmash — 발사 요청 (쿨다운·멱등성 내장)
 *  4. Sandbag.onFire → useSmash.smash() → response 처리
 *     - HIT: Bak 흔들림 (shaking 상태 350ms)
 *     - LAST_HIT: 입력 즉시 잠금 + 결과 애니메이션 0.8~1s → result 페이지
 *     - REJECT: 무시 (UI가 이미 피드백 중)
 *  5. 게임 종료 자동 감지 (closeAt 도달) → result 페이지 자동 이동
 *
 * 📌 SOLD_OUT 이후 (v2.1 확정)
 *  - 박은 "bursted" 상태 (이미 터진 채 흔들림)
 *  - 입력은 계속 받되 서버가 REJECT → 던지는 감정만 해소
 *
 * 📌 접근성
 *  - Thermometer/Bak 맥동은 prefers-reduced-motion 반영 (각 컴포넌트 내부 처리)
 * ============================================================================
 */

import {
  Bak,
  type BakState,
  GameTimer,
  Sandbag,
  Thermometer,
} from "@/components/game";
import Skeleton from "@/components/ui/Skeleton";
import {
  useBurstGauge,
  useGame,
  useRouteGuard,
  useServerTime,
  useSmash,
} from "@/hooks";
import { SessionEngine } from "@/lib/session-engine";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";

interface PlayPageProps {
  params: Promise<{ eventId: string }>;
}

/** 종료 직후 결과 화면 연출 시간 (v2.1: 0.8~1s) */
const TERMINAL_ANIMATION_MS = 1000;

export default function PlayPage({ params }: PlayPageProps) {
  const { eventId } = use(params);
  const router = useRouter();
  const { session, refresh } = useGame();
  const { serverNow, isReady } = useServerTime();
  const { isResolving } = useRouteGuard("play", eventId);
  const gauge = useBurstGauge();
  const { smash, isCoolingDown } = useSmash(eventId);

  const [bakState, setBakState] = useState<BakState>("idle");
  const [inputLocked, setInputLocked] = useState(false);
  const bakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasNavigatedRef = useRef(false);

  // ─── 발사 핸들러 ─────────────────────────────────────────────────────
  const handleFire = useCallback(async () => {
    if (inputLocked) return;
    const response = await smash();
    if (!response) return;

    if (response.status === "HIT" || response.status === "LAST_HIT") {
      // Bak 흔들림 피드백 (350ms)
      if (bakTimerRef.current) clearTimeout(bakTimerRef.current);
      setBakState((prev) => (prev === "bursted" ? "bursted" : "shaking"));
      bakTimerRef.current = setTimeout(() => {
        setBakState((prev) => (prev === "bursted" ? "bursted" : "idle"));
      }, 350);
    }

    if (response.status === "LAST_HIT") {
      setInputLocked(true);
      setBakState("bursted");
      refresh();
      // 결과 애니메이션 후 이동
      scheduleResultNavigation();
    }
  }, [smash, inputLocked, refresh]);

  // ─── 게임 종료 감지 (시간 경과) ─────────────────────────────────────
  useEffect(() => {
    if (!session || !isReady) return;
    if (hasNavigatedRef.current) return;

    const now = Date.now();

    // 이미 terminal 상태면 즉시 result로
    if (session.terminalState || session.phase === "ENDED") {
      scheduleResultNavigation();
      return;
    }

    // closeAt 도달 → TIME_UP 확정
    if (now >= session.closeAt) {
      SessionEngine.transition("ENDED");
      if (!SessionEngine.getState()?.terminalState) {
        SessionEngine.setTerminal("TIME_UP");
      }
      refresh();
      scheduleResultNavigation();
    }
  }, [session, isReady, serverNow, refresh]);

  // ─── SOLD_OUT 이후 박 상태 유지 ────────────────────────────────────
  useEffect(() => {
    if (session?.terminalState === "SOLD_OUT") {
      setBakState("bursted");
    }
  }, [session?.terminalState]);

  const scheduleResultNavigation = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    setInputLocked(true);
    setTimeout(() => {
      const latest = SessionEngine.getState();
      const path =
        latest?.terminalState === "BURST"
          ? `/result/success/${eventId}`
          : `/result/fail/${eventId}`;
      router.replace(path);
    }, TERMINAL_ANIMATION_MS);
  }, [eventId, router]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (bakTimerRef.current) clearTimeout(bakTimerRef.current);
    };
  }, []);

  // ─── GuardShell ───────────────────────────────────────────────────
  if (isResolving || !session || !isReady) {
    return <PlaySkeleton />;
  }

  const ratio = gauge?.ratio ?? 0;

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        height: "100dvh",
        width: "100vw",
        background: "linear-gradient(180deg, #0D1B1A 0%, #18302E 100%)",
        overflow: "hidden",
        color: "#F0FAF8",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* 상단: 타이머 */}
      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top) + 16px)",
          left: 20,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: "0.05em" }}>
          남은 시간
        </div>
        <div style={{ color: "#F0FAF8" }}>
          <GameTimer serverNow={serverNow} closeAt={session.closeAt} />
        </div>
      </div>

      {/* 우측: 온도계 */}
      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top) + 60px)",
          right: 20,
        }}
      >
        <Thermometer
          ratio={ratio}
          thresholdRatio={0.8}
          width={32}
          height={380}
        />
      </div>

      {/* 중앙: 박 */}
      <div
        style={{
          position: "absolute",
          top: "48%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <Bak state={bakState} size={240} />
      </div>

      {/* 하단 안내 + 모래주머니 */}
      <div
        style={{
          position: "absolute",
          bottom: "calc(env(safe-area-inset-bottom) + 32px)",
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.55, letterSpacing: "0.05em" }}>
          당겨서 발사
        </div>
        <Sandbag
          onFire={handleFire}
          disabled={inputLocked}
          isCoolingDown={isCoolingDown}
          cooldownMs={500}
          size={110}
          inputMode="drag"
        />
      </div>

      {/* 종료 오버레이 (입력 잠금 + 페이드 처리) */}
      {inputLocked && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.25)",
            pointerEvents: "all",
            transition: "background 0.3s",
          }}
        />
      )}
    </main>
  );
}

function PlaySkeleton() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0D1B1A",
      }}
    >
      <Skeleton width="220px" height="220px" />
    </main>
  );
}

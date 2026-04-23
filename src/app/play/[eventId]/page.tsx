"use client";

/**
 * ============================================================================
 * /play/[eventId] — 단일 통합 게임 페이지 (v2.1 재설계 2026-04-20)
 * ============================================================================
 *
 * 🎯 설계 원칙
 *  - 페이지 전환 없음. WAITING → LIVE → ENDED 전부 한 화면에서.
 *  - 박 + 모래주머니는 메인에 항상 노출 (몰입감)
 *  - HUD(카운트다운·타이머·온도계)는 phase 따라 오버레이
 *  - 결과는 Modal로 (ResultModal), 닫아도 박은 계속 보임
 *
 * 🎯 Phase별 동작
 *   WAITING
 *     - 상단 카운트다운 "5초" 표시
 *     - 모래주머니 = 연습 투척 (선생님 팝업 3회차+)
 *     - openAt 도달 시 3-2-1-GO 오버레이 → LIVE 전환 (URL 변경 없음)
 *   LIVE
 *     - 상단 타이머 "9.234" + 우측 온도계
 *     - 모래주머니 = 실제 발사 (useSmash, 쿨다운 500ms)
 *     - LAST_HIT 또는 closeAt 도달 시 ENDED 전환
 *   ENDED
 *     - HUD 페이드 아웃
 *     - Bak 상태 = bursted (이미 터진 박이 흔들림)
 *     - 모래주머니 계속 작동 — 서버는 REJECT 하지만 UX(아쉬움 해소)
 *     - 0.5초 후 ResultModal 등장
 *
 * 📌 URL 공유
 *  - /waiting/[eventId] 는 /play/[eventId]로 자동 redirect
 *  - /result/success|fail/[eventId]는 직접 공유용으로 남김 (별도 페이지)
 * ============================================================================
 */

import {
  Bak,
  type BakState,
  BurstBars,
  CountdownOverlay,
  GameTimer,
  ResultModal,
  Sandbag,
  TeacherPopup,
} from "@/components/game";
import Skeleton from "@/components/ui/Skeleton";
import {
  useAuth,
  useGame,
  useServerTime,
  useSmash,
} from "@/hooks";
import { useBurstGaugeReal } from "@/hooks/useBurstGaugeReal";
import { fetchEventFull } from "@/lib/api/burst-api";
import { SessionEngine } from "@/lib/session-engine";
import type { GamePhase, TerminalState } from "@/types/game";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { use, useCallback, useEffect, useRef, useState } from "react";

interface PlayPageProps {
  params: Promise<{ eventId: string }>;
}

/** ENDED 전환 후 Modal 등장까지의 딜레이 (박 터지는 연출 시간) */
const MODAL_DELAY_MS = 700;

export default function PlayPage({ params }: PlayPageProps) {
  const { eventId } = use(params);
  const { user } = useAuth();
  const { session, refresh } = useGame();
  const { serverNow, isReady } = useServerTime();
  const { gauge, terminal: wsTerminal } = useBurstGaugeReal(eventId);
  const { smash, isCoolingDown } = useSmash(eventId);

  const [bakState, setBakState] = useState<BakState>("idle");
  const [showCountdownOverlay, setShowCountdownOverlay] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [practiceToast, setPracticeToast] = useState<{
    visible: boolean;
    message: string;
    large?: boolean;
  }>({ visible: false, message: "" });

  // 발사 포물선 애니메이션용 projectile 목록
  const [projectiles, setProjectiles] = useState<
    Array<{ id: number; startX: number }>
  >([]);
  const projectileSeqRef = useRef(0);

  const bakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionedLiveRef = useRef(false);
  const transitionedEndedRef = useRef(false);
  const modalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const practiceCountRef = useRef(0);

  // 실 이벤트 fetch → SessionEngine 에 서버 openAt/closeAt 주입
  // 이미 종료된 이벤트(SOLD_OUT/BURST/TIME_UP/CLOSED)는 즉시 ENDED 단계로 건너뜀
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ev = await fetchEventFull(eventId);
        if (cancelled) return;
        SessionEngine.initFromServerEvent(eventId, ev.openAt, ev.closeAt);
        if (ev.terminalState) {
          SessionEngine.setTerminal(ev.terminalState);
        }
        const isEnded = ["SOLD_OUT", "BURST", "TIME_UP", "CLOSED"].includes(
          ev.state,
        );
        if (isEnded) {
          SessionEngine.transition("LIVE");  // WAITING → LIVE 허용 전이
          SessionEngine.transition("ENDED"); // LIVE → ENDED
        } else if (ev.state === "LIVE") {
          SessionEngine.transition("LIVE");
        }
        refresh();
      } catch (e) {
        console.warn("[play] fetchEvent failed, fallback to mock session", e);
        SessionEngine.ensure(eventId);
        refresh();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, refresh]);

  // WS terminal 수신 시 즉시 ENDED 로 전이 + terminalState 반영
  useEffect(() => {
    if (!wsTerminal) return;
    const t = wsTerminal.terminalState as TerminalState;
    if (!["SOLD_OUT", "BURST", "TIME_UP"].includes(t)) return;
    if (!SessionEngine.getState()?.terminalState) {
      SessionEngine.setTerminal(t);
    }
    SessionEngine.transition("ENDED");
    refresh();
  }, [wsTerminal, refresh]);

  const phase: GamePhase = session?.phase ?? "WAITING";
  const openAt = session?.openAt ?? 0;
  const closeAt = session?.closeAt ?? 0;
  const terminalState = session?.terminalState ?? null;
  const isWinner = session?.isWinner ?? false;

  // ─── WAITING → LIVE 자동 전환 ───────────────────────────────────────
  useEffect(() => {
    if (!session || !isReady) return;
    if (phase !== "WAITING") return;
    if (transitionedLiveRef.current) return;
    if (serverNow >= openAt) {
      transitionedLiveRef.current = true;
      SessionEngine.transition("LIVE");
      refresh();
    }
  }, [session, isReady, phase, serverNow, openAt, refresh]);

  // ─── CountdownOverlay (openAt - 3s 도달 시 1회 띄움) ──────────────
  useEffect(() => {
    if (phase !== "WAITING" || !isReady || showCountdownOverlay) return;
    const remaining = openAt - serverNow;
    if (remaining <= 3000 && remaining > 0) {
      setShowCountdownOverlay(true);
    }
  }, [phase, openAt, serverNow, isReady, showCountdownOverlay]);

  // ─── LIVE → ENDED 자동 전환 (시간 만료) ─────────────────────────────
  useEffect(() => {
    if (!session || !isReady) return;
    if (phase !== "LIVE") return;
    if (transitionedEndedRef.current) return;
    if (serverNow >= closeAt) {
      transitionedEndedRef.current = true;
      SessionEngine.transition("ENDED");
      if (!SessionEngine.getState()?.terminalState) {
        SessionEngine.setTerminal("TIME_UP");
      }
      refresh();
    }
  }, [session, isReady, phase, serverNow, closeAt, refresh]);

  // ─── ENDED 진입 시 Modal 등장 ───────────────────────────────────────
  useEffect(() => {
    if (phase !== "ENDED") return;
    if (showResultModal) return;
    if (modalTimerRef.current) return;
    // 박 터지는 연출 시간 후 Modal
    setBakState("bursted");
    modalTimerRef.current = setTimeout(() => {
      setShowResultModal(true);
    }, MODAL_DELAY_MS);
  }, [phase, showResultModal]);

  // ─── 정리 ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (bakTimerRef.current) clearTimeout(bakTimerRef.current);
      if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
    };
  }, []);

  // ─── projectile 스폰 (포물선으로 날아가는 모래주머니) ──────────────
  const spawnProjectile = useCallback(() => {
    projectileSeqRef.current += 1;
    const id = projectileSeqRef.current;
    // 약간의 좌우 랜덤 오프셋 (리얼리즘)
    const startX = (Math.random() - 0.5) * 40;
    setProjectiles((prev) => [...prev, { id, startX }]);
    // 애니메이션 끝난 뒤 제거
    setTimeout(() => {
      setProjectiles((prev) => prev.filter((p) => p.id !== id));
    }, 600);
  }, []);

  // ─── 발사 핸들러 ─────────────────────────────────────────────────
  const handleFire = useCallback(async () => {
    spawnProjectile();

    // WAITING일 때는 연습 투척 (서버 호출 없음)
    if (phase === "WAITING") {
      practiceCountRef.current += 1;
      const count = practiceCountRef.current;

      // 박 흔들림 (쿨다운은 Sandbag 컴포넌트의 내부 쿨다운 로직에 맡김)
      if (bakTimerRef.current) clearTimeout(bakTimerRef.current);
      setBakState("shaking");
      bakTimerRef.current = setTimeout(() => {
        setBakState("idle");
      }, 350);

      // v2.1: 3회차 큰 팝업, 이후 작은 말풍선
      if (count === 3) {
        setPracticeToast({
          visible: true,
          message: "어허! 거 좀 하지마!",
          large: true,
        });
      } else if (count > 3) {
        setPracticeToast({
          visible: true,
          message: "거참…",
          large: false,
        });
      }
      return;
    }

    // ENDED일 때는 서버 호출은 하되 박은 이미 터진 상태 유지
    if (phase === "ENDED") {
      if (bakTimerRef.current) clearTimeout(bakTimerRef.current);
      setBakState("bursted"); // 유지
      // 아쉬움 해소용 살짝 흔들림은 bursted 애니메이션에 이미 있음
      return;
    }

    // LIVE — 실제 발사
    const response = await smash();
    if (!response) return;

    if (response.status === "HIT" || response.status === "LAST_HIT") {
      if (bakTimerRef.current) clearTimeout(bakTimerRef.current);
      setBakState((prev) => (prev === "bursted" ? "bursted" : "shaking"));
      bakTimerRef.current = setTimeout(() => {
        setBakState((prev) => (prev === "bursted" ? "bursted" : "idle"));
      }, 350);
    }

    if (response.status === "LAST_HIT") {
      refresh();
      // ENDED 전환은 session refresh 후 다음 useEffect에서 감지됨 (이미 setTerminal 호출됨)
      // 여기서 안전하게 즉시 ENDED 플래그도 설정
      SessionEngine.transition("ENDED");
      refresh();
    }
  }, [phase, smash, refresh, spawnProjectile]);

  // ─── Teacher 자동 닫기 ─────────────────────────────────────────────
  useEffect(() => {
    if (!practiceToast.visible) return;
    const timer = setTimeout(
      () => setPracticeToast((t) => ({ ...t, visible: false })),
      practiceToast.large ? 2200 : 1400,
    );
    return () => clearTimeout(timer);
  }, [practiceToast]);

  // ─── 렌더 ────────────────────────────────────────────────────────
  if (!session || !isReady) {
    return <PlaySkeleton />;
  }

  const remainingToOpen = Math.max(0, openAt - serverNow);

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        height: "100dvh",
        width: "100vw",
        overflow: "hidden",
        userSelect: "none",
        WebkitUserSelect: "none",
        background: "#FFFFFF",
        color: "#1C1917",
      }}
    >
      {/* ═══════════════ 상단 HUD (phase별) ═══════════════ */}
      <AnimatePresence mode="wait">
        {phase === "WAITING" && (
          <motion.div
            key="hud-waiting"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: "absolute",
              top: "calc(env(safe-area-inset-top) + 20px)",
              left: 0,
              right: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              zIndex: 5,
            }}
          >
            <span style={{ fontSize: 11, color: "#3D9E94", letterSpacing: "0.1em" }}>
              박 터트리기 Vol.1
            </span>
            <span style={{ fontSize: 10, color: "#999" }}>시작까지</span>
            <span
              style={{
                fontSize: remainingToOpen < 10000 ? 48 : 36,
                fontWeight: 800,
                color: remainingToOpen < 10000 ? "#D4443A" : "#1C1917",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.03em",
              }}
            >
              {formatCountdown(remainingToOpen)}
            </span>
            <span style={{ fontSize: 10, color: "#999", marginTop: 2 }}>
              {user?.nickname ?? "게스트"}
            </span>
          </motion.div>
        )}

        {phase === "LIVE" && (
          <motion.div
            key="hud-live"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              top: "calc(env(safe-area-inset-top) + 18px)",
              left: 20,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              zIndex: 10,
            }}
          >
            <span style={{ fontSize: 11, color: "#5A5A5A", letterSpacing: "0.05em" }}>
              남은 시간
            </span>
            <GameTimer serverNow={serverNow} closeAt={closeAt} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ 우측 상단 BurstBars 게이지 (LIVE만) ═══════════════ */}
      <AnimatePresence>
        {phase === "LIVE" && (
          <motion.div
            key="gauge"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            style={{
              position: "absolute",
              top: "calc(env(safe-area-inset-top) + 18px)",
              right: 18,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 11, color: "#5A5A5A", letterSpacing: "0.05em" }}>
              박 강도
            </span>
            <BurstBars
              ratio={gauge?.ratio ?? 0}
              thresholdRatio={0.8}
              barCount={5}
              barWidth={10}
              gap={5}
              height={110}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ 상단 정렬 박 (최대한 위로 — 2cm up) ═══════════════ */}
      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top) - 20px)",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 512,
            display: "flex",
            justifyContent: "center",
            paddingInline: 24,
          }}
        >
          <Bak state={bakState} variant="hero" />
        </div>
      </div>

      {/* ═══════════════ 하단 모래주머니 (항상 고정) ═══════════════ */}
      <div
        style={{
          position: "absolute",
          bottom: "calc(env(safe-area-inset-bottom) + 36px)",
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          zIndex: 5,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "#5A5A5A",
            opacity: 0.65,
            letterSpacing: "0.05em",
          }}
        >
          {phase === "WAITING"
            ? "연습 투척"
            : phase === "LIVE"
              ? "당겨서 발사"
              : "박은 이미 터졌어요"}
        </span>

        {/* 모래주머니 + 우측 후방 드래그 방향 인디케이터 */}
        <div style={{ position: "relative" }}>
          <Sandbag
            onFire={handleFire}
            isCoolingDown={isCoolingDown}
            cooldownMs={500}
            size={56}
            inputMode="drag"
          />
          {/* 인디케이터: 모래주머니 우측 아래로 향하는 화살표 + 설명 */}
          {phase !== "ENDED" && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                position: "absolute",
                right: -72,
                bottom: -6,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                pointerEvents: "none",
              }}
              aria-hidden
            >
              <motion.svg
                width="40"
                height="36"
                viewBox="0 0 40 36"
                style={{ overflow: "visible" }}
                animate={{ y: [0, 3, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* 곡선 화살표: 모래주머니에서 우측 아래로 */}
                <path
                  d="M 4 4 Q 22 4, 28 24"
                  stroke="#3D9E94"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* 화살촉 */}
                <path
                  d="M 24 20 L 28 26 L 33 22"
                  stroke="#3D9E94"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
              <span
                style={{
                  fontSize: 10,
                  color: "#3D9E94",
                  fontWeight: 700,
                  marginTop: 2,
                  whiteSpace: "nowrap",
                }}
              >
                당겼다 놓기
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* ═══════════════ 날아가는 모래주머니 (포물선) ═══════════════ */}
      <AnimatePresence>
        {projectiles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              x: p.startX,
              y: 0,
              scale: 1,
              rotate: 0,
              opacity: 1,
            }}
            animate={{
              // y: 아래→위, 중간에 약간 높이 올라갔다가 박 위치에서 소멸 (포물선 느낌)
              y: ["0px", "-55dvh", "-60dvh"],
              x: [p.startX, p.startX * 0.4, 0],
              scale: [1, 0.65, 0.4],
              rotate: [0, 300, 540],
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 0.5,
              ease: "easeOut",
              times: [0, 0.75, 1],
            }}
            style={{
              position: "fixed",
              bottom: "calc(env(safe-area-inset-bottom) + 80px)",
              left: "50%",
              marginLeft: -28,
              width: 56,
              height: 56,
              zIndex: 30,
              pointerEvents: "none",
            }}
          >
            <Image
              src="/sand-bag.png"
              alt=""
              width={56}
              height={56}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ═══════════════ 선생님 팝업 (연습 투척 3회+) ═══════════════ */}
      <TeacherPopup
        visible={practiceToast.visible}
        message={practiceToast.message}
        variant="scold"
        position="bottom-right"
      />

      {/* ═══════════════ 3-2-1-GO 오버레이 ═══════════════ */}
      {showCountdownOverlay && (
        <CountdownOverlay
          startAt={openAt - 3000}
          onComplete={() => setShowCountdownOverlay(false)}
        />
      )}

      {/* ═══════════════ 결과 다시보기 플로팅 버튼 (ENDED + Modal 닫혔을 때) ═══════════════ */}
      <AnimatePresence>
        {phase === "ENDED" && !showResultModal && (
          <motion.button
            key="replay-btn"
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -8 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            onClick={() => setShowResultModal(true)}
            style={{
              position: "fixed",
              top: "calc(env(safe-area-inset-top) + 12px)",
              right: 12,
              zIndex: 50,
              padding: "10px 14px",
              background: "#FFFFFF",
              color: "#3D9E94",
              border: "1px solid #D1E8E4",
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow:
                "0 8px 20px -6px rgba(15,23,42,0.18), 0 0 0 1px rgba(91,191,181,0.1)",
            }}
            whileHover={{ y: -2, boxShadow: "0 12px 24px -6px rgba(15,23,42,0.22)" }}
            whileTap={{ scale: 0.96 }}
            aria-label="결과 다시보기"
          >
            <span aria-hidden>🎯</span>
            <span className="hidden sm:inline">결과 다시보기</span>
            <span className="sm:hidden">결과</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ═══════════════ 결과 Modal (ENDED) ═══════════════ */}
      <ResultModal
        open={showResultModal}
        terminalState={terminalState}
        isWinner={isWinner}
        onClose={() => setShowResultModal(false)}
      />
    </main>
  );
}

// ─── 서브 유틸 ───────────────────────────────────────────────────

function PlaySkeleton() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F0FAF8",
      }}
    >
      <Skeleton width="220px" height="220px" />
    </main>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  if (total <= 60) return `${total}초`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m < 60) return `${m}:${s.toString().padStart(2, "0")}`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}:${mm.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

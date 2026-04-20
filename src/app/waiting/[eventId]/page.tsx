"use client";

/**
 * ============================================================================
 * /waiting/[eventId] — 대기실
 * ============================================================================
 *
 * 🎯 흐름
 *  1. useRouteGuard("waiting") — phase 검증, 불일치 시 자동 리다이렉트
 *  2. useServerTime — 200ms 간격 서버 시각
 *  3. 카운트다운 = openAt - serverNow (메인 표시)
 *  4. 절대 시각 우측 하단 작게 표시
 *  5. 연습 투척: 탭 발사 (쿨다운 500ms)
 *     - 1회차에 첫 TeacherPopup (scold) 큰 한 번
 *     - 2~3회차부터 작은 말풍선·버튼 흔들림 (재미 유지)
 *  6. 카운트다운 종료 3초 전 → CountdownOverlay 띄우기
 *  7. GO! 끝나면 router.replace(`/play/${eventId}`)
 *
 * 📌 v2.1 피드백 반영
 *  - GuardShell: useRouteGuard의 isResolving 동안 Skeleton만 렌더
 *  - 절대 시각은 "있어도 되고 없어도 되는" 보조 정보 (요청대로 작게)
 *  - Toast 빈도: 첫 1회 큰 것 + 이후 작은 말풍선 (v2.1 확정)
 * ============================================================================
 */

import {
  Bak,
  CountdownOverlay,
  Sandbag,
  TeacherPopup,
} from "@/components/game";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { useAuth, useGame, useRouteGuard, useServerTime } from "@/hooks";
import { SessionEngine } from "@/lib/session-engine";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";

interface WaitingPageProps {
  params: Promise<{ eventId: string }>;
}

export default function WaitingPage({ params }: WaitingPageProps) {
  const { eventId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { session, refresh } = useGame();
  const { serverNow, isReady } = useServerTime();
  const { isResolving } = useRouteGuard("waiting", eventId);

  const [practiceCount, setPracticeCount] = useState(0);
  const [practiceCoolingDown, setPracticeCoolingDown] = useState(false);
  const [teacher, setTeacher] = useState<{
    visible: boolean;
    message: string;
    large?: boolean;
  }>({ visible: false, message: "" });

  // 카운트다운 오버레이 — openAt - 3s 에 트리거
  const [showCountdown, setShowCountdown] = useState(false);
  const hasTransitionedRef = useRef(false);

  const openAt = session?.openAt ?? 0;
  const closeAt = session?.closeAt ?? 0;
  const remainingMs = Math.max(0, openAt - serverNow);
  const secondsLeft = Math.ceil(remainingMs / 1000);

  // openAt에 도달하면 자동 전환 (1회만)
  useEffect(() => {
    if (!session || !isReady) return;
    if (hasTransitionedRef.current) return;
    if (remainingMs <= 0) {
      hasTransitionedRef.current = true;
      SessionEngine.transition("LIVE");
      refresh();
      router.replace(`/play/${eventId}`);
    }
  }, [remainingMs, session, isReady, eventId, router, refresh]);

  // openAt - 3s 도달 시 CountdownOverlay 띄움 (1회만)
  useEffect(() => {
    if (!openAt || !isReady || showCountdown) return;
    if (openAt - serverNow <= 3000 && openAt - serverNow > 0) {
      setShowCountdown(true);
    }
  }, [openAt, serverNow, isReady, showCountdown]);

  // 연습 투척 핸들러
  const handlePracticeFire = () => {
    setPracticeCoolingDown(true);
    setTimeout(() => setPracticeCoolingDown(false), 500);

    const next = practiceCount + 1;
    setPracticeCount(next);

    // v2.1: 첫 1회 큰 TeacherPopup (scold), 이후 작은 말풍선 유지
    if (next === 3) {
      setTeacher({
        visible: true,
        message: "어허! 거 좀 하지마!",
        large: true,
      });
    } else if (next > 3) {
      setTeacher({
        visible: true,
        message: "거참…",
        large: false,
      });
    }
  };

  // Teacher 자동 닫기
  useEffect(() => {
    if (!teacher.visible) return;
    const timer = setTimeout(
      () => setTeacher((t) => ({ ...t, visible: false })),
      teacher.large ? 2200 : 1400,
    );
    return () => clearTimeout(timer);
  }, [teacher]);

  // ─── GuardShell: 판단 중에는 Skeleton만 ─────────────────────────────
  if (isResolving || !session || !isReady) {
    return <WaitingSkeleton />;
  }

  const openDate = formatAbsoluteDate(openAt);

  return (
    <main
      className="relative flex flex-col items-center w-full"
      style={{
        minHeight: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
        background: "linear-gradient(180deg, #F0FAF8 0%, #FFFFFF 60%)",
      }}
    >
      {/* 상단 헤더 */}
      <header className="w-full max-w-md px-5 pt-6 pb-4 flex justify-between items-center">
        <span className="text-sm font-semibold text-[#3D9E94]">박 터트리기 Vol.1</span>
        <span className="text-xs text-[#999]">{user?.nickname ?? "게스트"}</span>
      </header>

      {/* 박 */}
      <section className="flex flex-col items-center gap-4 mt-6">
        <Bak state="idle" size={220} />
      </section>

      {/* 카운트다운 (메인, 큰 글씨) */}
      <section className="mt-8 flex flex-col items-center">
        <div className="text-xs text-[#5A5A5A] mb-1">시작까지</div>
        <div
          style={{
            fontSize: secondsLeft > 60 ? 56 : 80,
            fontWeight: 800,
            lineHeight: 1,
            color: secondsLeft <= 10 ? "#D4443A" : "#1C1917",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.04em",
          }}
          aria-live="polite"
        >
          {formatCountdown(remainingMs)}
        </div>
        {/* 절대 시각 (보조, 작게) */}
        <div className="text-[11px] text-[#999] mt-2">{openDate}</div>
      </section>

      {/* 연습 투척 */}
      <section className="mt-10 flex flex-col items-center gap-3">
        <div className="text-xs text-[#5A5A5A]">연습 투척</div>
        <Sandbag
          onFire={handlePracticeFire}
          isCoolingDown={practiceCoolingDown}
          cooldownMs={500}
          size={96}
          inputMode="drag"
        />
        <div className="text-[11px] text-[#999]">모래주머니를 당겼다 놓아보세요</div>
      </section>

      {/* 하단 CTA (공유 / 카카오 채널) */}
      <section className="mt-auto w-full max-w-md px-5 pb-4 flex flex-col gap-2">
        <Button
          variant="outline"
          fullWidth
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: "박 터트리기",
                text: "10초 딸깍으로 상금!",
                url: location.href.split("/waiting")[0],
              }).catch(() => {});
            } else {
              navigator.clipboard?.writeText(location.href.split("/waiting")[0]);
            }
          }}
        >
          🔗 친구 초대
        </Button>
      </section>

      {/* 선생님 팝업 (v2.1: 첫 1회 큰 것 + 이후 작은 것) */}
      <TeacherPopup
        visible={teacher.visible}
        message={teacher.message}
        variant="scold"
        position="bottom-right"
      />

      {/* 3-2-1-GO 오버레이 */}
      {showCountdown && (
        <CountdownOverlay
          startAt={openAt - 3000}
          onComplete={() => router.replace(`/play/${eventId}`)}
        />
      )}
    </main>
  );
}

// ─── 서브 컴포넌트 / 유틸 ──────────────────────────────────────────────

function WaitingSkeleton() {
  return (
    <main
      className="flex flex-col items-center justify-center gap-6"
      style={{ minHeight: "100dvh", padding: 24 }}
    >
      <Skeleton width="220px" height="220px" />
      <Skeleton width="200px" height="48px" />
      <Skeleton width="120px" height="16px" />
    </main>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  if (total <= 60) return `${total}초`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m < 60) return `${m}분 ${s.toString().padStart(2, "0")}`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}시간 ${mm.toString().padStart(2, "0")}분`;
}

function formatAbsoluteDate(epochMs: number): string {
  if (!epochMs) return "";
  const d = new Date(epochMs);
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours().toString().padStart(2, "0");
  const mi = d.getMinutes().toString().padStart(2, "0");
  return `${mo}/${day} ${h}:${mi} 오픈`;
}

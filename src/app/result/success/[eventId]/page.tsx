"use client";

/**
 * ============================================================================
 * /result/success/[eventId] — BURST 성공 화면
 * ============================================================================
 *
 * 🎯 카피 원칙 (v2.1 피드백 4번: 결과 카피 분리)
 *  - 헤드라인: "박 터졌습니다!" (이벤트 성공을 분명히)
 *  - 본인 당첨 안내: "당첨자에게는 별도로 연락드립니다" (오해 방지)
 *  - isWinner==true 일 때만 "마지막 한 방 주인공" 노출
 *
 * 🎯 CTA 우선순위 (v2.1)
 *  1. Vol.2 사전 알림 받기 (카카오 채널)
 *  2. 링크 공유 (바이럴)
 *  3. 돌아가기
 *
 * 📌 v2.1 확정
 *  - 감사 상금·사후 추첨 카피 삭제
 *  - BURST 본상금 = 마지막 성공 요청자 1인
 * ============================================================================
 */

import { Bak, Confetti } from "@/components/game";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { useGame, useRouteGuard } from "@/hooks";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

interface ResultSuccessPageProps {
  params: Promise<{ eventId: string }>;
}

export default function ResultSuccessPage({
  params,
}: ResultSuccessPageProps) {
  const { eventId } = use(params);
  const router = useRouter();
  const { session } = useGame();
  const { isResolving } = useRouteGuard("result", eventId);

  const [confettiKey] = useState(() => Date.now());

  // BURST 아니면 fail로 돌려보냄 (Guard 이중 안전망)
  useEffect(() => {
    if (!session) return;
    if (session.terminalState && session.terminalState !== "BURST") {
      router.replace(`/result/fail/${eventId}`);
    }
  }, [session, eventId, router]);

  if (isResolving || !session) {
    return <ResultSkeleton />;
  }

  const isWinner = session.isWinner;

  return (
    <main
      style={{
        minHeight: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background:
          "linear-gradient(180deg, #FFF9E0 0%, #F0FAF8 50%, #FFFFFF 100%)",
      }}
    >
      <Confetti key={confettiKey} count={70} />

      {/* 박 (터진 상태 — 여기서는 정적 이미지로 취급, 향후 터진 박 이미지로 교체 가능) */}
      <section className="flex flex-col items-center gap-3 mt-12">
        <div
          style={{
            fontSize: 72,
            lineHeight: 1,
            transform: "rotate(-8deg)",
            filter: "drop-shadow(0 8px 24px rgba(245,158,11,0.25))",
          }}
          aria-hidden
        >
          🎉
        </div>
        <Bak state="bursted" size={200} />
      </section>

      {/* 헤드라인 — 이벤트 성공 */}
      <section className="flex flex-col items-center mt-6 px-5 text-center gap-1">
        <h1
          style={{
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#1C1917",
          }}
        >
          박 터졌습니다!
        </h1>
        <p style={{ fontSize: 14, color: "#5A5A5A" }}>
          모두가 힘을 모아 박을 깨뜨렸어요 🎊
        </p>
      </section>

      {/* 당첨자 연락 안내 (v2.1 피드백 4번: "내가 당첨?" 오해 방지) */}
      <section
        className="w-full max-w-md mt-8 mx-auto px-5"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            background: "#F0FAF8",
            border: "2px solid #D1E8E4",
            borderRadius: 16,
            padding: "16px 18px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#3D9E94" }}>
            {isWinner
              ? "🏆 마지막 한 방의 주인공, 바로 당신!"
              : "당첨자에게는 별도로 연락드립니다"}
          </div>
          <div style={{ fontSize: 12, color: "#5A5A5A", marginTop: 6 }}>
            {isWinner
              ? "운영자가 곧 개별적으로 연락드릴게요."
              : "공정한 추첨·상금 지급 과정은 인스타·유튜브로 공개됩니다."}
          </div>
        </div>
      </section>

      {/* CTA (v2.1 우선순위: Vol.2 알림 > 공유 > 돌아가기) */}
      <section
        className="w-full max-w-md mt-auto mx-auto px-5 pb-2"
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        <Button variant="primary" fullWidth onClick={() => openKakaoChannel()}>
          🔔 Vol.2 사전 알림 받기
        </Button>
        <Button variant="outline" fullWidth onClick={() => shareLink()}>
          📋 링크 공유
        </Button>
        <Button variant="ghost" fullWidth onClick={() => router.replace("/")}>
          🏠 돌아가기
        </Button>
      </section>
    </main>
  );
}

function ResultSkeleton() {
  return (
    <main
      className="flex flex-col items-center justify-center gap-6"
      style={{ minHeight: "100dvh", padding: 24 }}
    >
      <Skeleton width="200px" height="200px" />
      <Skeleton width="240px" height="40px" />
    </main>
  );
}

function openKakaoChannel() {
  // TODO: 카카오 JS SDK Channel.addChannel 호출 (비즈채널 승인 후)
  if (typeof window !== "undefined") {
    window.open(
      "https://pf.kakao.com/",
      "_blank",
      "noopener,noreferrer",
    );
  }
}

function shareLink() {
  if (typeof window === "undefined") return;
  const url = location.origin;
  if (navigator.share) {
    navigator
      .share({ title: "박 터트리기", text: "10초 딸깍으로 상금!", url })
      .catch(() => {});
  } else {
    navigator.clipboard?.writeText(url);
  }
}

"use client";

/**
 * ============================================================================
 * /result/fail/[eventId] — TIME_UP / SOLD_OUT 실패 화면
 * ============================================================================
 *
 * 🎯 v2.1 확정 (도메인_게임후.md 2026-04-20 업데이트)
 *  - TIME_UP / SOLD_OUT 모두 **동일한 화면**
 *  - 감사 상금·이스터에그 문구 노출 금지 (공식 공지 없음)
 *  - SOLD_OUT의 마지막 재고 유저는 운영자가 비공개로 개별 연락
 *
 * 🎯 카피
 *  - 헤드라인: "상금이 부족했네..."
 *  - 서브: "더 큰 상금으로 돌아오겠습니다."
 *  - 마크: "Vol.1 끝."
 *  - 티저: "🎯 Vol.2로 돌아오겠습니다."
 *
 * 🎯 CTA 우선순위 (success와 동일)
 *  1. Vol.2 사전 알림 받기
 *  2. 링크 공유 (친구 1명 = 다음 회차 상금 +∞)
 *  3. 돌아가기
 * ============================================================================
 */

import { Bak } from "@/components/game";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { useGame, useRouteGuard } from "@/hooks";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";

interface ResultFailPageProps {
  params: Promise<{ eventId: string }>;
}

export default function ResultFailPage({ params }: ResultFailPageProps) {
  const { eventId } = use(params);
  const router = useRouter();
  const { session } = useGame();
  const { isResolving } = useRouteGuard("result", eventId);

  // BURST였다면 success로 (Guard 이중 안전망)
  useEffect(() => {
    if (!session) return;
    if (session.terminalState === "BURST") {
      router.replace(`/result/success/${eventId}`);
    }
  }, [session, eventId, router]);

  if (isResolving || !session) {
    return <ResultFailSkeleton />;
  }

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
          "linear-gradient(180deg, #F5F5F4 0%, #FAFAF9 60%, #FFFFFF 100%)",
      }}
    >
      {/* 멀쩡한 박 (풀 죽은 무드) */}
      <section className="flex flex-col items-center gap-3 mt-16">
        <Bak state="idle" size={200} />
      </section>

      {/* 헤드라인 */}
      <section className="flex flex-col items-center mt-8 px-5 text-center gap-1.5">
        <h1
          style={{
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#3F3F46",
          }}
        >
          상금이 부족했네...
        </h1>
        <p style={{ fontSize: 14, color: "#71717A" }}>
          더 큰 상금으로 돌아오겠습니다.
        </p>
      </section>

      {/* 엔딩 크레딧 느낌 */}
      <section
        className="mt-10 px-5 text-center"
        style={{ color: "#A1A1AA", fontSize: 13, letterSpacing: "0.04em" }}
      >
        <div>— Vol.1 끝. —</div>
        <div className="mt-3">🎯 Vol.2로 돌아오겠습니다.</div>
      </section>

      {/* 리퍼럴 바이브 */}
      <section className="w-full max-w-md mt-8 mx-auto px-5">
        <div
          style={{
            background: "#F4F4F5",
            border: "1px solid #E4E4E7",
            borderRadius: 14,
            padding: "14px 16px",
            textAlign: "center",
            fontSize: 12,
            color: "#71717A",
            lineHeight: 1.6,
          }}
        >
          더 많은 사람이 모일수록<br />
          <span style={{ color: "#3F3F46", fontWeight: 600 }}>
            다음 Vol의 박과 상금이 커집니다
          </span>
        </div>
      </section>

      {/* CTA */}
      <section
        className="w-full max-w-md mt-auto mx-auto px-5 pb-2"
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        <Button variant="primary" fullWidth onClick={() => openKakaoChannel()}>
          🔔 Vol.2 사전 알림 받기
        </Button>
        <Button variant="outline" fullWidth onClick={() => shareLink()}>
          📋 친구에게 알리기
        </Button>
        <Button variant="ghost" fullWidth onClick={() => router.replace("/")}>
          🏠 돌아가기
        </Button>
      </section>
    </main>
  );
}

function ResultFailSkeleton() {
  return (
    <main
      className="flex flex-col items-center justify-center gap-6"
      style={{ minHeight: "100dvh", padding: 24 }}
    >
      <Skeleton width="200px" height="200px" />
      <Skeleton width="220px" height="36px" />
    </main>
  );
}

function openKakaoChannel() {
  if (typeof window !== "undefined") {
    window.open("https://pf.kakao.com/", "_blank", "noopener,noreferrer");
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

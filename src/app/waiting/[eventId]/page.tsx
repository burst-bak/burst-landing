"use client";

/**
 * ============================================================================
 * /waiting/[eventId] — /play로 자동 redirect (v2.1 재설계 2026-04-20)
 * ============================================================================
 *
 * 단일 통합 게임 페이지로 전환. URL 공유·이전 링크 호환성 위해 이 라우트는 유지.
 * 실제 로직은 /play/[eventId]에 있음.
 * ============================================================================
 */

import { useRouter } from "next/navigation";
import { use, useEffect } from "react";

interface WaitingRedirectProps {
  params: Promise<{ eventId: string }>;
}

export default function WaitingRedirect({ params }: WaitingRedirectProps) {
  const { eventId } = use(params);
  const router = useRouter();

  useEffect(() => {
    // URL 쿼리스트링은 유지 (scenario, reset 등)
    const qs =
      typeof window !== "undefined" ? window.location.search : "";
    router.replace(`/play/${eventId}${qs}`);
  }, [eventId, router]);

  return null;
}

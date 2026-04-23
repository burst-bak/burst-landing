/**
 * ============================================================================
 * burst-api 실제 백엔드 클라이언트
 * ============================================================================
 *
 * 🎯 역할
 *   Mock 과 동일 signature 로 실 API 호출. 훅·페이지는 import 경로만 바꾸면 됨.
 *
 * 🔐 인증
 *   Spring Session 쿠키(SESSION, HttpOnly, SameSite=Lax)
 *   모든 호출에 `credentials: 'include'` 로 쿠키 동반 전송
 *
 * 🧭 baseURL
 *   NEXT_PUBLIC_API_BASE 환경변수 (기본 http://localhost:8081)
 *
 * 📌 mock → real 교체 시 고려사항
 *   - 타입 `BurstEvent.openAt/closeAt` 은 epoch ms, 백엔드는 ISO — Date.parse 변환
 *   - `SmashResponse.hitCount` ↔ 백엔드 `hitSeq`
 *   - `EventResult.endedAt/isWinner` ↔ 백엔드 `announceAt + winnerUserId` 로 계산
 * ============================================================================
 */

import type {
  AuthUser,
  BurstEvent,
  EventResult,
  SmashResponse,
} from "@/types/game";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8081";

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(BASE + path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

// ── 이벤트 ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/events/{eventCode}
 * 비로그인 허용.
 */
export async function fetchEvent(eventId: string): Promise<BurstEvent> {
  const res = await authFetch(`/api/v1/events/${eventId}`);
  if (!res.ok) {
    throw new Error(`fetchEvent failed: ${res.status}`);
  }
  const data = await res.json();
  return {
    eventId: data.eventCode,
    title: data.title,
    openAt: Date.parse(data.openAt),
    closeAt: Date.parse(data.closeAt),
  };
}

// ── Smash ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/events/{eventCode}/smash
 * 로그인 필수. 서버가 @AuthenticationPrincipal 로 userId 주입.
 *
 * 쿨다운/중복은 서버(Redis Lua)에서 최종 판정. 클라는 로컬 쿨다운 표시만.
 */
export async function postSmash(
  eventId: string,
  requestId: string,
): Promise<SmashResponse> {
  const res = await authFetch(`/api/v1/events/${eventId}/smash`, {
    method: "POST",
    body: JSON.stringify({ requestId }),
  });

  if (res.status === 401 || res.status === 302) {
    throw new Error("UNAUTHENTICATED");
  }
  if (!res.ok) {
    throw new Error(`postSmash failed: ${res.status}`);
  }

  const data = await res.json();
  const status = data.status as SmashResponse["status"];
  const reason = (data.rejectReason ?? undefined) as SmashResponse["reason"];
  const hitSeq = Number(data.hitSeq ?? 0);

  const cooldownUntil =
    status === "REJECT" ? undefined : Date.now() + 500;

  return {
    status,
    reason,
    hitCount: hitSeq,
    cooldownUntil,
  };
}

// ── 결과 ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/events/{eventCode}/result
 * 비로그인 허용. announce_at 전엔 winner 필드가 마스킹됨.
 */
export async function fetchResult(
  eventId: string,
  myUserId?: string | null,
): Promise<EventResult | null> {
  const res = await authFetch(`/api/v1/events/${eventId}/result`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`fetchResult failed: ${res.status}`);
  const data = await res.json();

  const isWinner =
    myUserId != null &&
    data.winnerUserId != null &&
    String(data.winnerUserId) === String(myUserId);

  return {
    eventId: data.eventCode,
    terminalState: data.terminalState,
    endedAt: data.winnerTs ? Date.parse(data.winnerTs) : Date.parse(data.createdAt),
    myHitCount: 0,   // TODO: /me/claims 나 별도 API 로 본인 히트 수 집계
    isWinner,
  };
}

// ── 인증 ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/auth/me
 * 비로그인 시 body=null (200 with null) 반환 — 백엔드 AuthController 참조.
 */
export async function fetchMe(): Promise<AuthUser | null> {
  const res = await authFetch("/api/v1/auth/me");
  if (!res.ok) return null;
  // 로그인 안 된 상태는 Spring 이 body=null 로 200 응답 → 빈 텍스트라 JSON 파싱 실패 방지
  const text = await res.text();
  if (!text || text === "null") return null;
  try {
    const data = JSON.parse(text);
    if (!data || data.userId == null) return null;
    return {
      id: String(data.userId),
      nickname: data.nickname,
      kakaoId: undefined,  // 백엔드 me 응답엔 kakaoId 미포함 (privacy)
    };
  } catch {
    return null;
  }
}

/**
 * 카카오 OAuth 로그인 진입 — 전체 창 리다이렉트.
 * 성공 시 burst.auth.login-success-url (기본 http://localhost:3000/) 로 돌아옴.
 */
export function loginWithKakao(): void {
  window.location.href = `${BASE}/oauth2/authorization/kakao`;
}

/**
 * POST /logout — Spring Security 기본 경로.
 * 세션 쿠키 삭제 + 서버 세션 무효화.
 */
export async function logout(): Promise<void> {
  await authFetch("/logout", { method: "POST" });
}

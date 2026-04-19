/**
 * ============================================================================
 * AuthContext — 인증 상태 Provider
 * ============================================================================
 *
 * 🎯 MVP 역할 (mock)
 *  - 기본 로그인 상태 제공 (찬호와 협의: 개발 편의)
 *  - useAuth() 훅으로 페이지·가드에서 소비
 *
 * 📌 백엔드 연동 시 교체 순서
 *  1. Kakao JS SDK + 카카오 로그인 버튼 → /api/v1/auth/kakao/callback 호출
 *  2. 서버가 세션 쿠키 Set-Cookie (Redis 세션, HttpOnly)
 *  3. 이 Provider는 /api/v1/me 로 현재 유저 조회 → 상태 갱신
 *  4. 로그아웃 / 강제 세션 만료 감지는 401 응답으로 처리
 * ============================================================================
 */

"use client";

import { MOCK_USER } from "@/lib/mock/mock-data";
import type { AuthUser } from "@/types/game";
import { createContext, useMemo, type ReactNode } from "react";

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** 로그인 트리거 (mock에서는 상태 변경 없음 — 늘 로그인 상태) */
  login: () => Promise<void>;
  /** 로그아웃 트리거 (mock은 no-op, 실제는 POST /logout) */
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(
    () => ({
      user: MOCK_USER,
      isAuthenticated: true,
      login: async () => {
        // TODO: 실제 구현 시 카카오 OAuth 리다이렉트
      },
      logout: async () => {
        // TODO: 실제 구현 시 세션 쿠키 삭제 + 서버 알림
      },
    }),
    [],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

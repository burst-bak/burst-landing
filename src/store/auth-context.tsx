/**
 * ============================================================================
 * AuthContext — 인증 상태 Provider (실 백엔드 연동)
 * ============================================================================
 *
 * 🎯 동작
 *  - 마운트 시 GET /api/v1/auth/me 로 세션 확인
 *  - login(): 카카오 OAuth 리다이렉트
 *  - logout(): POST /logout + 상태 초기화
 *
 * 🔄 세션 상태 재조회
 *  - 카카오 OAuth 성공 후 /?loggedIn=1 같은 리다이렉트 쿼리가 없어도
 *    페이지 로드 시 fetchMe 로 자동 갱신
 *
 * 🚨 SSR
 *  - fetchMe 는 브라우저에서만 (document.cookie 필요). useEffect 내부 호출로 제약.
 * ============================================================================
 */

"use client";

import { fetchMe, loginWithKakao, logout as apiLogout } from "@/lib/api/burst-api";
import type { AuthUser } from "@/types/game";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
    } catch (e) {
      console.error("[auth] fetchMe failed", e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async () => {
    loginWithKakao();
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (e) {
      console.error("[auth] logout failed", e);
    }
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refresh,
    }),
    [user, isLoading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

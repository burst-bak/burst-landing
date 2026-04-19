"use client";

import { AuthContext, type AuthContextValue } from "@/store/auth-context";
import { useContext } from "react";

/**
 * 인증 상태 훅 — Provider 없이 호출 시 throw
 * 사용처: 랜딩(운동장 가기 버튼), 라우트 가드, 마이페이지
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

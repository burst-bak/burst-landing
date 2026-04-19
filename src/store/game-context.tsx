/**
 * ============================================================================
 * GameContext — 게임 상태 읽기 전용 래퍼 (Split-brain 방지)
 * ============================================================================
 *
 * 🚨 중요 원칙 (v2.1 피드백 1번: Split-brain 방지)
 *  - 게임 상태의 "진짜 정답"은 SessionEngine 한 군데.
 *  - 이 Provider는 그걸 읽어서 React 트리에 뿌리는 "렌더용 캐시"일 뿐.
 *  - 상태 변경은 반드시 SessionEngine API 경유 → refresh() 호출.
 *
 * 📌 소비 방식
 *  - useGame() 훅이 { session, refresh } 반환
 *  - 페이지/컴포넌트가 phase, terminalState, myHitCount를 참조할 때 여기 사용
 *
 * 📌 백엔드 연동 시
 *  - SessionEngine이 "로컬 캐시"로 격하되면, 여기서는
 *    WebSocket push로 받은 서버 상태 + SessionEngine 스냅샷을 병합 렌더
 * ============================================================================
 */

"use client";

import { SessionEngine } from "@/lib/session-engine";
import type { SessionState } from "@/types/game";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface GameContextValue {
  session: SessionState | null;
  /** SessionEngine 재조회 — 훅이 상태 변경 후 수동 refresh 호출 */
  refresh: () => void;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState | null>(null);

  const refresh = useCallback(() => {
    setSession(SessionEngine.getState());
  }, []);

  useEffect(() => {
    refresh();
    // sessionStorage 변경 감지 (다른 탭에서 수정 시)
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.includes("burst:session")) {
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const value = useMemo<GameContextValue>(
    () => ({ session, refresh }),
    [session, refresh],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

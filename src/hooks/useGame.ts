"use client";

import { GameContext, type GameContextValue } from "@/store/game-context";
import { useContext } from "react";

/**
 * 게임 세션 상태 훅
 * - SessionEngine 결과를 React 트리에서 소비하는 창구
 * - Split-brain 방지: 이 훅에서 반환되는 session은 읽기 전용 스냅샷
 * - 상태 변경은 반드시 SessionEngine API 경유 후 refresh() 호출
 */
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGame must be used inside <GameProvider>");
  }
  return ctx;
}

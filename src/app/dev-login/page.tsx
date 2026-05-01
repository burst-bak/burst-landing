/**
 * ============================================================================
 * /dev-login — 로컬 개발 전용 연동 시연 페이지
 * ============================================================================
 *
 * 🎯 용도
 *  - 프론트 ↔ 백엔드 첫 연동 확인
 *  - 카카오 로그인 플로우 동작 여부
 *  - 실 API 호출 (me / event / smash / result)
 *
 * 🚨 운영 배포 시 라우트 제거 또는 환경 체크로 차단.
 * ============================================================================
 */

"use client";

import { useAuth } from "@/hooks/useAuth";
import {
  fetchEvent,
  fetchResult,
  postSmash,
} from "@/lib/api/burst-api";
import { useCallback, useState } from "react";

const DEFAULT_EVENT =
  process.env.NEXT_PUBLIC_DEFAULT_EVENT_CODE || "vol-1";

/** epoch ms → KST 사람-읽기 형식 (예: 2026-04-28 20:30:00) */
function formatKst(epochMs: number | string | null | undefined): string {
  if (epochMs == null) return "—";
  const ms = typeof epochMs === "string" ? Date.parse(epochMs) : epochMs;
  if (Number.isNaN(ms)) return String(epochMs);
  return new Date(ms).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function DevLoginPage() {
  const { user, isAuthenticated, isLoading, login, logout, refresh } = useAuth();
  const [eventCode, setEventCode] = useState(DEFAULT_EVENT);
  const [log, setLog] = useState<string[]>([]);

  const append = useCallback((line: string) => {
    const stamp = new Date().toISOString().slice(11, 23);
    setLog((cur) => [...cur, `[${stamp}] ${line}`]);
  }, []);

  const onFetchEvent = useCallback(async () => {
    try {
      const e = await fetchEvent(eventCode);
      const pretty = {
        ...e,
        openAtKST: formatKst(e.openAt),
        closeAtKST: formatKst(e.closeAt),
      };
      append(`event → ${JSON.stringify(pretty, null, 2)}`);
    } catch (err) {
      append(`event ERR → ${(err as Error).message}`);
    }
  }, [eventCode, append]);

  const onSmash = useCallback(async () => {
    try {
      const reqId = `${eventCode}:${Date.now()}`;
      const res = await postSmash(eventCode, reqId);
      append(`smash → ${JSON.stringify(res)}`);
    } catch (err) {
      const msg = (err as Error).message;
      // "Failed to fetch" = 인증 필요해서 OAuth redirect → CORS 실패. 사용자에게 명확히 안내.
      const friendly =
        msg === "Failed to fetch" && !isAuthenticated
          ? "로그인이 필요한 API입니다 (POST /smash 는 인증 필수)"
          : msg;
      append(`smash ERR → ${friendly}`);
    }
  }, [eventCode, append, isAuthenticated]);

  const onResult = useCallback(async () => {
    try {
      const r = await fetchResult(eventCode, user?.id);
      if (!r) {
        append("result → null (아직 결과 없음)");
        return;
      }
      const pretty = {
        ...r,
        announceAtKST: formatKst((r as { announceAt?: number | string }).announceAt),
        winnerTsKST: formatKst((r as { winnerTs?: number | string }).winnerTs),
        createdAtKST: formatKst((r as { createdAt?: number | string }).createdAt),
      };
      append(`result → ${JSON.stringify(pretty, null, 2)}`);
    } catch (err) {
      append(`result ERR → ${(err as Error).message}`);
    }
  }, [eventCode, user?.id, append]);

  return (
    <main className="min-h-screen bg-[#FFFDF7] text-[#1C1917] p-6 text-sm">
      <header className="mb-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-extrabold tracking-tight">
          🛠 dev-login
        </h1>
        <p className="text-[#5A5A5A] mt-1">burst-api 연동 테스트 콘솔</p>
      </header>

      <section className="mb-5 p-5 bg-white border border-[#E8E2D4] rounded-2xl shadow-sm max-w-3xl mx-auto">
        <h2 className="text-xs font-bold text-[#9A8E72] uppercase tracking-wider mb-3">
          인증 상태
        </h2>
        {isLoading ? (
          <p className="text-[#5A5A5A]">loading…</p>
        ) : isAuthenticated ? (
          <p className="text-base">
            ✅ <strong>로그인됨</strong> — userId=
            <code className="text-[#3D9E94] font-mono">{user?.id}</code>, nickname=
            <code className="text-[#3D9E94] font-mono">{user?.nickname}</code>
          </p>
        ) : (
          <p className="text-base text-[#D4443A]">⛔ 비로그인</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="px-4 py-2 bg-[#FEE500] text-black rounded-full font-bold shadow-sm hover:brightness-95 transition"
            onClick={() => login()}
          >
            🔔 카카오 로그인
          </button>
          <button
            className="px-4 py-2 bg-[#1C1917] text-white rounded-full font-medium hover:bg-[#3F3A33] transition"
            onClick={async () => {
              await logout();
              await refresh();
              append("logged out");
            }}
          >
            로그아웃
          </button>
          <button
            className="px-4 py-2 bg-white border border-[#E8E2D4] text-[#1C1917] rounded-full font-medium hover:bg-[#F4EFE2] transition"
            onClick={async () => {
              await refresh();
              append("auth refreshed");
            }}
          >
            /me 새로고침
          </button>
        </div>
      </section>

      <section className="mb-5 p-5 bg-white border border-[#E8E2D4] rounded-2xl shadow-sm max-w-3xl mx-auto">
        <h2 className="text-xs font-bold text-[#9A8E72] uppercase tracking-wider mb-3">
          이벤트 호출
        </h2>
        <label className="flex items-center gap-2 mb-4">
          <span className="text-[#5A5A5A] font-medium">eventCode:</span>
          <input
            className="flex-1 bg-[#F4EFE2] border border-[#E8E2D4] focus:border-[#3D9E94] focus:outline-none px-3 py-1.5 rounded-lg font-mono"
            value={eventCode}
            onChange={(e) => setEventCode(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            className="px-4 py-2 bg-[#3D9E94] text-white rounded-full font-bold shadow-sm hover:brightness-95 transition"
            onClick={onFetchEvent}
          >
            GET /events/{eventCode}
          </button>
          <button
            className="px-4 py-2 bg-[#D4443A] text-white rounded-full font-bold shadow-sm hover:brightness-95 disabled:bg-[#C8C0AE] disabled:cursor-not-allowed transition"
            onClick={onSmash}
            disabled={!isAuthenticated}
            title={
              !isAuthenticated
                ? "로그인이 필요합니다 (POST 는 인증 필수)"
                : undefined
            }
          >
            POST /events/{eventCode}/smash {!isAuthenticated && "🔒"}
          </button>
          <button
            className="px-4 py-2 bg-[#3D9E94] text-white rounded-full font-bold shadow-sm hover:brightness-95 transition"
            onClick={onResult}
          >
            GET /events/{eventCode}/result
          </button>
        </div>
      </section>

      <section className="p-5 bg-white border border-[#E8E2D4] rounded-2xl shadow-sm max-w-3xl mx-auto">
        <h2 className="text-xs font-bold text-[#9A8E72] uppercase tracking-wider mb-3">
          로그
        </h2>
        <pre className="text-xs whitespace-pre-wrap break-all bg-[#FAF7EE] border border-[#E8E2D4] rounded-lg p-3 font-mono text-[#1C1917] max-h-[60vh] overflow-auto">
          {log.length === 0 ? "(비어있음)" : log.join("\n")}
        </pre>
      </section>
    </main>
  );
}

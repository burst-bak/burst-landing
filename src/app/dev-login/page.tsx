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
      append(`event → ${JSON.stringify(e)}`);
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
      append(`smash ERR → ${(err as Error).message}`);
    }
  }, [eventCode, append]);

  const onResult = useCallback(async () => {
    try {
      const r = await fetchResult(eventCode, user?.id);
      append(`result → ${r ? JSON.stringify(r) : "null (not yet)"}`);
    } catch (err) {
      append(`result ERR → ${(err as Error).message}`);
    }
  }, [eventCode, user?.id, append]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-sm">
      <h1 className="text-xl mb-4">/dev-login — burst-api 연동 테스트</h1>

      <section className="mb-6 p-4 bg-zinc-900 rounded">
        <h2 className="text-base mb-2 text-zinc-400">인증 상태</h2>
        {isLoading ? (
          <p>loading...</p>
        ) : isAuthenticated ? (
          <p>
            ✅ 로그인됨 — userId={user?.id}, nickname={user?.nickname}
          </p>
        ) : (
          <p>⛔ 비로그인</p>
        )}
        <div className="mt-3 flex gap-2">
          <button
            className="px-3 py-1 bg-yellow-400 text-black rounded"
            onClick={login}
          >
            카카오 로그인
          </button>
          <button
            className="px-3 py-1 bg-zinc-700 rounded"
            onClick={async () => {
              await logout();
              await refresh();
              append("logged out");
            }}
          >
            로그아웃
          </button>
          <button
            className="px-3 py-1 bg-zinc-700 rounded"
            onClick={async () => {
              await refresh();
              append("auth refreshed");
            }}
          >
            /me 새로고침
          </button>
        </div>
      </section>

      <section className="mb-6 p-4 bg-zinc-900 rounded">
        <h2 className="text-base mb-2 text-zinc-400">이벤트 호출</h2>
        <label className="flex items-center gap-2 mb-3">
          eventCode:
          <input
            className="bg-zinc-800 px-2 py-1 rounded"
            value={eventCode}
            onChange={(e) => setEventCode(e.target.value)}
          />
        </label>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-sky-500 rounded"
            onClick={onFetchEvent}
          >
            GET /events/{eventCode}
          </button>
          <button
            className="px-3 py-1 bg-rose-500 rounded"
            onClick={onSmash}
          >
            POST /events/{eventCode}/smash
          </button>
          <button
            className="px-3 py-1 bg-emerald-500 rounded"
            onClick={onResult}
          >
            GET /events/{eventCode}/result
          </button>
        </div>
      </section>

      <section className="p-4 bg-zinc-900 rounded">
        <h2 className="text-base mb-2 text-zinc-400">로그</h2>
        <pre className="text-xs whitespace-pre-wrap break-all">
          {log.length === 0 ? "(비어있음)" : log.join("\n")}
        </pre>
      </section>
    </main>
  );
}

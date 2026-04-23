/**
 * ============================================================================
 * /live-demo — 실 백엔드 기반 예약·카운트다운·LIVE·SOLD_OUT·결과 시연
 * ============================================================================
 *
 * 🎯 시나리오
 *   1) 이벤트를 openAt 미래 시각으로 DB 에 insert (terminal 에서 SQL)
 *   2) 이 페이지 접속 → URL `?code=<eventCode>` 로 이벤트 지정
 *   3) 1초마다 GET /events/{code} 폴링 → state 변화 표시
 *   4) 카운트다운 → LIVE 전환 시 smash 버튼 활성
 *   5) SOLD_OUT/TIME_UP/BURST/CLOSED 도달 → /result 조회 + 결과 박스
 *
 * 🚨 운영 배포 시 라우트 제거. `/dev-login` 과 같은 개발용.
 * ============================================================================
 */

"use client";

import { useAuth } from "@/hooks/useAuth";
import {
  fetchEvent,
  fetchResult,
  postSmash,
} from "@/lib/api/burst-api";
import type { BurstEvent, EventResult, SmashResponse } from "@/types/game";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ExtendedEvent = BurstEvent & { state?: string; announceAt?: number };

export default function LiveDemoPage() {
  const { user, isAuthenticated, login, logout, isLoading: authLoading } =
    useAuth();

  const [eventCode, setEventCode] = useState<string>("");
  const [codeInput, setCodeInput] = useState("");
  const [event, setEvent] = useState<ExtendedEvent | null>(null);
  const [serverState, setServerState] = useState<string>("-");
  const [now, setNow] = useState<number>(Date.now());
  const [result, setResult] = useState<EventResult | null>(null);
  const [lastResp, setLastResp] = useState<SmashResponse | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);

  const append = useCallback((l: string) => {
    const t = new Date().toISOString().slice(11, 23);
    setLog((cur) => [`[${t}] ${l}`, ...cur].slice(0, 30));
  }, []);

  // URL ?code= 초기값
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const c = q.get("code");
    if (c) {
      setEventCode(c);
      setCodeInput(c);
    }
  }, []);

  // 1초 틱 (카운트다운 렌더)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  // 1초마다 이벤트 상태 폴링
  useEffect(() => {
    if (!eventCode) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8081"}/api/v1/events/${eventCode}`,
          { credentials: "include" },
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (cancelled) return;
        setEvent({
          eventId: data.eventCode,
          title: data.title,
          openAt: Date.parse(data.openAt),
          closeAt: Date.parse(data.closeAt),
          state: data.state,
          announceAt: Date.parse(data.announceAt),
        });
        setServerState(data.state);
        // 종료 상태면 결과 조회
        if (["SOLD_OUT", "BURST", "TIME_UP", "CLOSED"].includes(data.state)) {
          const r = await fetchResult(eventCode, user?.id);
          if (!cancelled) setResult(r);
        }
      } catch (e) {
        if (!cancelled) setServerState(`ERR ${(e as Error).message}`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [eventCode, user?.id]);

  const isCooling = now < cooldownUntil;

  const onSmash = useCallback(async () => {
    if (!event || !isAuthenticated) return;
    try {
      const reqId = `${eventCode}:${Date.now()}`;
      const res = await postSmash(eventCode, reqId);
      setLastResp(res);
      append(
        `smash → ${res.status}${res.reason ? ` (${res.reason})` : ""}  seq=${res.hitCount}`,
      );
      if (res.status !== "REJECT") {
        setCooldownUntil(Date.now() + 500);
      }
    } catch (e) {
      append(`smash ERR → ${(e as Error).message}`);
    }
  }, [event, isAuthenticated, eventCode, append]);

  const countdown = useMemo(() => {
    if (!event) return null;
    if (serverState === "READY") {
      const left = event.openAt - now;
      return { label: "open in", ms: left };
    }
    if (serverState === "LIVE") {
      const left = event.closeAt - now;
      return { label: "LIVE — remaining", ms: left };
    }
    if (event.announceAt && event.announceAt > now && result && !result) {
      const left = event.announceAt - now;
      return { label: "announce in", ms: left };
    }
    return null;
  }, [event, serverState, now, result]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-sm">
      <h1 className="text-xl mb-4">/live-demo — 실 백엔드 시연</h1>

      {/* Auth */}
      <section className="mb-4 p-3 bg-zinc-900 rounded flex items-center gap-3">
        <span className="text-zinc-400">auth:</span>
        {authLoading ? (
          <span>...</span>
        ) : isAuthenticated ? (
          <span>
            ✅ {user?.nickname}{" "}
            <span className="text-zinc-500">(id={user?.id})</span>
          </span>
        ) : (
          <span>⛔ 비로그인</span>
        )}
        <div className="ml-auto flex gap-2">
          <button
            className="px-3 py-1 bg-yellow-400 text-black rounded"
            onClick={login}
          >
            카카오 로그인
          </button>
          <button
            className="px-3 py-1 bg-zinc-700 rounded"
            onClick={logout}
          >
            로그아웃
          </button>
        </div>
      </section>

      {/* Event picker */}
      <section className="mb-4 p-3 bg-zinc-900 rounded flex gap-2 items-center">
        <label>eventCode:</label>
        <input
          className="bg-zinc-800 px-2 py-1 rounded"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          placeholder="예: vol-1"
        />
        <button
          className="px-3 py-1 bg-sky-500 rounded"
          onClick={() => {
            setEventCode(codeInput);
            setResult(null);
            setLastResp(null);
          }}
        >
          연결
        </button>
      </section>

      {/* State */}
      <section className="mb-4 p-3 bg-zinc-900 rounded">
        <div className="text-zinc-400 mb-1">이벤트 상태</div>
        {event ? (
          <>
            <div>
              <b>{event.title}</b> — state:{" "}
              <span
                className={
                  serverState === "LIVE"
                    ? "text-emerald-400"
                    : serverState === "READY"
                      ? "text-sky-400"
                      : "text-rose-400"
                }
              >
                {serverState}
              </span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              openAt: {new Date(event.openAt).toLocaleTimeString()}{" "}
              / closeAt: {new Date(event.closeAt).toLocaleTimeString()}
            </div>
            {countdown && (
              <div className="mt-2 text-2xl">
                {countdown.label}: {formatDuration(countdown.ms)}
              </div>
            )}
          </>
        ) : eventCode ? (
          <div>loading... (eventCode={eventCode})</div>
        ) : (
          <div>eventCode 를 입력하고 "연결" 클릭</div>
        )}
      </section>

      {/* Smash */}
      <section className="mb-4 p-3 bg-zinc-900 rounded">
        <div className="text-zinc-400 mb-2">발사</div>
        <button
          disabled={
            !isAuthenticated || serverState !== "LIVE" || isCooling
          }
          onClick={onSmash}
          className={`px-6 py-3 rounded text-lg font-bold transition ${
            !isAuthenticated || serverState !== "LIVE" || isCooling
              ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
              : "bg-rose-500 hover:bg-rose-400"
          }`}
        >
          💥 SMASH
          {isCooling && ` (쿨다운 ${Math.max(0, cooldownUntil - now)}ms)`}
        </button>
        {lastResp && (
          <div className="mt-2 text-xs text-zinc-400">
            최근 응답: {JSON.stringify(lastResp)}
          </div>
        )}
      </section>

      {/* Result */}
      {result && (
        <section className="mb-4 p-3 bg-zinc-900 rounded">
          <div className="text-zinc-400 mb-2">결과</div>
          <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>
          {result.isWinner && (
            <div className="mt-2 text-emerald-400 text-lg">
              🎉 당신이 마지막 성공자! (LAST_HIT winner)
            </div>
          )}
        </section>
      )}

      {/* Log */}
      <section className="p-3 bg-zinc-900 rounded">
        <div className="text-zinc-400 mb-2">로그</div>
        <pre className="text-xs whitespace-pre-wrap">
          {log.length === 0 ? "(비어있음)" : log.join("\n")}
        </pre>
      </section>
    </main>
  );
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0s";
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

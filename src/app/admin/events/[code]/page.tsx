/**
 * ============================================================================
 * /admin/events/[code] — 이벤트 실시간 대시보드 (어드민 전용)
 * ============================================================================
 *
 * 📡 API
 *   GET /api/v1/admin/events/{code}        — 메타
 *   GET /api/v1/admin/events/{code}/live   — Redis 기준 state/remaining/successSeq
 *   GET /api/v1/admin/events/{code}/audit  — 최근 smash 히트 로그 (limit=50)
 *
 * 🔄 폴링: live 는 1초, audit 는 2초.
 * ============================================================================
 */

"use client";

import { useAuth } from "@/hooks/useAuth";
import { use, useCallback, useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8081";

interface EventMeta {
  eventCode: string;
  title: string;
  openAt: string;
  closeAt: string;
  announceAt: string;
  initialStock: number;
  prizeAmountKrw: number;
  state: string;
  terminalState: string | null;
}

interface LiveStats {
  eventCode: string;
  dbState: string;
  redisState: string;
  remaining: number;
  successSeq: number;
  closeAtMs: number;
  nowServerMs: number;
}

interface AuditRow {
  id: number;
  userId: number;
  nickname: string;
  status: string;
  rejectReason: string | null;
  requestId: string;
  serverTs: string;
}

export default function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { isAuthenticated, isLoading, login, user } = useAuth();
  const [meta, setMeta] = useState<EventMeta | null>(null);
  const [live, setLive] = useState<LiveStats | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchMeta = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/v1/admin/events/${code}`, {
        credentials: "include",
      });
      if (r.status === 403) {
        setError("어드민 권한 없음");
        return;
      }
      if (!r.ok) return;
      setMeta(await r.json());
    } catch {}
  }, [code]);

  const fetchLive = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/v1/admin/events/${code}/live`, {
        credentials: "include",
      });
      if (!r.ok) return;
      setLive(await r.json());
    } catch {}
  }, [code]);

  const fetchAudit = useCallback(async () => {
    try {
      const r = await fetch(
        `${BASE}/api/v1/admin/events/${code}/audit?limit=50`,
        { credentials: "include" },
      );
      if (!r.ok) return;
      setAudit(await r.json());
    } catch {}
  }, [code]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchMeta();
    fetchLive();
    fetchAudit();
    const liveId = setInterval(fetchLive, 1000);
    const auditId = setInterval(fetchAudit, 2000);
    return () => {
      clearInterval(liveId);
      clearInterval(auditId);
    };
  }, [isAuthenticated, fetchMeta, fetchLive, fetchAudit]);

  if (isLoading)
    return (
      <Frame>
        <p>loading...</p>
      </Frame>
    );
  if (!isAuthenticated)
    return (
      <Frame>
        <p className="mb-3">어드민 로그인이 필요합니다.</p>
        <button
          onClick={login}
          className="px-4 py-2 bg-yellow-400 text-black rounded"
        >
          카카오 로그인
        </button>
      </Frame>
    );
  if (error)
    return (
      <Frame>
        <p className="text-rose-400">{error}</p>
      </Frame>
    );

  const soldOut =
    live &&
    ["SOLD_OUT", "BURST", "TIME_UP"].includes(live.redisState);
  const timeLeftMs = live ? Math.max(0, live.closeAtMs - live.nowServerMs) : 0;
  const consumed =
    meta && live ? Math.max(0, meta.initialStock - live.remaining) : 0;
  const pct =
    meta && meta.initialStock > 0
      ? (consumed / meta.initialStock) * 100
      : 0;

  // 최근 HIT / LAST_HIT 필터
  const hits = audit.filter((r) => r.status === "HIT" || r.status === "LAST_HIT");
  const lastHit = audit.find((r) => r.status === "LAST_HIT");

  return (
    <Frame>
      {/* 헤더 */}
      <header className="mb-4 flex items-baseline">
        <a
          href="/admin/events"
          className="text-sm text-zinc-500 hover:underline mr-3"
        >
          ← list
        </a>
        <h1 className="text-xl font-bold">{meta?.title ?? code}</h1>
        <span className="ml-2 text-xs text-zinc-500">{code}</span>
        <span className="ml-auto text-xs text-zinc-500">
          admin: {user?.nickname}
        </span>
      </header>

      {/* 상태 박스 */}
      <section className="grid grid-cols-4 gap-3 mb-4">
        <StatBox
          label="DB state"
          value={meta?.state ?? "-"}
          tone={
            meta?.state === "LIVE"
              ? "emerald"
              : meta?.state === "READY"
                ? "sky"
                : "zinc"
          }
        />
        <StatBox
          label="Redis state"
          value={live?.redisState ?? "-"}
          tone={
            live?.redisState === "LIVE"
              ? "emerald"
              : live?.redisState === "SOLD_OUT"
                ? "rose"
                : "zinc"
          }
        />
        <StatBox
          label="남은 재고"
          value={
            live && meta
              ? `${live.remaining.toLocaleString()} / ${meta.initialStock.toLocaleString()}`
              : "-"
          }
        />
        <StatBox
          label={soldOut ? "이벤트 종료" : "남은 시간"}
          value={
            soldOut
              ? live?.redisState ?? "-"
              : timeLeftMs > 0
                ? formatTime(timeLeftMs)
                : "-"
          }
          tone={soldOut ? "rose" : "amber"}
        />
      </section>

      {/* 진행률 바 */}
      {meta && live && (
        <section className="mb-4 p-3 bg-zinc-900 rounded">
          <div className="flex justify-between text-xs text-zinc-400 mb-2">
            <span>소모율</span>
            <span>
              성공 순번 <b className="text-zinc-200">{live.successSeq}</b> · 소모{" "}
              <b className="text-zinc-200">{consumed}</b>
            </span>
          </div>
          <div className="relative h-4 bg-zinc-800 rounded overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-rose-500 transition-[width] duration-500"
              style={{ width: `${pct.toFixed(1)}%` }}
            />
          </div>
        </section>
      )}

      {/* 시각 정보 */}
      {meta && (
        <section className="mb-4 p-3 bg-zinc-900 rounded text-xs text-zinc-400 grid grid-cols-3 gap-3">
          <TimeCell label="openAt" iso={meta.openAt} />
          <TimeCell label="closeAt" iso={meta.closeAt} />
          <TimeCell label="announceAt" iso={meta.announceAt} />
        </section>
      )}

      {/* 마지막 성공자 + 승자 */}
      {lastHit && (
        <section className="mb-4 p-3 bg-emerald-900/20 border border-emerald-500/40 rounded">
          <div className="text-xs text-emerald-300 mb-1">
            🏆 마지막 성공자 (LAST_HIT)
          </div>
          <div>
            <b>{lastHit.nickname}</b>{" "}
            <span className="text-zinc-500 text-xs">
              (userId={lastHit.userId})
            </span>{" "}
            — {new Date(lastHit.serverTs).toLocaleTimeString()}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            requestId: {lastHit.requestId}
          </div>
        </section>
      )}

      {/* 최근 히트 로그 */}
      <section className="mb-4 p-3 bg-zinc-900 rounded">
        <div className="flex items-center mb-2">
          <h2 className="text-zinc-400">최근 smash 로그 (50건)</h2>
          <span className="ml-auto text-xs text-zinc-500">
            총 HIT: {hits.length} · REJECT:{" "}
            {audit.length - hits.length}
          </span>
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-xs">
            <thead className="text-zinc-500 sticky top-0 bg-zinc-900">
              <tr>
                <th className="text-left py-1">time</th>
                <th className="text-left py-1">user</th>
                <th className="text-left py-1">status</th>
                <th className="text-left py-1">reject</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((r) => (
                <tr
                  key={r.id}
                  className={`border-t border-zinc-800 ${
                    r.status === "LAST_HIT"
                      ? "bg-emerald-900/20"
                      : r.status === "HIT"
                        ? ""
                        : "text-zinc-500"
                  }`}
                >
                  <td className="py-1 font-mono">
                    {new Date(r.serverTs).toISOString().slice(11, 23)}
                  </td>
                  <td className="py-1">
                    {r.nickname}{" "}
                    <span className="text-zinc-600">#{r.userId}</span>
                  </td>
                  <td
                    className={`py-1 ${
                      r.status === "LAST_HIT"
                        ? "text-emerald-300"
                        : r.status === "HIT"
                          ? "text-sky-400"
                          : ""
                    }`}
                  >
                    {r.status}
                  </td>
                  <td className="py-1 text-zinc-500">
                    {r.rejectReason ?? ""}
                  </td>
                </tr>
              ))}
              {audit.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-zinc-600">
                    (아직 요청 없음 — LIVE 시작 후 표시)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex gap-2 text-xs">
        <a
          href={`/play/${code}`}
          className="px-3 py-1 bg-emerald-600 rounded"
        >
          플레이로 이동
        </a>
        <a
          href={`/live-demo?code=${code}`}
          className="px-3 py-1 bg-sky-600 rounded"
        >
          디버그 페이지
        </a>
      </div>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-sm">
      <div className="max-w-5xl mx-auto">{children}</div>
    </main>
  );
}

function StatBox({
  label,
  value,
  tone = "zinc",
}: {
  label: string;
  value: string | number;
  tone?: "zinc" | "emerald" | "sky" | "rose" | "amber";
}) {
  const toneMap = {
    zinc: "text-zinc-200",
    emerald: "text-emerald-400",
    sky: "text-sky-400",
    rose: "text-rose-400",
    amber: "text-amber-400",
  };
  return (
    <div className="p-3 bg-zinc-900 rounded">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className={`text-lg font-bold ${toneMap[tone]}`}>{value}</div>
    </div>
  );
}

function TimeCell({ label, iso }: { label: string; iso: string }) {
  return (
    <div>
      <div className="text-zinc-500">{label}</div>
      <div className="text-zinc-200">
        {new Date(iso).toLocaleString()}
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}분 ${r}초`;
}

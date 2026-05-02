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
        <p className="text-[#5A5A5A]">loading…</p>
      </Frame>
    );
  if (!isAuthenticated)
    return (
      <Frame>
        <p className="mb-4 text-[#5A5A5A]">어드민 로그인이 필요합니다.</p>
        <button
          onClick={() => login()}
          className="px-4 py-2 bg-[#FEE500] text-black rounded-full font-bold shadow-sm hover:brightness-95 transition"
        >
          🔔 카카오 로그인
        </button>
      </Frame>
    );
  if (error)
    return (
      <Frame>
        <p className="text-[#A8332A]">{error}</p>
      </Frame>
    );

  const soldOut =
    live && ["SOLD_OUT", "BURST", "TIME_UP"].includes(live.redisState);
  const timeLeftMs = live ? Math.max(0, live.closeAtMs - live.nowServerMs) : 0;
  const consumed =
    meta && live ? Math.max(0, meta.initialStock - live.remaining) : 0;
  const pct =
    meta && meta.initialStock > 0 ? (consumed / meta.initialStock) * 100 : 0;

  const hits = audit.filter((r) => r.status === "HIT" || r.status === "LAST_HIT");
  const lastHit = audit.find((r) => r.status === "LAST_HIT");

  return (
    <Frame>
      {/* 헤더 */}
      <header className="mb-6 flex items-baseline gap-3">
        <a
          href="/admin/events"
          className="text-sm text-[#5A5A5A] hover:text-[#3D9E94] hover:underline"
        >
          ← 목록
        </a>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {meta?.title ?? code}
        </h1>
        <code className="text-xs text-[#9A8E72] font-mono">{code}</code>
        <span className="ml-auto text-xs text-[#5A5A5A]">
          admin: <strong>{user?.nickname}</strong>
        </span>
      </header>

      {/* 상태 박스 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatBox
          label="DB state"
          value={meta?.state ?? "-"}
          tone={
            meta?.state === "LIVE"
              ? "mint"
              : meta?.state === "READY"
                ? "yellow"
                : "muted"
          }
        />
        <StatBox
          label="Redis state"
          value={live?.redisState ?? "-"}
          tone={
            live?.redisState === "LIVE"
              ? "mint"
              : live?.redisState === "SOLD_OUT" ||
                  live?.redisState === "BURST" ||
                  live?.redisState === "TIME_UP"
                ? "red"
                : "muted"
          }
        />
        <StatBox
          label="남은 재고"
          value={
            live && meta
              ? `${live.remaining.toLocaleString()} / ${meta.initialStock.toLocaleString()}`
              : "-"
          }
          tone={live && live.remaining === 0 ? "red" : "default"}
        />
        <StatBox
          label={soldOut ? "이벤트 종료" : "남은 시간"}
          value={
            soldOut
              ? (live?.redisState ?? "-")
              : timeLeftMs > 0
                ? formatTime(timeLeftMs)
                : "-"
          }
          tone={soldOut ? "red" : "amber"}
        />
      </section>

      {/* 진행률 바 */}
      {meta && live && (
        <section className="mb-5 p-4 bg-white border border-[#E8E2D4] rounded-2xl shadow-sm">
          <div className="flex justify-between text-xs text-[#9A8E72] mb-2">
            <span className="uppercase tracking-wider font-bold">📊 소모율</span>
            <span>
              성공 순번{" "}
              <strong className="text-[#1C1917]">{live.successSeq}</strong>{" "}
              · 소모{" "}
              <strong className="text-[#1C1917]">{consumed}</strong> /{" "}
              {meta.initialStock}
            </span>
          </div>
          <div className="relative h-4 bg-[#F4EFE2] rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#F4B860] to-[#D4443A] transition-[width] duration-500"
              style={{ width: `${pct.toFixed(1)}%` }}
            />
          </div>
        </section>
      )}

      {/* 시각 정보 */}
      {meta && (
        <section className="mb-5 p-4 bg-white border border-[#E8E2D4] rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
          <TimeCell label="openAt" iso={meta.openAt} />
          <TimeCell label="closeAt" iso={meta.closeAt} />
          <TimeCell label="announceAt" iso={meta.announceAt} />
        </section>
      )}

      {/* 마지막 성공자 (당첨자) */}
      {lastHit && (
        <section className="mb-5 p-4 bg-[#EAF7F4] border border-[#3D9E94] rounded-2xl shadow-sm">
          <div className="text-xs text-[#3D9E94] mb-1 font-bold uppercase tracking-wider">
            🏆 마지막 성공자 (당첨자)
          </div>
          <div className="text-base">
            <strong>{lastHit.nickname}</strong>{" "}
            <code className="text-[#5A5A5A] text-xs font-mono">
              (userId={lastHit.userId})
            </code>
            <span className="text-[#5A5A5A] mx-2">·</span>
            <span className="text-[#5A5A5A] font-mono text-sm">
              {new Date(lastHit.serverTs).toLocaleTimeString("ko-KR")}
            </span>
          </div>
          <div className="text-xs text-[#9A8E72] mt-1 font-mono">
            requestId: {lastHit.requestId}
          </div>
        </section>
      )}

      {/* 최근 히트 로그 */}
      <section className="mb-5 p-4 bg-white border border-[#E8E2D4] rounded-2xl shadow-sm">
        <div className="flex items-center mb-3">
          <h2 className="text-xs font-bold text-[#9A8E72] uppercase tracking-wider">
            📜 최근 smash 로그 (50건)
          </h2>
          <span className="ml-auto text-xs text-[#5A5A5A]">
            HIT <strong className="text-[#3D9E94]">{hits.length}</strong> ·
            REJECT{" "}
            <strong className="text-[#D4443A]">
              {audit.length - hits.length}
            </strong>
          </span>
        </div>
        <div className="max-h-[420px] overflow-auto rounded-lg border border-[#F0EBDF]">
          <table className="w-full text-xs">
            <thead className="text-[#9A8E72] sticky top-0 bg-[#FAF7EE] uppercase tracking-wider">
              <tr>
                <th className="text-left py-2 px-2">time</th>
                <th className="text-left py-2 px-2">user</th>
                <th className="text-left py-2 px-2">status</th>
                <th className="text-left py-2 px-2">reject</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((r) => (
                <tr
                  key={r.id}
                  className={`border-t border-[#F0EBDF] ${
                    r.status === "LAST_HIT"
                      ? "bg-[#EAF7F4]"
                      : r.status === "HIT"
                        ? "bg-white"
                        : "bg-[#FAF7EE] text-[#9A8E72]"
                  }`}
                >
                  <td className="py-1.5 px-2 font-mono">
                    {new Date(r.serverTs).toISOString().slice(11, 23)}
                  </td>
                  <td className="py-1.5 px-2">
                    <strong>{r.nickname}</strong>{" "}
                    <code className="text-[#9A8E72] font-mono">
                      #{r.userId}
                    </code>
                  </td>
                  <td className="py-1.5 px-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full font-bold ${
                        r.status === "LAST_HIT"
                          ? "bg-[#3D9E94] text-white"
                          : r.status === "HIT"
                            ? "bg-[#FEE500] text-black"
                            : "bg-[#E8E2D4] text-[#5A5A5A]"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-[#A8332A] font-mono">
                    {r.rejectReason ?? ""}
                  </td>
                </tr>
              ))}
              {audit.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-6 text-[#9A8E72]"
                  >
                    (아직 요청 없음 — LIVE 시작 후 표시)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 text-xs">
        <a
          href={`/play/${code}`}
          className="px-4 py-2 bg-[#3D9E94] text-white rounded-full font-bold shadow-sm hover:brightness-95 transition"
        >
          🎮 플레이로 이동
        </a>
        <a
          href={`/live-demo?code=${code}`}
          className="px-4 py-2 bg-[#1C1917] text-white rounded-full font-bold hover:bg-[#3F3A33] transition"
        >
          🛠 디버그 페이지
        </a>
      </div>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#FFFDF7] text-[#1C1917] p-6">
      <div className="max-w-5xl mx-auto">{children}</div>
    </main>
  );
}

function StatBox({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "muted" | "mint" | "yellow" | "red" | "amber";
}) {
  const toneMap = {
    default: "text-[#1C1917]",
    muted: "text-[#9A8E72]",
    mint: "text-[#3D9E94]",
    yellow: "text-[#B58B00]",
    red: "text-[#D4443A]",
    amber: "text-[#D17B00]",
  };
  return (
    <div className="p-3 bg-white border border-[#E8E2D4] rounded-2xl shadow-sm">
      <div className="text-xs text-[#9A8E72] mb-1 uppercase tracking-wider font-medium">
        {label}
      </div>
      <div className={`text-lg font-bold ${toneMap[tone]} font-mono`}>
        {value}
      </div>
    </div>
  );
}

function TimeCell({ label, iso }: { label: string; iso: string }) {
  return (
    <div>
      <div className="text-xs text-[#9A8E72] uppercase tracking-wider font-medium mb-1">
        {label}
      </div>
      <div className="text-[#1C1917] font-mono text-sm">
        {new Date(iso).toLocaleString("ko-KR", {
          timeZone: "Asia/Seoul",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })}
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

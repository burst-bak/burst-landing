/**
 * ============================================================================
 * /admin/events — 어드민 이벤트 CRUD (로컬·개발 전용)
 * ============================================================================
 *
 * 🔐 어드민(화이트리스트 유저) 세션 필요. 403 시 로그인·권한 안내.
 *
 * 🎯 기능
 *   - 예약 이벤트 폼 (datetime-local 로 openAt 지정)
 *   - 이벤트 리스트 (state / openAt / 재고)
 *   - READY 이벤트: 시각 변경(+30s/+1m/+5m/임의 시각) + 삭제
 *
 * 🚨 운영 환경에선 이 라우트를 제거하거나 별도 어드민 도메인으로 분리.
 * ============================================================================
 */

"use client";

import { useAuth } from "@/hooks/useAuth";
import { useCallback, useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8081";

interface EventRow {
  id: number;
  eventCode: string;
  title: string;
  openAt: string;
  closeAt: string;
  announceAt: string;
  durationMs: number;
  initialStock: number;
  prizeAmountKrw: number;
  state: string;
  terminalState: string | null;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowLocalInput(offsetSec: number): string {
  const d = new Date(Date.now() + offsetSec * 1000);
  return toLocalInput(d.toISOString());
}

function formatKst(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function AdminEventsPage() {
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const [rows, setRows] = useState<EventRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{
    code: string;
    openAtLocal: string;
  } | null>(null);

  const [form, setForm] = useState({
    eventCode: "",
    title: "박터트리기 Vol.1",
    openAtLocal: nowLocalInput(180),
    durationMs: 10000,
    initialStock: 10,
    prizeAmountKrw: 100000,
    announceDelaySec: 86400,
  });

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/v1/admin/events`, {
        credentials: "include",
      });
      if (res.status === 403) {
        setError("어드민 권한 없음 (user-ids 화이트리스트 확인)");
        return;
      }
      if (!res.ok) {
        setError(`list 실패: ${res.status}`);
        return;
      }
      const data: EventRow[] = await res.json();
      setRows(data);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refresh();
  }, [isAuthenticated, refresh]);

  const onCreate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const openAtISO = new Date(form.openAtLocal).toISOString();
      const body = {
        eventCode: form.eventCode,
        title: form.title,
        openAt: openAtISO,
        durationMs: Number(form.durationMs),
        initialStock: Number(form.initialStock),
        prizeAmountKrw: Number(form.prizeAmountKrw),
        announceDelaySec: Number(form.announceDelaySec),
      };
      const res = await fetch(`${BASE}/api/v1/admin/events`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        setError(`create 실패 ${res.status}: ${txt}`);
      } else {
        await refresh();
        setForm((f) => ({
          ...f,
          eventCode: "",
          openAtLocal: nowLocalInput(180),
        }));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [form, refresh]);

  const onDelete = useCallback(
    async (code: string) => {
      if (!confirm(`${code} 삭제?`)) return;
      const res = await fetch(`${BASE}/api/v1/admin/events/${code}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) setError(`delete 실패 ${res.status}`);
      else await refresh();
    },
    [refresh],
  );

  const reschedule = useCallback(
    async (code: string, openAtISO: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(
          `${BASE}/api/v1/admin/events/${code}/schedule`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ openAt: openAtISO }),
          },
        );
        if (!res.ok) {
          const txt = await res.text();
          setError(`reschedule 실패 ${res.status}: ${txt}`);
        } else {
          setEditing(null);
          await refresh();
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const onQuickReschedule = useCallback(
    (code: string, offsetSec: number) => {
      const iso = new Date(Date.now() + offsetSec * 1000).toISOString();
      void reschedule(code, iso);
    },
    [reschedule],
  );

  const onCustomReschedule = useCallback(
    (code: string, openAtLocal: string) => {
      const iso = new Date(openAtLocal).toISOString();
      void reschedule(code, iso);
    },
    [reschedule],
  );

  // ─── 게이트 ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#FFFDF7] text-[#1C1917] p-6">
        <p className="text-[#5A5A5A]">loading…</p>
      </main>
    );
  }
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#FFFDF7] text-[#1C1917] p-6">
        <div className="max-w-2xl mx-auto mt-12">
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">
            🛠 admin/events
          </h1>
          <p className="text-[#5A5A5A] mb-6">
            어드민 전용 페이지입니다. 카카오 로그인 후 화이트리스트에 등록된
            계정만 접근할 수 있습니다.
          </p>
          <button
            onClick={() => login()}
            className="px-4 py-2 bg-[#FEE500] text-black rounded-full font-bold shadow-sm hover:brightness-95 transition"
          >
            🔔 카카오 로그인
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFDF7] text-[#1C1917] p-6">
      <header className="max-w-5xl mx-auto mb-6 flex items-end gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            🛠 admin/events
          </h1>
          <p className="text-[#5A5A5A] mt-1">이벤트 예약·시각변경·삭제</p>
        </div>
        <span className="ml-auto text-sm text-[#5A5A5A]">
          ✅ <strong>{user?.nickname}</strong>{" "}
          <code className="text-[#3D9E94] font-mono">(id={user?.id})</code>
        </span>
        <button
          onClick={async () => {
            const { logout } = await import("@/lib/api/burst-api");
            await logout();
            window.location.href = "/admin/events";
          }}
          className="px-3 py-1.5 bg-[#1C1917] text-white rounded-full text-xs font-medium hover:bg-[#3F3A33] transition"
        >
          로그아웃
        </button>
      </header>

      {error && (
        <div className="max-w-5xl mx-auto mb-4 p-4 bg-[#FFF1EE] border border-[#D4443A] text-[#A8332A] rounded-xl">
          {error}
        </div>
      )}

      {/* Create form */}
      <section className="max-w-5xl mx-auto mb-5 p-5 bg-white border border-[#E8E2D4] rounded-2xl shadow-sm">
        <h2 className="text-xs font-bold text-[#9A8E72] uppercase tracking-wider mb-4">
          ➕ 예약 이벤트 생성
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="eventCode">
            <input
              className="bg-[#F4EFE2] border border-[#E8E2D4] focus:border-[#3D9E94] focus:outline-none px-3 py-1.5 rounded-lg w-full font-mono"
              value={form.eventCode}
              onChange={(e) => setForm({ ...form, eventCode: e.target.value })}
              placeholder="vol-2, demo-0505"
            />
          </Field>
          <Field label="title">
            <input
              className="bg-[#F4EFE2] border border-[#E8E2D4] focus:border-[#3D9E94] focus:outline-none px-3 py-1.5 rounded-lg w-full"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field label="openAt (로컬 시각)">
            <input
              type="datetime-local"
              className="bg-[#F4EFE2] border border-[#E8E2D4] focus:border-[#3D9E94] focus:outline-none px-3 py-1.5 rounded-lg w-full font-mono"
              value={form.openAtLocal}
              onChange={(e) =>
                setForm({ ...form, openAtLocal: e.target.value })
              }
            />
          </Field>
          <Field label="duration (ms)">
            <input
              type="number"
              className="bg-[#F4EFE2] border border-[#E8E2D4] focus:border-[#3D9E94] focus:outline-none px-3 py-1.5 rounded-lg w-full font-mono"
              value={form.durationMs}
              onChange={(e) =>
                setForm({ ...form, durationMs: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="initialStock">
            <input
              type="number"
              className="bg-[#F4EFE2] border border-[#E8E2D4] focus:border-[#3D9E94] focus:outline-none px-3 py-1.5 rounded-lg w-full font-mono"
              value={form.initialStock}
              onChange={(e) =>
                setForm({ ...form, initialStock: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="prizeAmountKrw">
            <input
              type="number"
              className="bg-[#F4EFE2] border border-[#E8E2D4] focus:border-[#3D9E94] focus:outline-none px-3 py-1.5 rounded-lg w-full font-mono"
              value={form.prizeAmountKrw}
              onChange={(e) =>
                setForm({
                  ...form,
                  prizeAmountKrw: Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="announceDelay (초)">
            <input
              type="number"
              className="bg-[#F4EFE2] border border-[#E8E2D4] focus:border-[#3D9E94] focus:outline-none px-3 py-1.5 rounded-lg w-full font-mono"
              value={form.announceDelaySec}
              onChange={(e) =>
                setForm({
                  ...form,
                  announceDelaySec: Number(e.target.value),
                })
              }
            />
          </Field>
          <div className="flex items-end">
            <button
              onClick={onCreate}
              disabled={busy || !form.eventCode}
              className="px-5 py-2 bg-[#3D9E94] text-white rounded-full font-bold shadow-sm hover:brightness-95 disabled:bg-[#C8C0AE] disabled:cursor-not-allowed transition"
            >
              {busy ? "..." : "생성"}
            </button>
          </div>
        </div>
      </section>

      {/* List */}
      <section className="max-w-5xl mx-auto p-5 bg-white border border-[#E8E2D4] rounded-2xl shadow-sm">
        <div className="flex items-center mb-4">
          <h2 className="text-xs font-bold text-[#9A8E72] uppercase tracking-wider">
            📋 이벤트 리스트
          </h2>
          <button
            onClick={refresh}
            className="ml-auto px-3 py-1.5 bg-white border border-[#E8E2D4] rounded-full text-xs font-medium hover:bg-[#F4EFE2] transition"
          >
            새로고침
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-[#9A8E72] uppercase">
              <tr>
                <th className="text-left py-2 px-2">code</th>
                <th className="text-left py-2 px-2">state</th>
                <th className="text-left py-2 px-2">openAt (KST)</th>
                <th className="text-right py-2 px-2">stock</th>
                <th className="text-right py-2 px-2">prize</th>
                <th className="text-right py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isReady = r.state === "READY";
                const isLive = r.state === "LIVE";
                const isEditing = editing?.code === r.eventCode;
                return (
                  <>
                    <tr
                      key={r.id}
                      className="border-t border-[#F0EBDF] hover:bg-[#FAF7EE]"
                    >
                      <td className="py-2 px-2">
                        <a
                          href={`/admin/events/${r.eventCode}`}
                          className="text-[#3D9E94] font-bold hover:underline font-mono"
                        >
                          {r.eventCode}
                        </a>
                      </td>
                      <td className="py-2 px-2">
                        <a
                          href={`/admin/events/${r.eventCode}`}
                          title="상세 (재고·감사로그·당첨자) 보기"
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold hover:brightness-95 transition cursor-pointer ${
                            isLive
                              ? "bg-[#3D9E94] text-white"
                              : isReady
                                ? "bg-[#FEE500] text-black"
                                : "bg-[#E8E2D4] text-[#5A5A5A]"
                          }`}
                        >
                          {r.state}
                          {r.terminalState && ` (${r.terminalState})`} →
                        </a>
                      </td>
                      <td className="py-2 px-2 font-mono text-xs">
                        {formatKst(r.openAt)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        {r.initialStock.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        ₩{r.prizeAmountKrw.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        {isReady && (
                          <button
                            onClick={() =>
                              setEditing(
                                isEditing
                                  ? null
                                  : {
                                      code: r.eventCode,
                                      openAtLocal: toLocalInput(r.openAt),
                                    },
                              )
                            }
                            className="px-3 py-1 bg-[#3D9E94] text-white rounded-full text-xs font-bold hover:brightness-95 transition"
                          >
                            ⏰ 시각 변경
                          </button>
                        )}
                        <a
                          href={`/play/${r.eventCode}`}
                          className="ml-2 px-3 py-1 bg-[#1C1917] text-white rounded-full text-xs font-bold inline-block hover:bg-[#3F3A33] transition"
                        >
                          플레이
                        </a>
                        {isReady && (
                          <button
                            onClick={() => onDelete(r.eventCode)}
                            className="ml-2 px-3 py-1 bg-[#D4443A] text-white rounded-full text-xs font-bold hover:brightness-95 transition"
                          >
                            삭제
                          </button>
                        )}
                      </td>
                    </tr>
                    {isEditing && (
                      <tr className="bg-[#FAF7EE]">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-[#9A8E72] uppercase tracking-wider mr-2">
                              빠른 시작 →
                            </span>
                            <button
                              disabled={busy}
                              onClick={() =>
                                onQuickReschedule(r.eventCode, 30)
                              }
                              className="px-3 py-1.5 bg-white border border-[#3D9E94] text-[#3D9E94] rounded-full text-xs font-bold hover:bg-[#3D9E94] hover:text-white transition"
                            >
                              +30초
                            </button>
                            <button
                              disabled={busy}
                              onClick={() =>
                                onQuickReschedule(r.eventCode, 60)
                              }
                              className="px-3 py-1.5 bg-white border border-[#3D9E94] text-[#3D9E94] rounded-full text-xs font-bold hover:bg-[#3D9E94] hover:text-white transition"
                            >
                              +1분
                            </button>
                            <button
                              disabled={busy}
                              onClick={() =>
                                onQuickReschedule(r.eventCode, 300)
                              }
                              className="px-3 py-1.5 bg-white border border-[#3D9E94] text-[#3D9E94] rounded-full text-xs font-bold hover:bg-[#3D9E94] hover:text-white transition"
                            >
                              +5분
                            </button>
                            <span className="mx-3 text-[#9A8E72]">|</span>
                            <span className="text-xs text-[#9A8E72] uppercase tracking-wider">
                              임의 시각 →
                            </span>
                            <input
                              type="datetime-local"
                              value={editing.openAtLocal}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  openAtLocal: e.target.value,
                                })
                              }
                              className="bg-white border border-[#E8E2D4] focus:border-[#3D9E94] focus:outline-none px-3 py-1.5 rounded-lg font-mono text-sm"
                            />
                            <button
                              disabled={busy}
                              onClick={() =>
                                onCustomReschedule(
                                  r.eventCode,
                                  editing.openAtLocal,
                                )
                              }
                              className="px-4 py-1.5 bg-[#3D9E94] text-white rounded-full text-xs font-bold hover:brightness-95 transition"
                            >
                              적용
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="px-3 py-1.5 bg-white border border-[#E8E2D4] rounded-full text-xs font-medium hover:bg-[#F4EFE2] transition"
                            >
                              닫기
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-[#9A8E72]"
                  >
                    (비어있음)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs text-[#9A8E72] mb-1 font-medium">{label}</div>
      {children}
    </label>
  );
}

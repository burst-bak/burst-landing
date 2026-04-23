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
 *   - READY 상태 이벤트만 삭제 버튼
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

export default function AdminEventsPage() {
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const [rows, setRows] = useState<EventRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    eventCode: "",
    title: "박터트리기 Vol.1",
    openAtLocal: nowLocalInput(180), // 기본 현재+3분
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
      // datetime-local → ISO with timezone. new Date(local) 은 로컬 TZ 로 해석 → toISOString() 은 UTC.
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

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-sm">
      <h1 className="text-xl mb-4">/admin/events — 이벤트 관리</h1>

      {/* Auth */}
      <section className="mb-4 p-3 bg-zinc-900 rounded flex items-center gap-3">
        {isLoading ? (
          <span>loading...</span>
        ) : isAuthenticated ? (
          <span>
            ✅ {user?.nickname}{" "}
            <span className="text-zinc-500">(id={user?.id})</span>
          </span>
        ) : (
          <>
            <span>⛔ 비로그인</span>
            <button
              onClick={login}
              className="px-3 py-1 bg-yellow-400 text-black rounded"
            >
              카카오 로그인
            </button>
          </>
        )}
      </section>

      {error && (
        <div className="mb-4 p-3 bg-rose-900/40 border border-rose-500 rounded">
          {error}
        </div>
      )}

      {/* Create form */}
      <section className="mb-6 p-4 bg-zinc-900 rounded">
        <h2 className="text-base mb-3 text-zinc-400">예약 이벤트 생성</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="eventCode">
            <input
              className="bg-zinc-800 px-2 py-1 rounded w-full"
              value={form.eventCode}
              onChange={(e) =>
                setForm({ ...form, eventCode: e.target.value })
              }
              placeholder="vol-2, demo-0505"
            />
          </Field>
          <Field label="title">
            <input
              className="bg-zinc-800 px-2 py-1 rounded w-full"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field label="openAt (로컬 시각)">
            <input
              type="datetime-local"
              className="bg-zinc-800 px-2 py-1 rounded w-full"
              value={form.openAtLocal}
              onChange={(e) =>
                setForm({ ...form, openAtLocal: e.target.value })
              }
            />
          </Field>
          <Field label="duration (ms)">
            <input
              type="number"
              className="bg-zinc-800 px-2 py-1 rounded w-full"
              value={form.durationMs}
              onChange={(e) =>
                setForm({ ...form, durationMs: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="initialStock">
            <input
              type="number"
              className="bg-zinc-800 px-2 py-1 rounded w-full"
              value={form.initialStock}
              onChange={(e) =>
                setForm({ ...form, initialStock: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="prizeAmountKrw">
            <input
              type="number"
              className="bg-zinc-800 px-2 py-1 rounded w-full"
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
              className="bg-zinc-800 px-2 py-1 rounded w-full"
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
              className="px-4 py-2 bg-emerald-500 rounded disabled:bg-zinc-700"
            >
              {busy ? "..." : "생성"}
            </button>
          </div>
        </div>
      </section>

      {/* List */}
      <section className="p-4 bg-zinc-900 rounded">
        <div className="flex items-center mb-3">
          <h2 className="text-base text-zinc-400">이벤트 리스트</h2>
          <button
            onClick={refresh}
            className="ml-auto px-3 py-1 bg-zinc-700 rounded"
          >
            새로고침
          </button>
        </div>
        <table className="w-full text-xs">
          <thead className="text-zinc-400">
            <tr>
              <th className="text-left py-1">code</th>
              <th className="text-left py-1">state</th>
              <th className="text-left py-1">openAt</th>
              <th className="text-right py-1">stock</th>
              <th className="text-right py-1">prize</th>
              <th className="text-right py-1"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-zinc-800">
                <td className="py-1">{r.eventCode}</td>
                <td
                  className={`py-1 ${
                    r.state === "LIVE"
                      ? "text-emerald-400"
                      : r.state === "READY"
                        ? "text-sky-400"
                        : "text-zinc-500"
                  }`}
                >
                  {r.state}
                  {r.terminalState && ` (${r.terminalState})`}
                </td>
                <td className="py-1">
                  {new Date(r.openAt).toLocaleString()}
                </td>
                <td className="py-1 text-right">{r.initialStock}</td>
                <td className="py-1 text-right">
                  {r.prizeAmountKrw.toLocaleString()}
                </td>
                <td className="py-1 text-right">
                  {r.state === "READY" && (
                    <button
                      onClick={() => onDelete(r.eventCode)}
                      className="px-2 py-0.5 bg-rose-500 rounded text-xs"
                    >
                      삭제
                    </button>
                  )}
                  <a
                    href={`/play/${r.eventCode}`}
                    className="ml-2 px-2 py-0.5 bg-emerald-600 rounded text-xs inline-block"
                  >
                    플레이
                  </a>
                  <a
                    href={`/live-demo?code=${r.eventCode}`}
                    className="ml-2 px-2 py-0.5 bg-sky-600 rounded text-xs inline-block"
                  >
                    디버그
                  </a>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-4 text-zinc-500">
                  (비어있음)
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      {children}
    </label>
  );
}

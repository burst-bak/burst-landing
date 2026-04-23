/**
 * ============================================================================
 * /my/claims — 내 당첨 현황 + 본인확인 폼
 * ============================================================================
 *
 * 🎯 상태별 UX
 *   PENDING_ANNOUNCEMENT — "결과 확인 중, 발표까지 X시간 Y분"
 *   CLAIM_REQUIRED       — 본인확인 폼 노출 (실명·주민번호앞6·은행·계좌)
 *   UNDER_REVIEW         — "운영자 검토 중 (영업일 N일 이내 지급)"
 *   APPROVED             — "✅ N원 지급 완료 (N월 N일)"
 *   REJECTED             — "거절: <사유>" + CS 안내
 *
 * 🔐 GET /api/v1/me/claims  — 로그인 필요
 * 🔐 POST /api/v1/events/{code}/claim  — 당첨자 본인만 허용
 * ============================================================================
 */

"use client";

import { useAuth } from "@/hooks/useAuth";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8081";

type ClaimStatus =
  | "PENDING_ANNOUNCEMENT"
  | "CLAIM_REQUIRED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

interface ClaimItem {
  eventCode: string;
  title: string;
  prizeAmountKrw: number;
  terminalState: string;
  announceAt: string;
  status: ClaimStatus;
  submittedAt: string | null;
  reviewDecision: "PENDING" | "APPROVED" | "REJECTED" | null;
  payoutAmountKrw: number | null;
  paidAt: string | null;
}

export default function MyClaimsPage() {
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const [items, setItems] = useState<ClaimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/v1/me/claims`, {
        credentials: "include",
      });
      if (res.status === 401 || res.status === 302) {
        setError("로그인이 필요합니다");
        return;
      }
      if (!res.ok) {
        setError(`조회 실패: ${res.status}`);
        return;
      }
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refresh();
  }, [isAuthenticated, refresh]);

  if (isLoading) {
    return <Frame>loading...</Frame>;
  }
  if (!isAuthenticated) {
    return (
      <Frame>
        <p className="mb-3">로그인하면 당첨 내역을 확인할 수 있습니다.</p>
        <button
          onClick={login}
          className="px-4 py-2 bg-yellow-400 text-black rounded font-bold"
        >
          카카오 로그인
        </button>
      </Frame>
    );
  }

  return (
    <Frame>
      <header className="mb-4 flex items-center">
        <div>
          <h1 className="text-xl font-bold">내 당첨 현황</h1>
          <p className="text-sm text-zinc-400">
            {user?.nickname} 님 · userId={user?.id}
          </p>
        </div>
        <button
          onClick={refresh}
          className="ml-auto px-3 py-1 bg-zinc-700 rounded text-sm"
        >
          새로고침
        </button>
      </header>

      {error && (
        <div className="mb-4 p-3 bg-rose-900/40 border border-rose-500 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <p>loading...</p>
      ) : items.length === 0 ? (
        <p className="text-zinc-400">당첨 기록이 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((it) => (
            <ClaimCard
              key={it.eventCode}
              item={it}
              nowMs={nowMs}
              onDone={refresh}
            />
          ))}
        </ul>
      )}
    </Frame>
  );
}

// =====================================================================
// Claim Card — 상태별 분기
// =====================================================================
function ClaimCard({
  item,
  nowMs,
  onDone,
}: {
  item: ClaimItem;
  nowMs: number;
  onDone: () => void;
}) {
  return (
    <li className="p-4 bg-zinc-900 rounded border border-zinc-800">
      <div className="flex items-baseline mb-2">
        <h2 className="text-lg font-bold">{item.title}</h2>
        <span className="ml-2 text-xs text-zinc-500">{item.eventCode}</span>
        <span className="ml-auto text-sm font-bold text-amber-400">
          {item.prizeAmountKrw.toLocaleString()}원
        </span>
      </div>

      {item.status === "PENDING_ANNOUNCEMENT" && (
        <PendingPanel announceAt={item.announceAt} nowMs={nowMs} />
      )}
      {item.status === "CLAIM_REQUIRED" && (
        <ClaimForm eventCode={item.eventCode} onSubmitted={onDone} />
      )}
      {item.status === "UNDER_REVIEW" && (
        <div className="text-sm text-sky-400">
          ✅ 본인확인 제출 완료 — 운영자 검토 중입니다 (영업일 1~3일 이내 지급)
          <div className="text-xs text-zinc-500 mt-1">
            제출: {new Date(item.submittedAt!).toLocaleString()}
          </div>
        </div>
      )}
      {item.status === "APPROVED" && (
        <div className="text-emerald-400">
          <p>🎉 승인 완료 — {item.payoutAmountKrw?.toLocaleString()}원 지급</p>
          <p className="text-xs text-zinc-500 mt-1">
            지급일: {new Date(item.paidAt!).toLocaleString()}
          </p>
        </div>
      )}
      {item.status === "REJECTED" && (
        <div className="text-rose-400">
          거절되었습니다. 운영팀(support@burst.xxx)으로 문의해주세요.
        </div>
      )}
    </li>
  );
}

// =====================================================================
// Pending (announce_at 카운트다운)
// =====================================================================
function PendingPanel({
  announceAt,
  nowMs,
}: {
  announceAt: string;
  nowMs: number;
}) {
  const left = Math.max(0, Date.parse(announceAt) - nowMs);
  return (
    <div>
      <div className="text-sm text-zinc-400 mb-1">결과 확인 중</div>
      <div className="text-2xl font-mono">{formatCountdown(left)}</div>
      <div className="text-xs text-zinc-500 mt-1">
        발표: {new Date(announceAt).toLocaleString()}
      </div>
    </div>
  );
}

// =====================================================================
// Claim Form
// =====================================================================
function ClaimForm({
  eventCode,
  onSubmitted,
}: {
  eventCode: string;
  onSubmitted: () => void;
}) {
  const [realName, setRealName] = useState("");
  const [residentPrefix, setResidentPrefix] = useState("");
  const [bankName, setBankName] = useState("토스뱅크");
  const [accountNumber, setAccountNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      realName.trim().length >= 1 &&
      /^\d{6}$/.test(residentPrefix) &&
      bankName.trim().length >= 1 &&
      /^\d{8,20}$/.test(accountNumber)
    );
  }, [realName, residentPrefix, bankName, accountNumber]);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `${BASE}/api/v1/events/${eventCode}/claim`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            realName,
            residentPrefix,
            bankName,
            accountNumber,
          }),
        },
      );
      if (res.ok) {
        onSubmitted();
      } else {
        const t = await res.text();
        setError(`제출 실패 ${res.status}: ${t}`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [eventCode, realName, residentPrefix, bankName, accountNumber, onSubmitted]);

  return (
    <div className="space-y-3">
      <div className="p-3 bg-emerald-900/20 border border-emerald-500/50 rounded">
        <b className="text-emerald-400">🎉 당첨되셨습니다!</b>{" "}
        <span className="text-sm text-zinc-300">
          지급을 위해 본인확인 정보를 입력해주세요. 제출 정보는 AES-256 암호화로
          분리 저장되며, 세무처리·지급 외 용도로 사용되지 않습니다.
        </span>
      </div>

      {error && (
        <div className="p-2 bg-rose-900/40 border border-rose-500 rounded text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="실명">
          <input
            className="w-full bg-zinc-800 px-3 py-2 rounded"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            placeholder="홍길동"
            maxLength={32}
          />
        </Field>
        <Field label="주민등록번호 앞 6자리 (YYMMDD)">
          <input
            className="w-full bg-zinc-800 px-3 py-2 rounded font-mono"
            value={residentPrefix}
            onChange={(e) =>
              setResidentPrefix(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="YYMMDD"
            maxLength={6}
            inputMode="numeric"
          />
        </Field>
        <Field label="은행">
          <select
            className="w-full bg-zinc-800 px-3 py-2 rounded"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
          >
            {[
              "토스뱅크",
              "카카오뱅크",
              "케이뱅크",
              "신한",
              "국민",
              "우리",
              "하나",
              "농협",
              "기업",
              "새마을금고",
              "우체국",
              "기타",
            ].map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>
        <Field label="계좌번호 (숫자만)">
          <input
            className="w-full bg-zinc-800 px-3 py-2 rounded font-mono"
            value={accountNumber}
            onChange={(e) =>
              setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 20))
            }
            placeholder="10012345678"
            inputMode="numeric"
          />
        </Field>
      </div>

      <p className="text-xs text-zinc-500">
        ⚠️ 주민번호 뒷자리는 수집하지 않습니다. 입력한 정보는 AES-256 로 암호화되며,
        별도 테이블에 분리 저장됩니다.
      </p>

      <button
        onClick={submit}
        disabled={!canSubmit || busy}
        className={`px-4 py-2 rounded font-bold ${
          canSubmit && !busy
            ? "bg-emerald-500 text-white"
            : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
        }`}
      >
        {busy ? "제출 중..." : "본인확인 제출"}
      </button>
    </div>
  );
}

// =====================================================================
// 공통
// =====================================================================
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 max-w-3xl mx-auto">
      {children}
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
      <span className="text-xs text-zinc-400 block mb-1">{label}</span>
      {children}
    </label>
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "발표 직전...";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}시간 ${m}분 ${sec}초`;
  if (m > 0) return `${m}분 ${sec}초`;
  return `${sec}초`;
}

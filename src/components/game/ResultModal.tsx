"use client";

/**
 * ============================================================================
 * ResultModal — Toss / 인프런 스타일 결과 모달
 * ============================================================================
 *
 * 🎨 디자인 원칙 (2026-04-20 리뉴얼)
 *  - 과하지 않은 귀여움 (이모지 + 파스텔 배경 원)
 *  - 큰 radius (20~24px), 부드러운 그림자
 *  - 타이포 계층 명확 (타이틀·서브·부가 정보)
 *  - 주요 CTA 1개 (primary full-width), 보조는 작게 2개 side-by-side
 *  - 배경 딤 클릭 or X 버튼으로 닫기
 * ============================================================================
 */

import Button from "@/components/ui/Button";
import type { TerminalState } from "@/types/game";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { Confetti } from "./Confetti";

interface ResultModalProps {
  open: boolean;
  terminalState: TerminalState | null;
  isWinner: boolean;
  onClose: () => void;
}

export function ResultModal({
  open,
  terminalState,
  isWinner,
  onClose,
}: ResultModalProps) {
  // ESC 닫기 + 스크롤 잠금
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      window.addEventListener("keydown", handler);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const isBurst = terminalState === "BURST";

  return (
    <>
      {open && isBurst && <Confetti count={70} />}

      <AnimatePresence>
        {open && (
          <>
            {/* Dim overlay */}
            <motion.div
              key="result-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.45)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                zIndex: 60,
              }}
            />

            {/* Modal card */}
            <motion.div
              key="result-card"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "fixed",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
                zIndex: 61,
                pointerEvents: "none",
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  pointerEvents: "auto",
                  width: "100%",
                  maxWidth: 400,
                  background: "#FFFFFF",
                  borderRadius: 24,
                  padding: "28px 24px 24px",
                  boxShadow:
                    "0 24px 48px -12px rgba(15,23,42,0.25), 0 0 0 1px rgba(15,23,42,0.04)",
                  position: "relative",
                }}
              >
                {/* X 닫기 버튼 */}
                <button
                  onClick={onClose}
                  aria-label="닫기"
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: "#F4F4F5",
                    border: "none",
                    color: "#71717A",
                    fontSize: 18,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#E4E4E7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#F4F4F5";
                  }}
                >
                  ✕
                </button>

                {isBurst ? (
                  <SuccessBody isWinner={isWinner} onClose={onClose} />
                ) : (
                  <FailBody onClose={onClose} />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── 성공 ────────────────────────────────────────────────────────────

function SuccessBody({
  isWinner,
  onClose,
}: {
  isWinner: boolean;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        paddingTop: 8,
      }}
    >
      {/* Hero 아이콘 */}
      <div
        aria-hidden
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #FEE500 0%, #FFC700 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 40,
          boxShadow: "0 8px 20px -6px rgba(254,229,0,0.55)",
        }}
      >
        🎉
      </div>

      {/* 헤드라인 */}
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#1C1917",
            margin: 0,
          }}
        >
          박 터졌습니다!
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "#71717A",
            margin: "4px 0 0",
            fontWeight: 500,
          }}
        >
          모두가 힘을 모아 박을 깨뜨렸어요
        </p>
      </div>

      {/* 당첨자 안내 — Toss식 정보 카드 */}
      <div
        style={{
          width: "100%",
          background: isWinner ? "#F0FAF8" : "#F8FAFC",
          border: `1px solid ${isWinner ? "#B8E2DA" : "#E2E8F0"}`,
          borderRadius: 16,
          padding: "14px 16px",
          textAlign: "center",
          marginTop: 4,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: isWinner ? "#3D9E94" : "#334155",
          }}
        >
          {isWinner
            ? "🏆 마지막 한 방의 주인공"
            : "당첨자에게는 별도로 연락드립니다"}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#64748B",
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          {isWinner
            ? "운영자가 곧 개별적으로 연락드릴게요."
            : "추첨·상금 지급은 인스타·유튜브로 공개됩니다."}
        </div>
      </div>

      {/* 주 CTA */}
      <div style={{ width: "100%", marginTop: 6 }}>
        <Button variant="primary" fullWidth size="md" onClick={openKakaoChannel}>
          🔔 Vol.2 사전 알림 받기
        </Button>
      </div>

      {/* 보조 CTA — 2개 side-by-side */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          width: "100%",
        }}
      >
        <SubAction icon="📋" label="공유" onClick={shareLink} />
        <SubAction icon="🏠" label="닫기" onClick={onClose} />
      </div>
    </div>
  );
}

// ─── 실패 ────────────────────────────────────────────────────────────

function FailBody({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        paddingTop: 8,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "#F4F4F5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
        }}
      >
        🥹
      </div>

      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#1C1917",
            margin: 0,
          }}
        >
          상금이 부족했네...
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "#71717A",
            margin: "4px 0 0",
            fontWeight: 500,
          }}
        >
          더 큰 상금으로 돌아오겠습니다
        </p>
      </div>

      {/* 엔딩 크레딧 + Vol.2 티저 */}
      <div
        style={{
          width: "100%",
          background: "#FAFAF9",
          border: "1px solid #E4E4E7",
          borderRadius: 16,
          padding: "14px 16px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "#A1A1AA",
            letterSpacing: "0.1em",
            fontWeight: 500,
          }}
        >
          — Vol.1 끝 —
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#3F3F46",
            marginTop: 6,
            fontWeight: 600,
          }}
        >
          🎯 Vol.2로 돌아오겠습니다
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#71717A",
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          더 많은 사람이 모일수록<br />
          <span style={{ color: "#3F3F46", fontWeight: 600 }}>
            다음 Vol의 상금이 커집니다
          </span>
        </div>
      </div>

      <div style={{ width: "100%", marginTop: 2 }}>
        <Button variant="primary" fullWidth size="md" onClick={openKakaoChannel}>
          🔔 Vol.2 사전 알림 받기
        </Button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          width: "100%",
        }}
      >
        <SubAction icon="📋" label="친구 알리기" onClick={shareLink} />
        <SubAction icon="🏠" label="닫기" onClick={onClose} />
      </div>
    </div>
  );
}

// ─── 작은 보조 버튼 (side-by-side) ───────────────────────────────────

function SubAction({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "12px 10px",
        background: "#F8FAFC",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        fontSize: 13,
        fontWeight: 600,
        color: "#334155",
        cursor: "pointer",
        transition: "background 0.15s, transform 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#F1F5F9";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#F8FAFC";
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "scale(0.97)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ─── 공용 액션 ──────────────────────────────────────────────────────

function openKakaoChannel() {
  if (typeof window !== "undefined") {
    window.open("https://pf.kakao.com/", "_blank", "noopener,noreferrer");
  }
}

function shareLink() {
  if (typeof window === "undefined") return;
  const url = location.origin;
  if (navigator.share) {
    navigator
      .share({ title: "박 터트리기", text: "10초 딸깍으로 상금!", url })
      .catch(() => {});
  } else {
    navigator.clipboard?.writeText(url);
  }
}

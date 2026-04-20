"use client";

/**
 * ============================================================================
 * ResultModal — 종료 결과 오버레이 모달
 * ============================================================================
 *
 * 🎯 역할 (v2.1 재설계, 2026-04-20)
 *  - 페이지 전환 없이 게임 화면 위에 모달로 결과 노출
 *  - 실시간성 유지 (박·모래주머니는 메인에 계속 남음)
 *  - BURST 성공 / SOLD_OUT·TIME_UP 실패 두 가지 변형
 *
 * 📌 카피 원칙
 *  - 성공: "박 터졌습니다" vs "당첨자에게는 별도 연락" 분리 (v2.1 피드백 4)
 *  - 실패: TIME_UP / SOLD_OUT 동일 화면 (v2.1 확정: 이스터에그 문구 없음)
 *
 * 📌 CTA 우선순위
 *  1. Vol.2 사전 알림
 *  2. 링크 공유
 *  3. 닫기 (배경으로 돌아가기 — 박 계속 흔들림)
 * ============================================================================
 */

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type { TerminalState } from "@/types/game";
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
  const isBurst = terminalState === "BURST";

  return (
    <>
      {/* 성공 시에만 confetti, 모달 뒤에 뿌림 */}
      {open && isBurst && <Confetti count={70} />}

      <Modal open={open} onClose={onClose}>
        {isBurst ? (
          <SuccessBody isWinner={isWinner} onClose={onClose} />
        ) : (
          <FailBody onClose={onClose} />
        )}
      </Modal>
    </>
  );
}

// ─── 성공 ───────────────────────────────────────────────────────────

function SuccessBody({
  isWinner,
  onClose,
}: {
  isWinner: boolean;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div style={{ fontSize: 56, lineHeight: 1 }} aria-hidden>
        🎉
      </div>
      <h2
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "#1C1917",
          textAlign: "center",
        }}
      >
        박 터졌습니다!
      </h2>
      <p style={{ fontSize: 13, color: "#5A5A5A", textAlign: "center" }}>
        모두가 힘을 모아 박을 깨뜨렸어요
      </p>

      {/* 당첨자 안내 — "내가 당첨" 오해 방지 박스 */}
      <div
        style={{
          width: "100%",
          background: "#F0FAF8",
          border: "2px solid #D1E8E4",
          borderRadius: 14,
          padding: "14px 16px",
          textAlign: "center",
          marginTop: 4,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "#3D9E94" }}>
          {isWinner
            ? "🏆 마지막 한 방의 주인공, 바로 당신!"
            : "당첨자에게는 별도로 연락드립니다"}
        </div>
        <div style={{ fontSize: 12, color: "#5A5A5A", marginTop: 6 }}>
          {isWinner
            ? "운영자가 곧 개별적으로 연락드릴게요."
            : "공정한 추첨·상금 지급 과정은 인스타·유튜브로 공개됩니다."}
        </div>
      </div>

      <div className="w-full flex flex-col gap-2 mt-2">
        <Button variant="primary" fullWidth onClick={openKakaoChannel}>
          🔔 Vol.2 사전 알림 받기
        </Button>
        <Button variant="outline" fullWidth onClick={shareLink}>
          📋 링크 공유
        </Button>
        <Button variant="ghost" fullWidth onClick={onClose}>
          닫기
        </Button>
      </div>
    </div>
  );
}

// ─── 실패 ───────────────────────────────────────────────────────────

function FailBody({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <h2
        style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "#3F3F46",
          textAlign: "center",
        }}
      >
        상금이 부족했네...
      </h2>
      <p style={{ fontSize: 13, color: "#71717A", textAlign: "center" }}>
        더 큰 상금으로 돌아오겠습니다.
      </p>

      <div
        style={{
          fontSize: 12,
          color: "#A1A1AA",
          letterSpacing: "0.04em",
          textAlign: "center",
          marginTop: 4,
        }}
      >
        — Vol.1 끝. —
      </div>
      <div style={{ fontSize: 13, color: "#71717A", marginTop: -4 }}>
        🎯 Vol.2로 돌아오겠습니다.
      </div>

      <div
        style={{
          width: "100%",
          background: "#F4F4F5",
          border: "1px solid #E4E4E7",
          borderRadius: 12,
          padding: "12px 14px",
          textAlign: "center",
          fontSize: 12,
          color: "#71717A",
          lineHeight: 1.6,
          marginTop: 4,
        }}
      >
        더 많은 사람이 모일수록
        <br />
        <span style={{ color: "#3F3F46", fontWeight: 600 }}>
          다음 Vol의 박과 상금이 커집니다
        </span>
      </div>

      <div className="w-full flex flex-col gap-2 mt-2">
        <Button variant="primary" fullWidth onClick={openKakaoChannel}>
          🔔 Vol.2 사전 알림 받기
        </Button>
        <Button variant="outline" fullWidth onClick={shareLink}>
          📋 친구에게 알리기
        </Button>
        <Button variant="ghost" fullWidth onClick={onClose}>
          닫기
        </Button>
      </div>
    </div>
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

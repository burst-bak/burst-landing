"use client";

import { useState } from "react";
import { Button, Modal, Card, Badge, Toast, Skeleton, SkeletonText, SkeletonCard } from "@/components/ui";

export default function PreviewPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; type: "success" | "error" | "info"; msg: string }>({
    open: false, type: "info", msg: "",
  });

  const showToast = (type: "success" | "error" | "info", msg: string) => {
    setToast({ open: true, type, msg });
  };

  return (
    <div className="min-h-screen bg-white p-8 max-w-2xl mx-auto space-y-16">
      <h1 className="text-3xl font-extrabold text-[#1C1917]">
        Burst 디자인 시스템 프리뷰
      </h1>
      <p className="text-[#1C1917] text-sm">
        localhost:3000/preview — 프로덕션에는 포함되지 않음
      </p>

      {/* ═══════════════════════════
          BUTTONS
          ═══════════════════════════ */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-[#8FD4CE] border-b border-[#D1E8E4] pb-2">
          Button
        </h2>

        <div className="space-y-2">
          <p className="text-xs text-[#1C1917] font-semibold uppercase tracking-wide">Variant</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="kakao">Kakao</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[#1C1917] font-semibold uppercase tracking-wide">Size</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="md">Medium</Button>
            <Button variant="primary" size="lg">Large</Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[#1C1917] font-semibold uppercase tracking-wide">Full Width</p>
          <Button variant="primary" size="lg" fullWidth>Full Width Button</Button>
          <Button variant="kakao" size="lg" fullWidth>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.727 1.818 5.127 4.545 6.472-.2.745-.727 2.7-.832 3.118-.131.527.193.52.407.378.168-.111 2.668-1.813 3.747-2.55.695.1 1.41.153 2.133.153 5.523 0 10-3.463 10-7.691C22 6.463 17.523 3 12 3z" fill="#191919"/>
            </svg>
            채널 추가
          </Button>
          <Button variant="outline" size="md" fullWidth>📋 링크 복사해서 공유</Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[#1C1917] font-semibold uppercase tracking-wide">💎 Gem Shape (다각형 컷 코너)</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" shape="gem">Primary Gem</Button>
            <Button variant="kakao" shape="gem">Kakao Gem</Button>
            <Button variant="outline" shape="gem">Outline Gem</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" shape="gem" size="sm">Small</Button>
            <Button variant="primary" shape="gem" size="md">Medium</Button>
            <Button variant="primary" shape="gem" size="lg">Large</Button>
          </div>
          <Button variant="primary" shape="gem" size="lg" fullWidth>Full Width Gem Button</Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[#1C1917] font-semibold uppercase tracking-wide">Disabled</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" disabled className="opacity-50 cursor-not-allowed">Disabled</Button>
            <Button variant="primary" shape="gem" disabled className="opacity-50 cursor-not-allowed">Disabled Gem</Button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════
          BADGE
          ═══════════════════════════ */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-[#8FD4CE] border-b border-[#D1E8E4] pb-2">
          Badge
        </h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="success">당첨</Badge>
          <Badge variant="warning">대기 중</Badge>
          <Badge variant="danger">LIVE</Badge>
          <Badge variant="info">Vol.1</Badge>
        </div>
      </section>

      {/* ═══════════════════════════
          CARD
          ═══════════════════════════ */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-[#8FD4CE] border-b border-[#D1E8E4] pb-2">
          Card
        </h2>

        <div className="space-y-3">
          <Card padding="sm">
            <p className="text-sm text-[#1C1917]">Card — small padding</p>
          </Card>

          <Card padding="md">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="danger">LIVE</Badge>
                <span className="text-sm font-bold text-white">박 터트리기 Vol.1</span>
              </div>
              <p className="text-sm text-[#1C1917]">5월 5일 오후 5시 5분 — 상금 ₩50,000</p>
              <Button variant="primary" size="sm">참여하기</Button>
            </div>
          </Card>

          <Card padding="lg">
            <p className="font-bold text-[#1C1917] text-base">Default Card — Large</p>
            <p className="text-sm text-[#1C1917] mt-2">
              기본 카드. 청록 틴트 배경 + 부드러운 보더.
            </p>
          </Card>

          <Card padding="lg" variant="gem">
            <p className="font-bold text-[#1C1917] text-base">💎 Gem Card — 에메랄드 질감</p>
            <p className="text-sm text-[#1C1917] mt-2">
              상단·좌측 광택 라인 + 그라디언트 배경 + inset shadow.
              다이아몬드/에메랄드의 면 반사 느낌.
            </p>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════
          MODAL
          ═══════════════════════════ */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-[#8FD4CE] border-b border-[#D1E8E4] pb-2">
          Modal
        </h2>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          모달 열기
        </Button>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="당첨 확인">
          <div className="space-y-4">
            <Card>
              <div className="flex items-center gap-3">
                <Badge variant="success">당첨</Badge>
                <span className="font-bold text-[#1C1917]">축하합니다!</span>
              </div>
              <p className="text-sm text-[#1C1917] mt-2">
                Vol.1 박 터트리기에서 상금 ₩50,000에 당첨되셨습니다.
              </p>
            </Card>
            <p className="text-xs text-[#1C1917]">
              개별 연락을 통해 상금 지급 절차를 안내드리겠습니다.
            </p>
            <Button variant="primary" fullWidth onClick={() => setModalOpen(false)}>
              확인
            </Button>
          </div>
        </Modal>
      </section>

      {/* ═══════════════════════════
          TOAST
          ═══════════════════════════ */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-[#8FD4CE] border-b border-[#D1E8E4] pb-2">
          Toast
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={() => showToast("success", "링크가 복사되었습니다!")}>
            Success
          </Button>
          <Button variant="outline" size="sm" onClick={() => showToast("error", "발사에 실패했습니다.")}>
            Error
          </Button>
          <Button variant="outline" size="sm" onClick={() => showToast("info", "5분 후 이벤트가 시작됩니다.")}>
            Info
          </Button>
        </div>

        <Toast
          open={toast.open}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          message={toast.msg}
          type={toast.type}
        />
      </section>

      {/* ═══════════════════════════
          SKELETON
          ═══════════════════════════ */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-[#8FD4CE] border-b border-[#D1E8E4] pb-2">
          Skeleton
        </h2>

        <div className="space-y-2">
          <p className="text-xs text-[#1C1917] font-semibold uppercase tracking-wide">단일</p>
          <Skeleton width="200px" height="20px" />
          <Skeleton width="100%" height="40px" rounded="lg" />
          <Skeleton width="48px" height="48px" rounded="full" />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[#1C1917] font-semibold uppercase tracking-wide">텍스트 블록</p>
          <SkeletonText lines={4} />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[#1C1917] font-semibold uppercase tracking-wide">카드</p>
          <div className="grid grid-cols-2 gap-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════
          COLOR PALETTE
          ═══════════════════════════ */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-[#8FD4CE] border-b border-[#D1E8E4] pb-2">
          Color Palette
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { name: "Primary", color: "#5BBFB5", text: "white" },
            { name: "Dark", color: "#3D9E94", text: "white" },
            { name: "Light", color: "#8FD4CE", text: "#1A1A1A" },
            { name: "Wood", color: "#8B5E3C", text: "white" },
            { name: "Kakao", color: "#FEE500", text: "#191919" },
            { name: "Background", color: "#000000", text: "white" },
            { name: "Surface", color: "#1A1A1A", text: "white" },
            { name: "Border", color: "#333333", text: "white" },
          ].map(({ name, color, text }) => (
            <div
              key={name}
              className="rounded-xl p-3 text-center text-xs font-semibold border border-[#D1E8E4]"
              style={{ backgroundColor: color, color: text }}
            >
              {name}
              <br />
              <span className="font-mono text-[10px] opacity-70">{color}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="h-20" />
    </div>
  );
}

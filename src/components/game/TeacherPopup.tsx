"use client";

/**
 * ============================================================================
 * TeacherPopup — 선생님 캐릭터 팝업 (Placeholder)
 * ============================================================================
 *
 * 🎯 역할
 *  - 대기실 연습 투척 3회+부터 "어허! 거 하지마" 같은 재미 요소
 *  - 현재는 말풍선 placeholder. 캐릭터 애셋 완성 시 컴포넌트 내부만 교체
 *
 * 📌 props 계약 유지 원칙
 *  - message, visible, onClose props는 캐릭터 교체 후에도 그대로 유지
 *  - variant는 향후 캐릭터 감정(놀람·화남·웃음) 확장용
 *
 * 📌 방해 금지 원칙
 *  - 화면 한 귀퉁이(기본 하단)에만 노출
 *  - 플레이 화면이면 게임 조작 영역과 겹치지 않도록 배치
 * ============================================================================
 */

import { useMotionPreference } from "@/hooks";
import { AnimatePresence, motion } from "framer-motion";

export type TeacherVariant = "scold" | "cheer" | "warn";
export type TeacherPosition = "bottom-left" | "bottom-right" | "top-right";

interface TeacherPopupProps {
  visible: boolean;
  message: string;
  variant?: TeacherVariant;
  position?: TeacherPosition;
  onClose?: () => void;
}

const VARIANT_STYLE: Record<TeacherVariant, { bg: string; emoji: string }> = {
  scold: { bg: "#FFF4E6", emoji: "🧑‍🏫" },
  cheer: { bg: "#E6F7F5", emoji: "🧑‍🏫" },
  warn:  { bg: "#FFE6E3", emoji: "🧑‍🏫" },
};

const POSITION_STYLE: Record<TeacherPosition, React.CSSProperties> = {
  "bottom-left":  { bottom: 24, left: 16 },
  "bottom-right": { bottom: 24, right: 16 },
  "top-right":    { top: 24, right: 16 },
};

export function TeacherPopup({
  visible,
  message,
  variant = "scold",
  position = "bottom-right",
  onClose,
}: TeacherPopupProps) {
  const { prefersReducedMotion } = useMotionPreference();
  const style = VARIANT_STYLE[variant];
  const positionStyle = POSITION_STYLE[position];

  const slideDistance = prefersReducedMotion ? 8 : 32;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: slideDistance }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: slideDistance }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          style={{
            position: "fixed",
            zIndex: 60,
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            pointerEvents: "auto",
            ...positionStyle,
          }}
          role="status"
          aria-live="polite"
        >
          {/* 캐릭터 자리 — 향후 Image/Lottie로 교체 */}
          <div
            aria-hidden
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: style.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            {style.emoji}
          </div>

          {/* 말풍선 */}
          <motion.div
            onClick={onClose}
            initial={prefersReducedMotion ? undefined : { scale: 0.9 }}
            animate={{ scale: 1 }}
            style={{
              background: style.bg,
              color: "#1C1917",
              padding: "10px 14px",
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 600,
              maxWidth: 200,
              boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
              cursor: onClose ? "pointer" : "default",
              position: "relative",
            }}
          >
            {message}
            {/* 꼬리 */}
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: -6,
                bottom: 14,
                width: 0,
                height: 0,
                borderTop: "6px solid transparent",
                borderBottom: "6px solid transparent",
                borderRight: `6px solid ${style.bg}`,
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────
   Burst Design Tokens
   박터트리기 브랜드 컬러 (청록 + 나무 + 블랙)
   ────────────────────────────────────── */

export const colors = {
  // 브랜드
  primary: "#5BBFB5",         // 메인 청록
  primaryDark: "#3D9E94",     // 어두운 청록 (hover, active)
  primaryLight: "#8FD4CE",    // 밝은 청록 (배지, 하이라이트)
  wood: "#8B5E3C",            // 나무 갈색 (줄, 포인트)

  // 배경
  bg: "#FFFFFF",              // 흰색
  bgSurface: "#F0FAF8",      // 청록 틴트 서피스
  bgOverlay: "rgba(0,0,0,0.5)", // 모달 딤

  // 텍스트
  textPrimary: "#1C1917",     // 거의 블랙
  textSecondary: "#5A5A5A",   // 중간 회색
  textMuted: "#999999",       // 밝은 회색
  textAccent: "#3D9E94",      // 어두운 청록 강조

  // 카카오 (변경 없음)
  kakaoYellow: "#FEE500",
  kakaoText: "#191919",

  // 보더
  border: "#D1E8E4",          // 청록 틴트 보더
  borderLight: "rgba(91,191,181,0.15)",
} as const;

export const radius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  full: "9999px",
} as const;

export const shadow = {
  sm: "0 1px 3px rgba(61,158,148,0.12), 0 1px 2px rgba(0,0,0,0.06)",
  md: "0 4px 8px rgba(61,158,148,0.15), 0 2px 4px rgba(0,0,0,0.06)",
  lg: "0 10px 20px rgba(61,158,148,0.18), 0 4px 8px rgba(0,0,0,0.08)",
  xl: "0 20px 40px rgba(61,158,148,0.2), 0 8px 16px rgba(0,0,0,0.1)",
} as const;

"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "kakao" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";
type Shape = "default" | "gem";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  shape?: Shape;
  children: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary: [
    "text-white font-bold",
    "bg-gradient-to-b from-[#6DD4C8] via-[#5BBFB5] to-[#3D9E94]",
    "border border-[#3D9E94]/40",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(61,158,148,0.3),0_4px_12px_rgba(61,158,148,0.15)]",
    "hover:from-[#79DDD2] hover:via-[#6DD4C8] hover:to-[#4DB3A8]",
  ].join(" "),
  kakao: [
    "text-[#191919] font-bold",
    "bg-gradient-to-b from-[#FFF176] via-[#FEE500] to-[#E6CE00]",
    "border border-[#D4B800]/30",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_4px_rgba(214,184,0,0.3)]",
    "hover:from-[#FFF59D] hover:via-[#FFF176] hover:to-[#FEE500]",
  ].join(" "),
  outline: [
    "text-[#3D9E94] font-semibold",
    "bg-white",
    "border-2 border-[#D1E8E4]",
    "shadow-[0_1px_3px_rgba(61,158,148,0.08)]",
    "hover:bg-[#F0FAF8] hover:border-[#5BBFB5]",
  ].join(" "),
  ghost:
    "bg-transparent text-[#999] hover:text-[#3D9E94]",
};

const sizeStyles: Record<Size, string> = {
  sm: "py-2.5 px-5 text-sm",
  md: "py-3.5 px-7 text-base",
  lg: "py-4 px-8 text-lg",
};

/* 다각형 컷 코너 — 보석 면 느낌 */
const CUT = {
  sm: 6,
  md: 8,
  lg: 10,
};

function gemClipPath(cut: number) {
  return `polygon(
    ${cut}px 0%, calc(100% - ${cut}px) 0%,
    100% ${cut}px, 100% calc(100% - ${cut}px),
    calc(100% - ${cut}px) 100%, ${cut}px 100%,
    0% calc(100% - ${cut}px), 0% ${cut}px
  )`;
}

export default function Button({
  variant = "primary",
  size = "md",
  shape = "default",
  fullWidth = false,
  children,
  className = "",
  style,
  ...props
}: ButtonProps) {
  const isGem = shape === "gem";

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        active:scale-95 transition-all
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${isGem ? "" : "rounded-lg"}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      style={{
        ...(isGem ? { clipPath: gemClipPath(CUT[size]) } : {}),
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

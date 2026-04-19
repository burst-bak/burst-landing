"use client";

import { ReactNode } from "react";

type Variant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  default: "bg-[#F0FAF8] text-[#5A5A5A] border border-[#D1E8E4]",
  success: "bg-gradient-to-r from-[#5BBFB5]/15 to-[#3D9E94]/15 text-[#3D9E94] border border-[#5BBFB5]/30",
  warning: "bg-gradient-to-r from-[#8B5E3C]/10 to-[#A0704A]/10 text-[#8B5E3C] border border-[#8B5E3C]/20",
  danger: "bg-gradient-to-r from-red-50 to-red-100 text-red-600 border border-red-200",
  info: "bg-gradient-to-r from-[#8FD4CE]/15 to-[#5BBFB5]/10 text-[#3D9E94] border border-[#8FD4CE]/30",
};

export default function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5
        text-xs font-semibold rounded-md
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

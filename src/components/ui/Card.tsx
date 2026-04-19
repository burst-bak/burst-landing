"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  variant?: "default" | "gem";
}

const paddingMap = {
  sm: "p-3",
  md: "p-5",
  lg: "p-8",
};

export default function Card({
  children,
  className = "",
  padding = "md",
  variant = "default",
}: CardProps) {
  if (variant === "gem") {
    return (
      <div
        className={`
          relative rounded-lg overflow-hidden
          bg-gradient-to-br from-[#5BBFB5]/10 via-white to-[#8FD4CE]/10
          border border-[#D1E8E4]
          shadow-[0_2px_8px_rgba(61,158,148,0.1),inset_0_1px_0_rgba(255,255,255,0.8)]
          ${paddingMap[padding]}
          ${className}
        `}
      >
        {/* 상단 광택 라인 */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#8FD4CE]/40 to-transparent" />
        {/* 좌측 광택 라인 */}
        <div className="absolute top-0 left-0 bottom-0 w-[1px] bg-gradient-to-b from-[#8FD4CE]/30 via-transparent to-transparent" />
        {children}
      </div>
    );
  }

  return (
    <div
      className={`
        bg-[#F0FAF8] rounded-lg border border-[#D1E8E4]
        shadow-[0_1px_3px_rgba(61,158,148,0.08)]
        ${paddingMap[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

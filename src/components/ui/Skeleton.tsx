"use client";

interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: "sm" | "md" | "lg" | "full";
  className?: string;
}

const roundedMap = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  full: "rounded-full",
};

export default function Skeleton({
  width = "100%",
  height = "20px",
  rounded = "md",
  className = "",
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-[#E8F5F3] via-[#D1E8E4] to-[#E8F5F3] bg-[length:200%_100%] ${roundedMap[rounded]} ${className}`}
      style={{ width, height }}
    />
  );
}

/* 편의 조합 */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="14px"
          width={i === lines - 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="p-4 rounded-lg border border-[#D1E8E4] space-y-3">
      <Skeleton height="160px" rounded="lg" />
      <Skeleton height="18px" width="70%" />
      <Skeleton height="14px" width="40%" />
    </div>
  );
}

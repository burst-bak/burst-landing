"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  open: boolean;
  onClose: () => void;
  message: string;
  type?: ToastType;
  duration?: number;
}

const typeStyles: Record<ToastType, string> = {
  success: "bg-gradient-to-r from-[#5BBFB5] to-[#3D9E94] text-white shadow-[0_4px_12px_rgba(61,158,148,0.3)]",
  error: "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)]",
  info: "bg-white text-[#1C1917] border border-[#D1E8E4] shadow-[0_4px_12px_rgba(61,158,148,0.12)]",
};

const typeIcons: Record<ToastType, string> = {
  success: "✅",
  error: "❌",
  info: "ℹ️",
};

export default function Toast({
  open,
  onClose,
  message,
  type = "info",
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [open, onClose, duration]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed bottom-6 left-1/2 z-[100]"
          initial={{ opacity: 0, y: 20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 20, x: "-50%" }}
          transition={{ duration: 0.2 }}
        >
          <div
            className={`
              flex items-center gap-2 px-4 py-3 rounded-lg
              text-sm font-medium
              ${typeStyles[type]}
            `}
          >
            <span>{typeIcons[type]}</span>
            <span>{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

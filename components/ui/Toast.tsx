"use client";

import { CheckmarkCircleFillIcon, ExclamationmarkTriangleFillIcon, InformationSquareFillIcon, XMarkOctagonFillIcon } from "@navikt/aksel-icons";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";

export type ToastVariant = "success" | "info" | "warning" | "error";

interface ToastItem {
  id: number;
  title: string;
  body?: React.ReactNode;
  variant: ToastVariant;
}

const META: Record<ToastVariant, { color: string; icon: typeof CheckmarkCircleFillIcon }> = {
  success: { color: "#3a8a5f", icon: CheckmarkCircleFillIcon },
  info: { color: "#2a6cb3", icon: InformationSquareFillIcon },
  warning: { color: "#c98a2b", icon: ExclamationmarkTriangleFillIcon },
  error: { color: "#c4505c", icon: XMarkOctagonFillIcon },
};

/** Lightweight, page-local toasts. Render `toasts` once and call `push` from event handlers. */
export function useToasts() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (title: string, body?: React.ReactNode, variant: ToastVariant = "success") => {
      const id = ++seq.current;
      setItems((prev) => [...prev.slice(-3), { id, title, body, variant }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const toasts = (
    <div className="toast-stack" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => {
          const meta = META[t.variant];
          const Icon = meta.icon;
          return (
            <motion.div
              key={t.id}
              layout
              className="toast"
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onClick={() => dismiss(t.id)}
            >
              <span className="toast__icon" style={{ color: meta.color }}>
                <Icon aria-hidden />
              </span>
              <div>
                <div className="toast__title">{t.title}</div>
                {t.body ? <div className="toast__body">{t.body}</div> : null}
              </div>
              <motion.span
                className="toast__timer"
                style={{ background: meta.color }}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 4.2, ease: "linear" }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return { toasts, push };
}

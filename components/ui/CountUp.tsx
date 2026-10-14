"use client";

import { animate, useInView } from "motion/react";
import { useEffect, useRef } from "react";

interface Props {
  value: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

/** Animates a number from its previous value to `value` the first time it scrolls into view and on every change. */
export function CountUp({ value, decimals = 0, duration = 1.2, suffix = "", prefix = "" }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const from = useRef(0);

  useEffect(() => {
    if (!inView || !ref.current) return;
    const fmt = new Intl.NumberFormat("nb-NO", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    const node = ref.current;
    const controls = animate(from.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = `${prefix}${fmt.format(v)}${suffix}`;
      },
    });
    from.current = value;
    return () => controls.stop();
  }, [inView, value, decimals, duration, prefix, suffix]);

  const initial = new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(0);
  return (
    <span ref={ref} className="tabular">
      {`${prefix}${initial}${suffix}`}
    </span>
  );
}

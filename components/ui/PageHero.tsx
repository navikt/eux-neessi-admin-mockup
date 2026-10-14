"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

export type HeroVariant = "default" | "teal" | "sunset" | "violet" | "ocean" | "slate";

interface Props {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lead?: React.ReactNode;
  variant?: HeroVariant;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

/** Gradient page header with multi-layer parallax blobs that drift at different speeds while scrolling. */
export function PageHero({ eyebrow, title, lead, variant = "default", actions, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yFast = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const ySlow = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const yBack = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.3]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 25]);

  return (
    <motion.section
      ref={ref}
      className={`hero${variant !== "default" ? ` hero--${variant}` : ""}`}
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="hero__grid" />
      <motion.div
        className="hero__blob"
        style={{ y: yFast, width: 380, height: 380, right: -80, top: -140, background: "#22d3ee" }}
        animate={{ x: [0, 30, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="hero__blob"
        style={{ y: ySlow, width: 300, height: 300, right: 260, bottom: -170, background: "#f472b6" }}
        animate={{ x: [0, -40, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="hero__blob"
        style={{ y: yBack, width: 240, height: 240, left: -60, top: -60, background: "#818cf8" }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.svg
        aria-hidden
        viewBox="0 0 200 200"
        style={{ position: "absolute", right: 28, top: 22, width: 150, height: 150, opacity: 0.22, rotate, y: ySlow, zIndex: -1 }}
      >
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const x = 100 + Math.cos(a) * 72;
          const y = 100 + Math.sin(a) * 72;
          return <polygon key={i} points={star(x, y, 9)} fill="#ffcc00" />;
        })}
      </motion.svg>
      <motion.div style={{ y: contentY, opacity: contentOpacity }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: "1 1 520px" }}>
            {eyebrow ? <span className="hero__eyebrow">{eyebrow}</span> : null}
            <h1 className="hero__title">{title}</h1>
            {lead ? <p className="hero__lead">{lead}</p> : null}
          </div>
          {actions ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div> : null}
        </div>
        {children ? <div className="hero__stats">{children}</div> : null}
      </motion.div>
    </motion.section>
  );
}

function star(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(2)},${(cy + Math.sin(a) * rad).toFixed(2)}`);
  }
  return pts.join(" ");
}

export function HeroStat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="hero-stat">
      <div className="hero-stat__label">{label}</div>
      <div className="hero-stat__value">{value}</div>
      {hint ? <div className="hero-stat__hint">{hint}</div> : null}
    </div>
  );
}

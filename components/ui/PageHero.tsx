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

/** Calm page header: light surface, dot grid, soft accent tint and an EU star ring that drift with parallax while scrolling. */
export function PageHero({ eyebrow, title, lead, variant = "default", actions, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yGrid = useTransform(scrollYProgress, [0, 1], [0, 70]);
  const yTint = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const yRing = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 24]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.45]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 30]);

  return (
    <motion.section
      ref={ref}
      className={`hero${variant !== "default" ? ` hero--${variant}` : ""}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div className="hero__grid" style={{ y: yGrid }} />
      <motion.div
        className="hero__blob"
        style={{ y: yTint, width: 420, height: 320, right: -120, top: -160 }}
        animate={{ x: [0, 24, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="hero__blob"
        style={{ y: yGrid, width: 260, height: 200, right: 280, bottom: -170, opacity: 0.08 }}
        animate={{ x: [0, -30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.svg aria-hidden viewBox="0 0 200 200" className="hero__ring" style={{ rotate, y: yRing }}>
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const x = 100 + Math.cos(a) * 72;
          const y = 100 + Math.sin(a) * 72;
          return <polygon key={i} points={star(x, y, 9)} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" />;
        })}
      </motion.svg>
      <motion.div style={{ y: contentY, opacity: contentOpacity }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: "1 1 520px" }}>
            {eyebrow ? <span className="hero__eyebrow">{eyebrow}</span> : null}
            <h1 className="hero__title">{title}</h1>
            {lead ? <p className="hero__lead">{lead}</p> : null}
          </div>
          {actions ? <div className="hero__actions">{actions}</div> : null}
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

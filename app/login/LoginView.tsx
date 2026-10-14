"use client";

import { ArrowRightIcon, StarsEuIcon } from "@navikt/aksel-icons";
import { Button, TextField } from "@navikt/ds-react";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import { useState, useTransition } from "react";
import { PERSONAS, initials } from "@/lib/session";
import { login } from "./actions";
import styles from "./login.module.css";

const FLOATING = [
  { code: "H001", x: "8%", y: "18%", depth: 40 },
  { code: "P2000", x: "82%", y: "14%", depth: 70 },
  { code: "LA_BUC_02", x: "76%", y: "72%", depth: 30 },
  { code: "F001", x: "12%", y: "74%", depth: 60 },
  { code: "U002", x: "90%", y: "44%", depth: 25 },
  { code: "X009", x: "4%", y: "46%", depth: 80 },
  { code: "A003", x: "28%", y: "8%", depth: 20 },
  { code: "S080", x: "62%", y: "90%", depth: 50 },
  { code: "H_BUC_01", x: "36%", y: "88%", depth: 35 },
  { code: "P8000", x: "58%", y: "6%", depth: 55 },
];

export function LoginView({ error }: { error?: string }) {
  const [selected, setSelected] = useState<string>(PERSONAS[0].name);
  const [custom, setCustom] = useState("");
  const [pending, startTransition] = useTransition();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });

  const name = custom.trim() || selected;

  return (
    <div
      className={styles.page}
      onPointerMove={(e) => {
        mx.set(e.clientX / window.innerWidth - 0.5);
        my.set(e.clientY / window.innerHeight - 0.5);
      }}
    >
      <ParallaxLayer x={sx} y={sy} depth={-14} className={styles.dots} />
      <ParallaxLayer x={sx} y={sy} depth={-30} className={styles.glowA} />
      <ParallaxLayer x={sx} y={sy} depth={-55} className={styles.glowB} />
      <ParallaxLayer x={sx} y={sy} depth={18} className={styles.ring}>
        <motion.svg viewBox="0 0 400 400" className={styles.ringSvg} animate={{ rotate: 360 }} transition={{ duration: 120, repeat: Infinity, ease: "linear" }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            return (
              <motion.polygon
                key={i}
                points={star(200 + Math.cos(a) * 150, 200 + Math.sin(a) * 150, 16)}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinejoin="round"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0.5, 1, 0.5], scale: 1 }}
                transition={{ delay: 0.3 + i * 0.07, duration: 3, repeat: Infinity, repeatType: "mirror" }}
                style={{ transformOrigin: `${200 + Math.cos(a) * 150}px ${200 + Math.sin(a) * 150}px` }}
              />
            );
          })}
        </motion.svg>
      </ParallaxLayer>
      {FLOATING.map((f, i) => (
        <FloatingChip key={f.code} {...f} index={i} mx={sx} my={sy} />
      ))}

      <motion.main
        className={styles.card}
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      >
        <div className={styles.brand}>
          <motion.span className={styles.logo} whileHover={{ rotate: 30 }} transition={{ type: "spring", stiffness: 160, damping: 14 }}>
            <StarsEuIcon aria-hidden fontSize="1.6rem" color="#e8b923" />
          </motion.span>
          <div>
            <div className={styles.brandTitle}>nEESSI admin</div>
            <div className={styles.brandSub}>Nav · Team EESSI</div>
          </div>
        </div>
        <h1 className={styles.title}>
          Velkommen tilbake
        </h1>
        <p className={styles.lead}>Hvem er du i dag? Velg en rolle eller skriv inn navnet ditt.</p>

        <form
          action={(fd) => {
            fd.set("name", name);
            startTransition(() => login(fd));
          }}
        >
          <div className={styles.personas} role="radiogroup" aria-label="Velg person">
            {PERSONAS.map((p, i) => {
              const active = !custom.trim() && selected === p.name;
              return (
                <motion.button
                  key={p.name}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`${styles.persona} ${active ? styles.personaActive : ""}`}
                  onClick={() => {
                    setSelected(p.name);
                    setCustom("");
                  }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.07 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className={styles.personaAvatar} style={{ background: p.color }}>
                    {initials(p.name)}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <div className={styles.personaName}>{p.name}</div>
                    <div className={styles.personaTitle}>{p.title}</div>
                    <div className={styles.personaDesc}>{p.description}</div>
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className={styles.divider}>
            <span>eller</span>
          </div>

          <TextField
            label="Skriv inn navnet ditt"
            hideLabel
            placeholder="Skriv inn navnet ditt …"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            error={error}
            autoComplete="name"
          />

          <Button
            type="submit"
            className={styles.submit}
            loading={pending}
            icon={<ArrowRightIcon aria-hidden />}
            iconPosition="right"
          >
            Logg inn som {name.split(" ")[0] || "…"}
          </Button>
        </form>
        <p className={styles.note}>
          Prototype med fiktive data. Ingen ekte innlogging – du velger bare hvem du vil være.
        </p>
      </motion.main>
    </div>
  );
}

function ParallaxLayer({
  x,
  y,
  depth,
  className,
  children,
}: {
  x: MotionValue<number>;
  y: MotionValue<number>;
  depth: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const tx = useTransform(x, (v) => v * depth);
  const ty = useTransform(y, (v) => v * depth);
  return (
    <motion.div className={className} style={{ x: tx, y: ty }} aria-hidden>
      {children}
    </motion.div>
  );
}

function FloatingChip({
  code,
  x,
  y,
  depth,
  index,
  mx,
  my,
}: {
  code: string;
  x: string;
  y: string;
  depth: number;
  index: number;
  mx: MotionValue<number>;
  my: MotionValue<number>;
}) {
  const tx = useTransform(mx, (v) => v * depth * -1);
  const ty = useTransform(my, (v) => v * depth * -1);
  return (
    <motion.div className={styles.chipWrap} style={{ left: x, top: y, x: tx, y: ty }} aria-hidden>
      <motion.span
        className={styles.chip}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
        transition={{
          opacity: { delay: 0.5 + index * 0.08 },
          scale: { delay: 0.5 + index * 0.08 },
          y: { duration: 5 + (index % 3), repeat: Infinity, ease: "easeInOut" },
        }}
      >
        {code}
      </motion.span>
    </motion.div>
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

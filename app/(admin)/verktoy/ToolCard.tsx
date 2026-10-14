"use client";

import { StarFillIcon, StarIcon } from "@navikt/aksel-icons";
import { Tag } from "@navikt/ds-react";
import { motion } from "motion/react";
import { initials } from "@/lib/session";
import { relTime } from "./time";
import { CATEGORY_COLOR, RISK_META, STATUS_META, type AuditEntry, type ToolDefinition } from "./types";
import styles from "./verktoy.module.css";

interface Props {
  tool: ToolDefinition;
  lastRun?: AuditEntry;
  runs30d: number;
  now: number;
  favorite: boolean;
  selected: boolean;
  compact: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}

export function ToolCard({ tool, lastRun, runs30d, now, favorite, selected, compact, onSelect, onToggleFavorite }: Props) {
  const Icon = tool.icon;
  return (
    <motion.div
      layout
      layoutId={`tool-${tool.id}`}
      className={styles.toolCard}
      data-selected={selected}
      data-compact={compact}
      style={{ ["--tool" as string]: tool.color }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      whileHover={compact ? { x: 3 } : { y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
    >
      {selected ? <motion.span layoutId="tool-selected-ring" className={styles.toolCardRing} transition={{ type: "spring", stiffness: 380, damping: 32 }} /> : null}
      <span className={styles.toolCardGlow} />
      <motion.div layout="position" className={styles.toolCardTop}>
        <span className={styles.toolIcon}>
          <Icon aria-hidden />
        </span>
        <div className={styles.toolCardTitleWrap}>
          <div className={styles.toolCardTitle}>{tool.name}</div>
          <div className={styles.toolCardMeta}>
            <span className={styles.catDot} style={{ background: CATEGORY_COLOR[tool.category] }} />
            {tool.category}
            {compact ? (
              <span className={styles.riskDot} data-risk={RISK_META[tool.risk].color} title={RISK_META[tool.risk].label} />
            ) : null}
          </div>
        </div>
        <motion.button
          type="button"
          className={styles.star}
          data-on={favorite}
          aria-label={favorite ? "Fjern favoritt" : "Legg til favoritt"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          whileTap={{ scale: 0.7, rotate: -30 }}
        >
          <motion.span key={String(favorite)} initial={{ scale: 0.4, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
            {favorite ? <StarFillIcon aria-hidden /> : <StarIcon aria-hidden />}
          </motion.span>
        </motion.button>
      </motion.div>

      {!compact ? (
        <motion.div layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <p className={styles.toolCardDesc}>{tool.description}</p>
          <div className={styles.toolCardFoot}>
            <Tag size="xsmall" variant="moderate" data-color={RISK_META[tool.risk].color}>
              {RISK_META[tool.risk].label}
            </Tag>
            <span className={styles.runsBadge}>{runs30d} kjøringer / 30 d</span>
          </div>
          <div className={styles.lastRun}>
            {lastRun ? (
              <>
                <span className={styles.lastRunDot} data-status={STATUS_META[lastRun.status].color} />
                <span>
                  Sist kjørt <strong>{relTime(lastRun.atMs, now)}</strong>
                </span>
                <span className="avatar avatar--sm" style={{ width: 22, height: 22, fontSize: "0.62rem", marginLeft: "auto" }} title={lastRun.who}>
                  {initials(lastRun.who)}
                </span>
              </>
            ) : (
              <span className="muted">Aldri kjørt</span>
            )}
          </div>
        </motion.div>
      ) : null}
    </motion.div>
  );
}

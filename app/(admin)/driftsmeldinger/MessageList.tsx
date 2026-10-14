"use client";

import { ChevronDownIcon, FilesIcon, PersonGroupIcon, StopIcon } from "@navikt/aksel-icons";
import { Button, Tabs, Tag, Tooltip } from "@navikt/ds-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { fmtInt } from "@/lib/format";
import { ENHET_BY_ID } from "@/lib/mock/reference";
import { SEVERITY_ICON } from "./BannerPreview";
import styles from "./driftsmeldinger.module.css";
import {
  fmtDuration,
  fmtPeriod,
  fmtRelative,
  fmtWhen,
  SEVERITY_META,
  STATUS_META,
  type Driftsmelding,
  type MessageStatus,
} from "./model";

export type ListTab = "aktive" | "planlagte" | "tidligere";

export const TAB_OF: Record<MessageStatus, ListTab> = {
  aktiv: "aktive",
  planlagt: "planlagte",
  utlopt: "tidligere",
  deaktivert: "tidligere",
};

export interface ListedMessage extends Driftsmelding {
  status: MessageStatus;
}

interface Props {
  messages: ListedMessage[];
  now: string;
  tab: ListTab;
  onTabChange: (tab: ListTab) => void;
  highlightId: string | null;
  onDeactivate: (msg: ListedMessage) => void;
  onDuplicate: (msg: ListedMessage) => void;
}

const TABS: { value: ListTab; label: string }[] = [
  { value: "aktive", label: "Aktive" },
  { value: "planlagte", label: "Planlagte" },
  { value: "tidligere", label: "Tidligere" },
];

const EMPTY: Record<ListTab, string> = {
  aktive: "Ingen driftsmeldinger vises akkurat nå.",
  planlagte: "Ingen planlagte driftsmeldinger.",
  tidligere: "Ingen tidligere driftsmeldinger.",
};

export function MessageList({ messages, now, tab, onTabChange, highlightId, onDeactivate, onDuplicate }: Props) {
  const counts = { aktive: 0, planlagte: 0, tidligere: 0 };
  for (const m of messages) counts[TAB_OF[m.status]]++;
  const shown = messages
    .filter((m) => TAB_OF[m.status] === tab)
    .sort((a, b) => (tab === "planlagte" ? a.start.localeCompare(b.start) : b.start.localeCompare(a.start)));

  return (
    <Tabs value={tab} onChange={(v) => onTabChange(v as ListTab)}>
      <Tabs.List>
        {TABS.map((t) => (
          <Tabs.Tab
            key={t.value}
            value={t.value}
            label={
              <span className={styles.tabLabel}>
                {t.label}
                <motion.span
                  key={counts[t.value]}
                  className={`${styles.tabCount} ${t.value === "aktive" && counts.aktive > 0 ? styles.tabCountLive : ""}`}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                >
                  {counts[t.value]}
                </motion.span>
              </span>
            }
          />
        ))}
      </Tabs.List>
      <div className={styles.listBody}>
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.length === 0 ? (
            <motion.div key="empty" className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {EMPTY[tab]}
            </motion.div>
          ) : (
            shown.map((m, i) => (
              <MessageItem
                key={m.id}
                msg={m}
                now={now}
                index={i}
                highlight={m.id === highlightId}
                onDeactivate={onDeactivate}
                onDuplicate={onDuplicate}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </Tabs>
  );
}

function MessageItem({
  msg,
  now,
  index,
  highlight,
  onDeactivate,
  onDuplicate,
}: {
  msg: ListedMessage;
  now: string;
  index: number;
  highlight: boolean;
  onDeactivate: (m: ListedMessage) => void;
  onDuplicate: (m: ListedMessage) => void;
}) {
  const [open, setOpen] = useState(false);
  const sev = SEVERITY_META[msg.severity];
  const st = STATUS_META[msg.status];
  const Icon = SEVERITY_ICON[msg.severity];
  const canStop = msg.status === "aktiv" || msg.status === "planlagt";

  return (
    <motion.article
      id={`msg-${msg.id}`}
      layout
      className={`${styles.msg} ${highlight ? styles.msgHighlight : ""}`}
      style={{ ["--sev" as string]: sev.color }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0, transition: { delay: index * 0.04, duration: 0.35 } }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
    >
      <div className={styles.msgIcon}>
        <Icon aria-hidden />
      </div>
      <div className={styles.msgMain}>
        <div className={styles.msgTop}>
          <h4 className={styles.msgTitle}>{msg.title}</h4>
          <div className={styles.msgTags}>
            <Tag size="xsmall" variant="moderate" data-color={sev.tag}>
              {sev.label}
            </Tag>
            <Tag size="xsmall" variant={msg.status === "aktiv" ? "strong" : "outline"} data-color={st.tag}>
              {msg.status === "aktiv" ? <span className={`dot dot--ok dot--pulse ${styles.tagDot}`} /> : null}
              {st.label}
            </Tag>
          </div>
        </div>
        <p className={styles.msgBody}>{msg.body}</p>
        <div className={styles.msgMeta}>
          <span>{fmtPeriod(msg.start, msg.deactivatedAt ?? msg.end)}</span>
          <span className={styles.metaSep} />
          <span>
            <PersonGroupIcon aria-hidden />{" "}
            {msg.audience === "alle" ? (
              "Alle enheter"
            ) : (
              <Tooltip content={msg.audience.map((id) => `${id} ${ENHET_BY_ID[id]?.shortName ?? ""}`).join(" · ")}>
                <span className={styles.underline}>
                  {msg.audience.length === 1
                    ? `${msg.audience[0]} ${ENHET_BY_ID[msg.audience[0]]?.shortName ?? ""}`
                    : `${msg.audience.length} enheter`}
                </span>
              </Tooltip>
            )}
          </span>
          <span className={styles.metaSep} />
          <span>
            {msg.createdBy} · {fmtWhen(msg.createdAt)}
          </span>
          {!msg.dismissible ? (
            <>
              <span className={styles.metaSep} />
              <span>Kan ikke lukkes</span>
            </>
          ) : null}
        </div>

        <ReadBar msg={msg} now={now} />

        <div className={styles.msgActions}>
          <Button size="xsmall" variant="tertiary" data-color="neutral" icon={<FilesIcon aria-hidden />} onClick={() => onDuplicate(msg)}>
            Dupliser
          </Button>
          {canStop ? (
            <Button size="xsmall" variant="tertiary" data-color="danger" icon={<StopIcon aria-hidden />} onClick={() => onDeactivate(msg)}>
              {msg.status === "planlagt" ? "Avbryt" : "Deaktiver"}
            </Button>
          ) : null}
          {msg.status !== "planlagt" && msg.stats.seen > 0 ? (
            <Button
              size="xsmall"
              variant="tertiary"
              data-color="neutral"
              icon={
                <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: "inline-flex" }}>
                  <ChevronDownIcon aria-hidden />
                </motion.span>
              }
              iconPosition="right"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
            >
              Per enhet
            </Button>
          ) : null}
        </div>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden" }}
            >
              <div className={styles.enhetGrid}>
                {msg.stats.byEnhet.map((e, i) => {
                  const pct = e.target ? (e.seen / e.target) * 100 : 0;
                  return (
                    <div key={e.enhetId} className={styles.enhetRow}>
                      <span className={styles.enhetName}>
                        <b className="mono">{e.enhetId}</b> {ENHET_BY_ID[e.enhetId]?.shortName}
                      </span>
                      <span className="bar-track">
                        <motion.span
                          className="bar-fill"
                          style={{ background: sev.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: i * 0.04, duration: 0.6 }}
                        />
                      </span>
                      <span className="tabular muted">
                        {e.seen}/{e.target}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

function ReadBar({ msg, now }: { msg: ListedMessage; now: string }) {
  const { target, seen, closed, medianMinutesToSeen } = msg.stats;
  if (msg.status === "planlagt") {
    return (
      <div className={styles.readPending}>
        Starter {fmtRelative(msg.start, now)} · når ca. <strong>{fmtInt(target)}</strong> aktive brukere
      </div>
    );
  }
  if (seen === 0 && msg.status === "aktiv") {
    return (
      <div className={styles.readPending}>
        Publisert {fmtRelative(msg.start, now)} · venter på første visning blant {fmtInt(target)} brukere
      </div>
    );
  }
  const t = Math.max(target, 1);
  const closedPct = (closed / t) * 100;
  const seenOnlyPct = ((seen - closed) / t) * 100;
  const seenPct = (seen / t) * 100;
  return (
    <div className={styles.read}>
      <div className={styles.readTrack} role="img" aria-label={`${seen} av ${target} har sett meldingen, ${closed} har lukket den`}>
        <motion.span
          className={styles.readClosed}
          initial={{ width: 0 }}
          animate={{ width: `${closedPct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.span
          className={styles.readSeen}
          initial={{ width: 0 }}
          animate={{ width: `${seenOnlyPct}%` }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <div className={styles.readLegend}>
        <span>
          <i className={styles.readSeenDot} />
          <strong className="tabular">{fmtInt(seen)}</strong> av {fmtInt(target)} har sett ({Math.round(seenPct)} %)
        </span>
        {msg.dismissible ? (
          <span>
            <i className={styles.readClosedDot} />
            <strong className="tabular">{fmtInt(closed)}</strong> lukket
          </span>
        ) : null}
        {medianMinutesToSeen !== null ? <span className="muted">Median tid til sett: {fmtDuration(medianMinutesToSeen)}</span> : null}
      </div>
    </div>
  );
}

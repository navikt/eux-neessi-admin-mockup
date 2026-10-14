"use client";

import {
  ArrowRightIcon,
  BarChartIcon,
  CloudIcon,
  DatabaseIcon,
  ExclamationmarkTriangleIcon,
  FolderPlusIcon,
  HourglassIcon,
  InboxDownIcon,
  LayersIcon,
  PaperplaneIcon,
  ArchiveIcon,
  ArrowsCirclepathIcon,
} from "@navikt/aksel-icons";
import { Button, Tag, Tooltip } from "@navikt/ds-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { CountUp } from "@/components/ui/CountUp";
import { Flag } from "@/components/ui/Flag";
import { KpiCard } from "@/components/ui/KpiCard";
import { HeroStat, PageHero } from "@/components/ui/PageHero";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import { Card, Section } from "@/components/ui/Section";
import { fmtDateShort, fmtDays, fmtInt, fmtPct, fmtWeekday, pctChange } from "@/lib/format";
import { makeEvent, type LiveEvent } from "@/lib/mock/events";
import { COUNTRY_BY_CODE, ENHET_BY_ID, type CountryCode } from "@/lib/mock/reference";
import type { SystemCheck, TodaySnapshot } from "@/lib/mock/today";
import styles from "./dashboard.module.css";

interface AwaitingTeaser {
  total: number;
  overdue: number;
  soon: number;
  ok: number;
  oldest: number;
  medianWait: number;
  reminders: number;
  unassignedOverdue: number;
  topOverdue: { code: string; count: number }[];
  oldestItem: { days: number; country: string; sed: string; rinasakId: string };
}

interface Props {
  firstName: string;
  today: TodaySnapshot;
  awaiting: AwaitingTeaser;
}

const TICK_MS = 2400;

function greeting(minute: number): string {
  const h = minute / 60;
  if (h < 5) return "God natt";
  if (h < 10) return "God morgen";
  if (h < 12) return "God formiddag";
  if (h < 18) return "God ettermiddag";
  return "God kveld";
}

function hhmm(minute: number): string {
  return `${String(Math.floor(minute / 60) % 24).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function osloMinute(): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === "hour")?.value) * 60 + Number(parts.find((p) => p.type === "minute")?.value);
}

const KIND_META: Record<LiveEvent["kind"], { label: string; color: string; icon: typeof PaperplaneIcon }> = {
  sent: { label: "Sendt", color: "#2a6cb3", icon: PaperplaneIcon },
  recv: { label: "Mottatt", color: "#3a8a5f", icon: InboxDownIcon },
  buc: { label: "Ny BUC", color: "#7d6aa5", icon: FolderPlusIcon },
  journal: { label: "Journalført", color: "#c98a2b", icon: ArchiveIcon },
};

export function DashboardView({ firstName, today, awaiting }: Props) {
  const [counts, setCounts] = useState(today.sofar);
  const [events, setEvents] = useState<LiveEvent[]>(today.events);
  const [minute, setMinute] = useState(today.minute);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    let seq = 0;
    const id = window.setInterval(() => {
      const m = osloMinute();
      setMinute(m);
      const total = today.ratePerMinute.sent + today.ratePerMinute.recv + today.ratePerMinute.bucs;
      const p = Math.min(0.85, Math.max(0.18, (total * TICK_MS) / 60_000));
      if (Math.random() > p) return;
      const ev = makeEvent(Math.random, m, `live-${Date.now()}-${seq++}`);
      setEvents((prev) => [ev, ...prev].slice(0, 18));
      setCounts((c) => ({
        sent: c.sent + (ev.kind === "sent" ? 1 : 0),
        recv: c.recv + (ev.kind === "recv" ? 1 : 0),
        bucs: c.bucs + (ev.kind === "buc" ? 1 : 0),
        journal: c.journal + (ev.kind === "journal" ? 1 : 0),
      }));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [paused, today.ratePerMinute]);

  const dbs = today.systems.filter((s) => s.kind === "db");
  const dbsOnline = dbs.filter((d) => d.state !== "down").length;
  const warnings = today.systems.filter((s) => s.state !== "ok");

  const hourNow = Math.floor(minute / 60);
  const hourly = useMemo(() => today.hourly.map((h) => ({ ...h, label: `${h.label}` })), [today.hourly]);

  const mtd = today.monthToDate;
  const mtdSentDelta = pctChange(mtd.sent, today.prevMonthSameDays.sent);
  const mtdRecvDelta = pctChange(mtd.recv, today.prevMonthSameDays.recv);

  return (
    <>
      <PageHero
        eyebrow={<>Live · {fmtWeekday(today.todayIso)}</>}
        title={
          <>
            {greeting(minute)}, {firstName}
          </>
        }
        lead="Her er pulsen i EESSI-utvekslingen akkurat nå – hva vi sender, hva vi mottar, og om alt rundt nEESSI er friskt."
        actions={
          <div className={styles.clock}>
            <span className={styles.clockTime}>
              {hhmm(minute).slice(0, 2)}
              <span className={styles.clockColon}>:</span>
              {hhmm(minute).slice(3)}
            </span>
            <span className={styles.clockLabel}>
              <span className={`dot ${paused ? "dot--warn" : "dot--ok dot--pulse"}`} />
              Oslo
            </span>
          </div>
        }
      >
        <HeroStat label="SED-er sendt i dag" value={<CountUp value={counts.sent} />} hint={`Ventet ca. ${fmtInt(today.expectedDay.sent)} i løpet av dagen`} />
        <HeroStat label="SED-er mottatt i dag" value={<CountUp value={counts.recv} />} hint={`Ventet ca. ${fmtInt(today.expectedDay.recv)}`} />
        <HeroStat label="BUC-er opprettet" value={<CountUp value={counts.bucs} />} hint="Nye saker fra Norge" />
        <HeroStat
          label="Databaser online"
          value={
            <>
              {dbsOnline}/{dbs.length}
            </>
          }
          hint={dbsOnline === dbs.length ? "Alle svarer normalt" : "Noen databaser svarer ikke"}
        />
      </PageHero>

      <Stagger className="grid grid--4">
        <StaggerItem>
          <KpiCard
            label="Sendt i dag"
            value={counts.sent}
            icon={PaperplaneIcon}
            color="#2a6cb3"
            delta={pctChange(counts.sent, today.lastWeekSofar.sent)}
            deltaLabel="mot forrige uke"
            spark={today.last14.map((d) => d.sent)}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Mottatt i dag"
            value={counts.recv}
            icon={InboxDownIcon}
            color="#3a8a5f"
            delta={pctChange(counts.recv, today.lastWeekSofar.recv)}
            deltaLabel="mot forrige uke"
            spark={today.last14.map((d) => d.recv)}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="BUC-er opprettet"
            value={counts.bucs}
            icon={FolderPlusIcon}
            color="#7d6aa5"
            delta={pctChange(counts.bucs, today.lastWeekSofar.bucs)}
            deltaLabel="mot forrige uke"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Journalført automatisk"
            value={counts.journal}
            icon={ArchiveIcon}
            color="#c98a2b"
            foot={<span>{fmtPct(86, 0)} av mottatte SED-er</span>}
          />
        </StaggerItem>
      </Stagger>

      <div className="grid grid--main-side" style={{ marginTop: 20 }}>
        <Reveal>
          <Card
            title="Aktivitet gjennom dagen"
            subtitle="SED-er sendt og mottatt per time, sammenlignet med samme ukedag forrige uke"
            actions={
              <div className="legend">
                <span className="legend__item">
                  <span className="legend__swatch" style={{ background: "#2f6fb5" }} /> I dag
                </span>
                <span className="legend__item">
                  <span className="legend__swatch" style={{ background: "#9aa1ab" }} /> Forrige uke
                </span>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={hourly} margin={{ top: 16, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="todayFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2f6fb5" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#2f6fb5" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={2} />
                <YAxis tickLine={false} axisLine={false} width={48} />
                <ReTooltip content={<ChartTooltip labelFormatter={(l) => `Kl. ${l}:00`} formatter={(v) => fmtInt(v)} />} />
                <Line type="monotone" dataKey="lastWeek" name="Forrige uke" stroke="#9aa1ab" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Area type="monotone" dataKey="today" name="I dag" stroke="#2f6fb5" strokeWidth={2.5} fill="url(#todayFill)" connectNulls={false} dot={false} activeDot={{ r: 5 }} />
                <ReferenceLine x={String(hourNow).padStart(2, "0")} stroke="#c4505c" strokeDasharray="3 3" label={{ value: "Nå", position: "top", fill: "#c4505c", fontSize: 12, fontWeight: 600 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </Reveal>

        <Reveal delay={0.1}>
          <Card
            className={styles.feedCard}
            title={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <span className={`dot ${paused ? "dot--warn" : "dot--ok dot--pulse"}`} />
                Live-strøm
              </span>
            }
            subtitle="Hendelser fra RINA og nEESSI"
            actions={
              <Button size="xsmall" variant="tertiary" onClick={() => setPaused((p) => !p)}>
                {paused ? "Fortsett" : "Pause"}
              </Button>
            }
          >
            <ul className={styles.feed}>
              <AnimatePresence initial={false}>
                {events.map((ev) => {
                  const meta = KIND_META[ev.kind];
                  const Icon = meta.icon;
                  return (
                    <motion.li
                      key={ev.id}
                      layout
                      initial={{ opacity: 0, x: -16, backgroundColor: "rgba(42, 108, 179, 0.1)" }}
                      animate={{ opacity: 1, x: 0, backgroundColor: "rgba(42, 108, 179, 0)" }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className={styles.feedItem}
                    >
                      <span className={styles.feedIcon} style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 12%, transparent)` }}>
                        <Icon aria-hidden />
                      </span>
                      <div className={styles.feedBody}>
                        <div className={styles.feedTitle}>
                          <span className="sed-code">{ev.kind === "buc" ? ev.buc : ev.sedType}</span>
                          <span>{meta.label}</span>
                          <span className="muted">{ev.kind === "recv" ? "fra" : ev.kind === "sent" || ev.kind === "buc" ? "til" : ""}</span>
                          <Flag code={ev.country} />
                          <span>{COUNTRY_BY_CODE[ev.country as CountryCode]?.name}</span>
                        </div>
                        <div className={styles.feedMeta}>
                          {ev.kind === "buc" ? "Ny sak" : ev.sedName} · {ENHET_BY_ID[ev.enhetId]?.shortName ?? "Nav"} · <span className="mono">{ev.rinasakId}</span>
                        </div>
                      </div>
                      <span className={styles.feedTime}>{hhmm(ev.minute)}</span>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </Card>
        </Reveal>
      </div>

      <div className="grid grid--2" style={{ marginTop: 20 }}>
        <Reveal>
          <div className={`card ${styles.answerCard}`}>
            <div className={styles.answerHead}>
              <span className={styles.answerIcon}>
                <HourglassIcon aria-hidden />
              </span>
              <div>
                <div className="section__kicker">Har vi svart?</div>
                <h3 className="card__title" style={{ margin: 0 }}>
                  {awaiting.overdue} forespørsler har passert fristen
                </h3>
              </div>
            </div>
            <div className={styles.answerStats}>
              <div>
                <div className={styles.bigNum} style={{ color: "#c4505c" }}>
                  <CountUp value={awaiting.overdue} />
                </div>
                <div className="muted">Forfalt</div>
              </div>
              <div>
                <div className={styles.bigNum} style={{ color: "#c98a2b" }}>
                  <CountUp value={awaiting.soon} />
                </div>
                <div className="muted">Frist innen 7 dager</div>
              </div>
              <div>
                <div className={styles.bigNum}>
                  <CountUp value={awaiting.total} />
                </div>
                <div className="muted">Venter på svar</div>
              </div>
            </div>
            <div className={styles.stackBar}>
              {[
                { v: awaiting.overdue, c: "#c4505c", l: "Forfalt" },
                { v: awaiting.soon, c: "#c98a2b", l: "Snart" },
                { v: awaiting.ok, c: "#3a8a5f", l: "Innen frist" },
              ].map((s, i) => (
                <Tooltip key={s.l} content={`${s.l}: ${fmtInt(s.v)}`}>
                  <motion.span
                    style={{ background: s.c }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(s.v / awaiting.total) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.2 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                  />
                </Tooltip>
              ))}
            </div>
            <div className={styles.countryRow}>
              <span className="muted" style={{ fontSize: "0.85rem" }}>
                Flest forfalte:
              </span>
              {awaiting.topOverdue.map((c) => (
                <Link key={c.code} href={`/svar?status=FORFALT&land=${c.code}`} className="chip" style={{ gap: 6 }}>
                  <Flag code={c.code} /> {COUNTRY_BY_CODE[c.code as CountryCode]?.name} <strong>{c.count}</strong>
                </Link>
              ))}
            </div>
            <p className="muted" style={{ margin: "14px 0 18px", fontSize: "0.92rem" }}>
              Eldste ubesvarte er en <span className="sed-code">{awaiting.oldestItem.sed}</span> fra{" "}
              {COUNTRY_BY_CODE[awaiting.oldestItem.country as CountryCode]?.name} som har ventet i {awaiting.oldestItem.days} dager.{" "}
              {awaiting.unassignedOverdue} forfalte saker mangler saksbehandler.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button as={Link} href="/svar?status=FORFALT" size="small" icon={<ArrowRightIcon aria-hidden />} iconPosition="right">
                Se forfalte
              </Button>
              <Button as={Link} href="/svar" size="small" variant="secondary">
                Hele oversikten
              </Button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <Card
            title={`Måneden så langt · ${mtd.label}`}
            subtitle={`${mtd.days} dager, inkludert i dag. Samme tall som i statistikken.`}
            actions={
              <Button as={Link} href="/statistikk" size="xsmall" variant="tertiary" icon={<BarChartIcon aria-hidden />}>
                Statistikk
              </Button>
            }
          >
            <div className={styles.mtdGrid}>
              <MtdStat label="SED-er sendt" value={mtd.sent} delta={mtdSentDelta} />
              <MtdStat label="SED-er mottatt" value={mtd.recv} delta={mtdRecvDelta} />
              <MtdStat label="BUC-er opprettet" value={mtd.bucNew} />
              <MtdStat label="Svar sendt" value={mtd.ans} />
              <div className={styles.mtdStat}>
                <div className="muted">Median svartid (Norge)</div>
                <div className={styles.mtdValue}>{fmtDays(mtd.nDays)}</div>
              </div>
              <div className={styles.mtdStat}>
                <div className="muted">Svar innen frist</div>
                <div className={styles.mtdValue}>{fmtPct(mtd.nOnTime)}</div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="muted" style={{ fontSize: "0.82rem", marginBottom: 4 }}>
                Siste 14 dager
              </div>
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={today.last14} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barGap={2}>
                  <XAxis dataKey="date" tickFormatter={(d: string) => fmtDateShort(d).replace(".", "")} tickLine={false} axisLine={false} interval={3} fontSize={11} />
                  <ReTooltip content={<ChartTooltip labelFormatter={(l) => fmtDateShort(String(l))} formatter={(v) => fmtInt(v)} />} />
                  <Bar dataKey="sent" name="Sendt" fill="#2f6fb5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recv" name="Mottatt" fill="#3a8a5f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Reveal>
      </div>

      <Section
        kicker="Systemstatus"
        title={warnings.length ? `${warnings.length} ting å følge med på` : "Alt er grønt"}
        lead="Helsesjekker for EUX-applikasjonene, databasene, Kafka-topics og eksterne avhengigheter. Oppdateres hvert 10. minutt."
        actions={
          <Tag variant="moderate" data-color={warnings.length ? "warning" : "success"} size="small">
            {today.systems.length - warnings.length}/{today.systems.length} friske
          </Tag>
        }
      >
        <div className="grid grid--4">
          <SystemGroup title="Applikasjoner" icon={LayersIcon} items={today.systems.filter((s) => s.kind === "app")} />
          <SystemGroup title="Databaser" icon={DatabaseIcon} items={dbs} link="/databaser" />
          <SystemGroup title="Kafka" icon={ArrowsCirclepathIcon} items={today.systems.filter((s) => s.kind === "kafka")} />
          <SystemGroup title="Eksterne" icon={CloudIcon} items={today.systems.filter((s) => s.kind === "ekstern")} />
        </div>
        {warnings.length ? (
          <Reveal>
            <div className={styles.warnList}>
              {warnings.map((w) => (
                <div key={w.name} className={styles.warnItem}>
                  <ExclamationmarkTriangleIcon aria-hidden style={{ color: "#c98a2b", fontSize: "1.2rem" }} />
                  <strong>{w.name}</strong>
                  <span className="muted">{w.detail}</span>
                  {w.latencyMs ? <span className="chip">{w.latencyMs} ms</span> : null}
                </div>
              ))}
            </div>
          </Reveal>
        ) : null}
      </Section>
    </>
  );
}

function MtdStat({ label, value, delta }: { label: string; value: number; delta?: number }) {
  return (
    <div className={styles.mtdStat}>
      <div className="muted">{label}</div>
      <div className={styles.mtdValue}>
        <CountUp value={value} />
      </div>
      {delta !== undefined ? (
        <span className={`delta ${delta >= 0 ? "delta--up" : "delta--down"}`} style={{ fontSize: "0.78rem" }}>
          {delta >= 0 ? "+" : ""}
          {delta.toLocaleString("nb-NO", { maximumFractionDigits: 1 })} % mot forrige mnd
        </span>
      ) : null}
    </div>
  );
}

function SystemGroup({ title, icon: Icon, items, link }: { title: string; icon: typeof LayersIcon; items: SystemCheck[]; link?: string }) {
  const bad = items.filter((i) => i.state !== "ok").length;
  return (
    <Reveal>
      <div className={`card ${styles.sysCard}`}>
        <div className={styles.sysHead}>
          <span className={styles.sysIcon}>
            <Icon aria-hidden />
          </span>
          <div style={{ flex: 1 }}>
            <div className={styles.sysTitle}>{title}</div>
            <div className="muted" style={{ fontSize: "0.82rem" }}>
              {bad ? `${bad} av ${items.length} med avvik` : `${items.length} av ${items.length} friske`}
            </div>
          </div>
          {link ? (
            <Link href={link} className={styles.sysLink} aria-label={`Gå til ${title}`}>
              <ArrowRightIcon aria-hidden />
            </Link>
          ) : null}
        </div>
        <ul className={styles.sysList}>
          {items.map((s, i) => (
            <motion.li
              key={s.name}
              initial={{ opacity: 0, x: -6 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
            >
              <Tooltip content={`${s.detail}${s.latencyMs ? ` · ${s.latencyMs} ms` : ""} · oppetid ${s.uptime.toLocaleString("nb-NO")} %`}>
                <div className={styles.sysRow}>
                  <span className={`dot ${s.state === "ok" ? "dot--ok" : s.state === "warn" ? "dot--warn" : "dot--down"}`} />
                  <span className={styles.sysName}>{s.name.replace(" (eux-web-app)", "")}</span>
                  <span className={styles.uptime}>
                    {s.history.map((h, j) => (
                      <span key={j} style={{ background: h >= 1 ? "#3a8a5f" : h > 0.5 ? "#c98a2b" : "#c4505c", opacity: 0.35 + (j / 24) * 0.65 }} />
                    ))}
                  </span>
                </div>
              </Tooltip>
            </motion.li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

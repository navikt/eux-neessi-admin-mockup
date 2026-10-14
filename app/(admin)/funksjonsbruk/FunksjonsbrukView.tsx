"use client";

import {
  BedIcon,
  ClockIcon,
  HandFingerIcon,
  LightningIcon,
  PersonGroupIcon,
  RocketIcon,
  SparklesIcon,
  TrendDownIcon,
  TrendFlatIcon,
  TrendUpIcon,
  XMarkIcon,
} from "@navikt/aksel-icons";
import { Button, Chips, Table, Tag, ToggleGroup, type SortState } from "@navikt/ds-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { CountUp } from "@/components/ui/CountUp";
import { HeroStat, PageHero } from "@/components/ui/PageHero";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import { Card, Section } from "@/components/ui/Section";
import { Sparkline } from "@/components/ui/Sparkline";
import { fmtDateShort, fmtDec, fmtInt, fmtPct } from "@/lib/format";
import type { AdoptionData, CategoryId, Feature, Verdict } from "./data";
import styles from "./funksjonsbruk.module.css";
import { Heatmap } from "./Heatmap";

interface Props {
  data: AdoptionData;
}

type Period = "8" | "12" | "26";

const VERDICT: Record<Verdict, { label: string; color: "success" | "info" | "warning"; icon: React.ReactNode }> = {
  TAR_AV: { label: "Tar av", color: "success", icon: <TrendUpIcon aria-hidden /> },
  LOVENDE: { label: "Lovende", color: "info", icon: <SparklesIcon aria-hidden /> },
  LAV: { label: "Lav bruk", color: "warning", icon: <TrendFlatIcon aria-hidden /> },
};

export function FunksjonsbrukView({ data }: Props) {
  const { weeks, features, categories, enheter, totals } = data;
  const [focusId, setFocusId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<CategoryId[]>([]);
  const [period, setPeriod] = useState<Period>("12");
  const [sort, setSort] = useState<SortState>({ orderBy: "wau", direction: "descending" });

  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const n = Number(period);
  const last = weeks.length - 1;
  const focus = features.find((f) => f.id === focusId) ?? null;
  const toggleFocus = (id: string) => setFocusId((cur) => (cur === id ? null : id));

  useEffect(() => {
    if (!focusId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusId]);
  const inCat = (f: Feature) => catFilter.length === 0 || catFilter.includes(f.category);

  const wauNow = totals.wau[last];
  const wauDelta = ((wauNow - totals.wau[last - 4]) / Math.max(1, totals.wau[last - 4])) * 100;

  const newFeatures = useMemo(() => features.filter((f) => f.isNew).sort((a, b) => b.launchIso.localeCompare(a.launchIso)), [features]);

  const board = (() => {
    const list = features.filter(inCat).map((f) => ({ f, wau: f.wau[last], share: f.wau[last] / Math.max(1, totals.activeUsers) }));
    const dir = sort.direction === "ascending" ? 1 : -1;
    const key = sort.orderBy;
    return list.sort((a, b) => {
      const v =
        key === "name"
          ? a.f.name.localeCompare(b.f.name, "nb")
          : key === "delta"
            ? a.f.delta - b.f.delta
            : key === "share"
              ? a.share - b.share
              : a.wau - b.wau;
      return v * dir;
    });
  })();
  const rankOf = useMemo(() => {
    const ranked = [...features].sort((a, b) => b.wau[last] - a.wau[last]);
    return Object.fromEntries(ranked.map((f, i) => [f.id, i + 1]));
  }, [features, last]);

  const areaData = useMemo(
    () =>
      weeks.slice(-n).map((w, idx) => {
        const i = weeks.length - n + idx;
        const row: Record<string, number | string> = { week: w.week.replace("Uke ", "U") };
        for (const c of categories) row[c.id] = features.filter((f) => f.category === c.id).reduce((s, f) => s + f.uses[i], 0);
        if (focus) row.focus = focus.uses[i];
        return row;
      }),
    [weeks, n, categories, features, focus],
  );

  const dormant = features.filter((f) => f.dormant && inCat(f)).sort((a, b) => a.delta - b.delta);

  return (
    <>
      <PageHero
        eyebrow={
          <>
            <HandFingerIcon aria-hidden /> Funksjonsbruk i nEESSI
          </>
        }
        title="Brukes det vi lager?"
        lead="Følg med på hvor mye hver del av nEESSI brukes, hvordan nye funksjoner tas i bruk, og hva som står og samler støv. Klikk på en funksjon for å se den i alle grafene."
        variant="teal"
      >
        <HeroStat label="Ukentlig aktive (WAU)" value={<CountUp value={wauNow} />} hint={`${wauDelta >= 0 ? "+" : ""}${fmtDec(wauDelta)} % siste 4 uker`} />
        <HeroStat label="Daglig aktive (DAU)" value={<CountUp value={totals.dau} />} hint={`${Math.round((totals.dau / Math.max(1, wauNow)) * 100)} % av ukentlige brukere`} />
        <HeroStat label="Funksjoner i bruk" value={<><CountUp value={totals.featuresInUse} /> <span className={styles.heroOf}>/ {features.length}</span></>} hint="brukt minst én gang denne uken" />
        <HeroStat label="Nyeste funksjon" value={<span className={styles.heroNewest}>{totals.newest.name}</span>} hint={`lansert ${fmtDateShort(totals.newest.launchIso)} · for ${totals.newest.daysAgo} dager siden`} />
      </PageHero>

      <div className={`sticky-filters ${styles.filters}`}>
        <Chips size="small">
          {categories.map((c) => (
            <Chips.Toggle
              key={c.id}
              selected={catFilter.includes(c.id)}
              onClick={() => setCatFilter((prev) => (prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]))}
            >
              {c.name}
            </Chips.Toggle>
          ))}
        </Chips>
        <div className={styles.filterRight}>
          <ToggleGroup size="small" value={period} onChange={(v) => setPeriod(v as Period)}>
            <ToggleGroup.Item value="8" label="8 uker" />
            <ToggleGroup.Item value="12" label="12 uker" />
            <ToggleGroup.Item value="26" label="26 uker" />
          </ToggleGroup>
        </div>
      </div>

      <Section kicker="Brukes den?" title="Nye funksjoner" lead="Adopsjon siden lansering, målt som andel av saksbehandlerne funksjonen er laget for.">
        <Stagger className="grid grid--3" gap={0.1}>
          {newFeatures.map((f) => (
            <StaggerItem key={f.id}>
              <Spotlight feature={f} color={catById[f.category].color} categoryName={catById[f.category].name} active={focusId === f.id} dimmed={Boolean(focusId && focusId !== f.id)} onClick={() => toggleFocus(f.id)} />
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <Section kicker="Topplisten" title="Mest brukte funksjoner" lead="Ukentlig aktive brukere per funksjon, endring siste 4 uker mot de 4 før, og andel av alle aktive saksbehandlere.">
        <div className="grid grid--main-side">
          <div className="card card--flush">
            <div className={`data-table ${styles.boardScroll}`}>
              <Table
                size="small"
                sort={sort}
                onSortChange={(key) =>
                  setSort((prev) => (prev.orderBy === key ? { orderBy: key, direction: prev.direction === "descending" ? "ascending" : "descending" } : { orderBy: key, direction: "descending" }))
                }
              >
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell className={styles.rankCell}>#</Table.HeaderCell>
                    <Table.ColumnHeader sortKey="name" sortable>
                      Funksjon
                    </Table.ColumnHeader>
                    <Table.HeaderCell>{n} uker</Table.HeaderCell>
                    <Table.ColumnHeader sortKey="wau" sortable align="right">
                      WAU
                    </Table.ColumnHeader>
                    <Table.ColumnHeader sortKey="delta" sortable align="right">
                      Endring
                    </Table.ColumnHeader>
                    <Table.ColumnHeader sortKey="share" sortable>
                      Andel
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {board.map(({ f, wau, share }, i) => {
                    const c = catById[f.category];
                    const isFocus = focusId === f.id;
                    return (
                      <Table.Row
                        key={f.id}
                        selected={isFocus}
                        className={`${styles.boardRow} ${focusId && !isFocus ? styles.dim : ""}`}
                        style={{ animationDelay: `${i * 30}ms` }}
                        onClick={() => toggleFocus(f.id)}
                      >
                        <Table.DataCell className={styles.rankCell}>
                          <span className={`${styles.rank} ${rankOf[f.id] <= 3 ? styles[`rank${rankOf[f.id]}`] : ""}`}>{rankOf[f.id]}</span>
                        </Table.DataCell>
                        <Table.DataCell>
                          <div className={styles.featureCell}>
                            <span className={styles.catDot} style={{ background: c.color, boxShadow: `0 0 0 3px color-mix(in srgb, ${c.color} 22%, transparent)` }} />
                            <div style={{ minWidth: 0 }}>
                              <div className={styles.featureName}>
                                {f.name}
                                {f.isNew ? (
                                  <Tag size="xsmall" variant="strong" data-color="success">
                                    Ny
                                  </Tag>
                                ) : null}
                              </div>
                              <div className={styles.featureCat}>{c.name}</div>
                            </div>
                          </div>
                        </Table.DataCell>
                        <Table.DataCell>
                          <div className={styles.sparkCell}>
                            <Sparkline data={f.wau.slice(-n)} color={c.color} height={30} width={96} />
                          </div>
                        </Table.DataCell>
                        <Table.DataCell align="right">
                          <strong className="tabular">{fmtInt(wau)}</strong>
                        </Table.DataCell>
                        <Table.DataCell align="right">
                          <DeltaBadge delta={f.delta} isNew={f.isNew} />
                        </Table.DataCell>
                        <Table.DataCell>
                          <div className={styles.shareCell}>
                            <span className="bar-track" style={{ flex: 1 }}>
                              <motion.span
                                className="bar-fill"
                                style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${c.color} 60%, #fff), ${c.color})` }}
                                initial={{ width: 0 }}
                                whileInView={{ width: `${share * 100}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.9, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                              />
                            </span>
                            <span className="tabular">{Math.round(share * 100)} %</span>
                          </div>
                        </Table.DataCell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
            </div>
          </div>
          <AnimatePresence mode="wait">
            {focus ? (
              <motion.div key={focus.id} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                <FocusPanel feature={focus} color={catById[focus.category].color} categoryName={catById[focus.category].name} weeks={weeks.map((w) => w.week)} n={n} enheter={enheter} onClose={() => setFocusId(null)} />
              </motion.div>
            ) : (
              <motion.div key="overall" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
                <OverallPanel
                  wau={totals.wau}
                  dau={totals.dauSeries}
                  weeks={weeks.map((w) => w.week)}
                  n={n}
                  activeUsers={totals.activeUsers}
                  features={features}
                  colorOf={(id) => catById[id].color}
                  onFocus={toggleFocus}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Section>

      <Section kicker="Over tid" title="Bruk per uke etter kategori" lead={focus ? `Stablet antall handlinger per uke – med ${focus.name} som egen linje.` : "Stablet antall handlinger per uke. Velg kategorier i filteret over, eller klikk en funksjon for å legge den over."}>
        <div className="grid grid--main-side">
          <Card
            title="Handlinger per uke"
            subtitle={n === 26 ? "Siste 26 uker · sommerferien gir en tydelig dupp i juli" : `Siste ${n} uker`}
            actions={
              <div className="legend">
                {categories.map((c) => (
                  <span key={c.id} className="legend__item" style={{ opacity: catFilter.length && !catFilter.includes(c.id) ? 0.35 : 1 }}>
                    <span className="legend__swatch" style={{ background: c.color }} />
                    {c.name}
                  </span>
                ))}
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={areaData} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  {categories.map((c) => (
                    <linearGradient key={c.id} id={`fb-grad-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c.color} stopOpacity={0.7} />
                      <stop offset="100%" stopColor={c.color} stopOpacity={0.38} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 4" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtInt(v)} width={56} />
                <Tooltip content={<ChartTooltip formatter={(v) => `${fmtInt(v)} handlinger`} />} />
                {categories.map((c) => {
                  const dim = (catFilter.length > 0 && !catFilter.includes(c.id)) || (focus !== null && focus.category !== c.id);
                  return (
                    <Area
                      key={c.id}
                      type="monotone"
                      dataKey={c.id}
                      name={c.name}
                      stackId="1"
                      stroke={c.color}
                      strokeWidth={1.5}
                      fill={`url(#fb-grad-${c.id})`}
                      fillOpacity={dim ? 0.18 : 1}
                      strokeOpacity={dim ? 0.3 : 1}
                      animationDuration={900}
                    />
                  );
                })}
                {focus ? (
                  <Line type="monotone" dataKey="focus" name={focus.name} stroke="#c0765d" strokeWidth={2.5} strokeDasharray="6 4" dot={false} className={styles.focusLine} animationDuration={700} />
                ) : null}
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title={<span className={styles.dormantTitle}><BedIcon aria-hidden /> Sovende funksjoner</span>} subtitle="Lav eller fallende bruk – trenger de et dytt, eller kan de fjernes?">
            <div className={styles.dormantList}>
              {dormant.length === 0 ? <div className="empty">Ingen sovende funksjoner i valgt kategori</div> : null}
              {dormant.map((f, i) => {
                const c = catById[f.category];
                return (
                  <Reveal key={f.id} delay={i * 0.06}>
                    <button type="button" className={`${styles.dormantItem} ${focusId === f.id ? styles.dormantActive : ""}`} onClick={() => toggleFocus(f.id)}>
                      <div className={styles.dormantHead}>
                        <span className={styles.zzz} aria-hidden>
                          z<span>z</span>
                          <span>z</span>
                        </span>
                        <strong>{f.name}</strong>
                        <DeltaBadge delta={f.delta} isNew={false} />
                      </div>
                      <div className={styles.dormantStats}>
                        <span>
                          <PersonGroupIcon aria-hidden /> {fmtInt(f.wau[last])} brukere/uke
                        </span>
                        <span>
                          <span className="legend__swatch" style={{ background: c.color }} /> {Math.round(f.adoption * 100)} % av målgruppen
                        </span>
                        <Sparkline data={f.wau.slice(-n)} color="#9aa1ab" height={22} width={70} fill={false} className={styles.dormantSpark} />
                      </div>
                      {f.suggestion ? (
                        <div className={styles.suggestion}>
                          <LightningIcon aria-hidden /> {f.suggestion}
                        </div>
                      ) : null}
                    </button>
                  </Reveal>
                );
              })}
            </div>
          </Card>
        </div>
      </Section>

      <Section kicker="Hvem bruker hva?" title="Bruk per enhet" lead="Handlinger per saksbehandler per uke, siste 4 uker. Mørkere celle betyr mer intensiv bruk. Hold over en celle for detaljer.">
        <Card>
          <Heatmap features={features.filter(inCat)} enheter={enheter} categoryColor={(id) => catById[id].color} focusId={focusId} onFocus={toggleFocus} />
        </Card>
      </Section>

      <AnimatePresence>
        {focus ? (
          <motion.div
            key="focusbar"
            className={styles.focusBar}
            style={{ "--accent": catById[focus.category].color } as React.CSSProperties}
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <span className={styles.focusBarDot} />
            <span className={styles.focusBarLabel}>Fokus</span>
            <motion.strong key={focus.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              {focus.name}
            </motion.strong>
            <span className={styles.focusBarMeta}>
              {fmtInt(focus.wau[focus.wau.length - 1])} brukere/uke · {focus.uniqueEnheter} enheter
            </span>
            <button type="button" onClick={() => setFocusId(null)} className={styles.focusBarClose}>
              <XMarkIcon aria-hidden /> Nullstill <kbd>Esc</kbd>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function DeltaBadge({ delta, isNew }: { delta: number; isNew: boolean }) {
  if (isNew && delta > 150) {
    return (
      <span className={`delta delta--up ${styles.deltaNew}`}>
        <SparklesIcon aria-hidden /> ny
      </span>
    );
  }
  const Icon = delta > 3 ? TrendUpIcon : delta < -3 ? TrendDownIcon : TrendFlatIcon;
  const cls = delta > 3 ? "delta--up" : delta < -3 ? "delta--down" : styles.deltaFlat;
  return (
    <span className={`delta ${cls}`}>
      <Icon aria-hidden />
      {delta > 0 ? "+" : ""}
      {fmtDec(delta)} %
    </span>
  );
}

function Spotlight({
  feature: f,
  color,
  categoryName,
  active,
  dimmed,
  onClick,
}: {
  feature: Feature;
  color: string;
  categoryName: string;
  active: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  const verdict = f.verdict ? VERDICT[f.verdict] : null;
  const curve = f.adoptionCurve ?? [];
  const weeksSince = Math.floor(f.daysSinceLaunch / 7);
  const latestPct = (curve[curve.length - 1]?.pct ?? 0) * 100;
  const gradId = `spot-${f.id}`;
  return (
    <motion.button
      type="button"
      className={`card card--interactive ${styles.spot} ${active ? styles.spotActive : ""} ${dimmed ? styles.dim : ""}`}
      style={{ "--accent": color } as React.CSSProperties}
      onClick={onClick}
      whileTap={{ scale: 0.985 }}
    >
      <div className={styles.spotGlow} />
      <div className={styles.spotTop}>
        <span className={styles.spotCat}>
          <span className="legend__swatch" style={{ background: color }} /> {categoryName}
        </span>
        {verdict ? (
          <motion.span className={styles.verdict} initial={{ scale: 0.9, opacity: 0, y: 4 }} whileInView={{ scale: 1, opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.35 }}>
            <Tag size="small" variant="moderate" data-color={verdict.color} icon={verdict.icon}>
              {verdict.label}
            </Tag>
          </motion.span>
        ) : null}
      </div>
      <div className={styles.spotName}>{f.name}</div>
      <div className={styles.spotLaunch}>
        <RocketIcon aria-hidden /> Lansert {fmtDateShort(f.launchIso)} · {weeksSince === 0 ? "denne uken" : `${weeksSince} ${weeksSince === 1 ? "uke" : "uker"} siden`}
      </div>
      <div className={styles.spotBig}>
        <span className={styles.spotPct}>
          <CountUp value={latestPct} decimals={0} suffix=" %" />
        </span>
        <span className={styles.spotPctLabel}>
          av målgruppen
          <br />
          <span className="muted">{fmtInt(f.targetUsers)} saksbehandlere</span>
        </span>
      </div>
      <div className={styles.spotChart}>
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={curve.map((p) => ({ ...p, pct: Math.round(p.pct * 1000) / 10 }))} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 4" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} />
            <ReferenceLine y={50} stroke="#9aa1ab" strokeDasharray="4 4" />
            <Tooltip content={<ChartTooltip formatter={(v) => fmtPct(v, 1)} />} />
            <Area type="monotone" dataKey="pct" name="Andel av målgruppen" stroke={color} strokeWidth={2.5} fill={`url(#${gradId})`} dot={{ r: 3, fill: color, strokeWidth: 0 }} animationDuration={1400} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.spotFoot}>
        <div>
          <ClockIcon aria-hidden />
          <span>
            <strong>{fmtDec(f.timeToFirstUse)} d</strong>
            <span className="muted"> til første bruk</span>
          </span>
        </div>
        <div>
          <PersonGroupIcon aria-hidden />
          <span>
            <strong>{fmtInt(f.wau[f.wau.length - 1])}</strong>
            <span className="muted"> brukere/uke</span>
          </span>
        </div>
        <div>
          <span className={styles.enhetCount}>{f.uniqueEnheter}</span>
          <span className="muted">enheter</span>
        </div>
      </div>
    </motion.button>
  );
}

function OverallPanel({
  wau,
  dau,
  weeks,
  n,
  activeUsers,
  features,
  colorOf,
  onFocus,
}: {
  wau: number[];
  dau: number[];
  weeks: string[];
  n: number;
  activeUsers: number;
  features: Feature[];
  colorOf: (id: CategoryId) => string;
  onFocus: (id: string) => void;
}) {
  const established = features.filter((f) => f.delta < 900);
  const risers = [...established].sort((a, b) => b.delta - a.delta).slice(0, 3);
  const fallers = [...established].sort((a, b) => a.delta - b.delta).slice(0, 3);
  const data = weeks.slice(-n).map((w, i) => ({ week: w.replace("Uke ", "U"), wau: wau[wau.length - n + i], dau: dau[dau.length - n + i] }));
  return (
    <Card title="Aktive brukere i nEESSI" subtitle={`Ukentlig og daglig, av ${fmtInt(activeUsers)} aktive saksbehandlere`} className={styles.sidePanel}>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="fb-wau" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3f8f8a" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#3f8f8a" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="fb-dau" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2a6cb3" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#2a6cb3" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 4" />
          <XAxis dataKey="week" tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip formatter={(v) => `${fmtInt(v)} brukere`} />} />
          <Area type="monotone" dataKey="wau" name="WAU" stroke="#3f8f8a" strokeWidth={2} fill="url(#fb-wau)" />
          <Area type="monotone" dataKey="dau" name="DAU" stroke="#2a6cb3" strokeWidth={1.75} fill="url(#fb-dau)" />
        </AreaChart>
      </ResponsiveContainer>
      <div className={styles.movers}>
        {[
          { title: "Største økning", list: risers },
          { title: "Største nedgang", list: fallers },
        ].map((g) => (
          <div key={g.title}>
            <div className={styles.focusEnheterHead}>{g.title}</div>
            {g.list.map((f, i) => (
              <motion.button
                key={f.id}
                type="button"
                className={styles.moverRow}
                onClick={() => onFocus(f.id)}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
              >
                <span className={styles.catDot} style={{ background: colorOf(f.category) }} />
                <span className={styles.moverName}>{f.name}</span>
                <DeltaBadge delta={f.delta} isNew={false} />
              </motion.button>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.hintBox}>
        <HandFingerIcon aria-hidden />
        <span>Klikk på en funksjon i topplisten, et spotlight-kort eller en rad i varmekartet for å se detaljer her.</span>
      </div>
    </Card>
  );
}

function FocusPanel({
  feature: f,
  color,
  categoryName,
  weeks,
  n,
  enheter,
  onClose,
}: {
  feature: Feature;
  color: string;
  categoryName: string;
  weeks: string[];
  n: number;
  enheter: { id: string; shortName: string; users: number }[];
  onClose: () => void;
}) {
  const data = weeks.slice(-n).map((w, i) => ({ week: w.replace("Uke ", "U"), wau: f.wau[f.wau.length - n + i] }));
  const enhetUsers = (id: string) => Math.max(1, enheter.find((e) => e.id === id)?.users ?? 1);
  const top = [...f.byEnhet]
    .filter((b) => b.users > 0)
    .sort((a, b) => b.users / enhetUsers(b.enhetId) - a.users / enhetUsers(a.enhetId) || b.users - a.users)
    .slice(0, 5);
  const unused = f.byEnhet.filter((b) => b.users === 0);
  const enhetName = (id: string) => enheter.find((e) => e.id === id)?.shortName ?? id;
  const usesNow = f.uses[f.uses.length - 1];
  const gradId = `focus-${f.id}`;
  return (
    <div className={`card ${styles.sidePanel} ${styles.focusPanel}`} style={{ "--accent": color } as React.CSSProperties}>
      <div className="card__header">
        <div>
          <span className={styles.spotCat}>
            <span className="legend__swatch" style={{ background: color }} /> {categoryName}
          </span>
          <h3 className="card__title" style={{ marginTop: 4 }}>
            {f.name}
          </h3>
          <p className="card__subtitle">{f.description}</p>
        </div>
        <Button size="xsmall" variant="tertiary" icon={<XMarkIcon aria-hidden />} onClick={onClose} aria-label="Lukk fokus" />
      </div>
      <div className={styles.focusStats}>
        <div>
          <span className="muted">WAU</span>
          <strong>
            <CountUp value={f.wau[f.wau.length - 1]} />
          </strong>
        </div>
        <div>
          <span className="muted">Handlinger/uke</span>
          <strong>
            <CountUp value={usesNow} />
          </strong>
        </div>
        <div>
          <span className="muted">Målgruppe</span>
          <strong>
            <CountUp value={f.adoption * 100} suffix=" %" />
          </strong>
        </div>
        <div>
          <span className="muted">Endring</span>
          <DeltaBadge delta={f.delta} isNew={f.isNew} />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <AreaChart data={data} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 4" />
          <XAxis dataKey="week" tickLine={false} axisLine={false} interval="preserveStartEnd" tick={{ fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <Tooltip content={<ChartTooltip formatter={(v) => `${fmtInt(v)} brukere`} />} />
          <Area type="monotone" dataKey="wau" name="Ukentlige brukere" stroke={color} strokeWidth={2.5} fill={`url(#${gradId})`} />
        </AreaChart>
      </ResponsiveContainer>
      <div className={styles.focusEnheter}>
        <div className={styles.focusEnheterHead}>Mest brukt hos</div>
        {top.length === 0 ? <div className="muted">Ingen bruk ennå.</div> : null}
        {top.map((b, i) => {
          const share = b.users / enhetUsers(b.enhetId);
          return (
            <div key={b.enhetId} className={styles.focusEnhetRow}>
              <span className={styles.focusEnhetName}>
                <span className="mono muted">{b.enhetId}</span> {enhetName(b.enhetId)}
              </span>
              <span className="bar-track">
                <motion.span className="bar-fill" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${share * 100}%` }} transition={{ duration: 0.8, delay: 0.1 + i * 0.06 }} />
              </span>
              <span className="tabular muted">{Math.round(share * 100)} %</span>
            </div>
          );
        })}
      </div>
      {unused.length > 0 ? (
        <div className={styles.unused}>
          <div className={styles.focusEnheterHead}>Ikke tatt i bruk hos</div>
          <div className={styles.unusedChips}>
            {unused.map((b) => (
              <span key={b.enhetId}>
                <span className="mono">{b.enhetId}</span> {enhetName(b.enhetId)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className={styles.focusRoute}>
        <span className="muted">Rute i nEESSI</span> <code>{f.route}</code>
        <span className="muted" style={{ marginLeft: "auto" }}>
          {f.isNew ? `Lansert ${fmtDateShort(f.launchIso)}` : `I bruk siden ${f.launchIso.slice(0, 4)}`}
        </span>
      </div>
    </div>
  );
}

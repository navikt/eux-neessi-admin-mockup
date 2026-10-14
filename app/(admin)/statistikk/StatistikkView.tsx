"use client";

import { DownloadIcon, XMarkIcon } from "@navikt/aksel-icons";
import { Button, Chips, Select, ToggleGroup } from "@navikt/ds-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { EuropeMap } from "@/components/charts/EuropeMap";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { CountUp } from "@/components/ui/CountUp";
import { Flag } from "@/components/ui/Flag";
import { HeroStat, PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { Card, Section } from "@/components/ui/Section";
import { useToasts } from "@/components/ui/Toast";
import type { EuropeMapData } from "@/lib/geo/europe";
import { fmtCompact, fmtDays, fmtDec, fmtInt, fmtPct, pctChange } from "@/lib/format";
import { COUNTRIES, COUNTRY_BY_CODE, ENHET_BY_ID, SECTORS, SECTOR_BY_CODE, SED_BY_TYPE, type CountryCode, type SectorCode } from "@/lib/mock/reference";
import { groupBy, sumRows, type StatRow, type StatsDataset } from "@/lib/mock/statsTypes";
import styles from "./statistikk.module.css";

type Periode = "12m" | "3m" | "ytd" | "mnd";
type MapMetric = "total" | "sent" | "recv" | "balance";

interface Props {
  stats: StatsDataset;
  map: EuropeMapData;
  initialLand: CountryCode | null;
  initialPeriode: Periode;
  initialSektor: string[];
}

const PERIODE_LABEL: Record<Periode, string> = {
  "12m": "Siste 12 måneder",
  "3m": "Siste 3 måneder",
  ytd: "Hittil i år",
  mnd: "Denne måneden",
};

const WEEKDAYS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

function monthsFor(p: Periode, stats: StatsDataset): number[] {
  const last = stats.months.length - 1;
  if (p === "mnd") return [last];
  if (p === "3m") return [last - 3, last - 2, last - 1];
  if (p === "ytd") {
    const year = stats.months[last].key.slice(0, 4);
    return stats.months.map((m, i) => (m.key.startsWith(year) ? i : -1)).filter((i) => i >= 0);
  }
  return Array.from({ length: 12 }, (_, i) => i);
}

function prevMonthsFor(p: Periode, stats: StatsDataset): number[] | null {
  const last = stats.months.length - 1;
  if (p === "3m") return [last - 6, last - 5, last - 4];
  if (p === "mnd") return [last - 1];
  return null;
}

export function StatistikkView({ stats, map, initialLand, initialPeriode, initialSektor }: Props) {
  const [periode, setPeriode] = useState<Periode>(initialPeriode);
  const [sectors, setSectors] = useState<SectorCode[]>(initialSektor.filter((s) => SECTOR_BY_CODE[s as SectorCode]) as SectorCode[]);
  const [land, setLand] = useState<CountryCode | null>(initialLand);
  const [metric, setMetric] = useState<MapMetric>("total");
  const [flow, setFlow] = useState<"sent" | "recv">("sent");
  const { toasts, push } = useToasts();

  useEffect(() => {
    const params = new URLSearchParams();
    if (periode !== "12m") params.set("periode", periode);
    if (sectors.length) params.set("sektor", sectors.join(","));
    if (land) params.set("land", land);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [periode, sectors, land]);

  const months = useMemo(() => monthsFor(periode, stats), [periode, stats]);
  const prevMonths = useMemo(() => prevMonthsFor(periode, stats), [periode, stats]);
  const monthSet = useMemo(() => new Set(months), [months]);
  const sectorOk = (s: SectorCode) => !sectors.length || sectors.includes(s);

  const base = useMemo(() => stats.rows.filter((r) => sectorOk(r.s)), [stats.rows, sectors]); // eslint-disable-line react-hooks/exhaustive-deps
  const inPeriod = useMemo(() => base.filter((r) => monthSet.has(r.m)), [base, monthSet]);
  const scoped = useMemo(() => (land ? inPeriod.filter((r) => r.c === land) : inPeriod), [inPeriod, land]);
  const totals = useMemo(() => sumRows(scoped), [scoped]);
  const prevTotals = useMemo(() => {
    if (!prevMonths) return null;
    const set = new Set(prevMonths);
    return sumRows(base.filter((r) => set.has(r.m) && (!land || r.c === land)));
  }, [base, prevMonths, land]);
  const countriesActive = useMemo(() => new Set(inPeriod.map((r) => r.c)).size, [inPeriod]);

  const byCountry = useMemo(() => {
    const g = groupBy(inPeriod, (r) => r.c);
    return [...g.entries()].map(([code, t]) => ({ code, ...t })).sort((a, b) => b.sent + b.recv - (a.sent + a.recv));
  }, [inPeriod]);

  const mapValues = useMemo(() => {
    const out: Partial<Record<CountryCode, number>> = {};
    for (const c of byCountry) {
      out[c.code] = metric === "sent" ? c.sent : metric === "recv" ? c.recv : metric === "balance" ? Math.max(0, c.recv - c.sent) : c.sent + c.recv;
    }
    return out;
  }, [byCountry, metric]);

  const monthly = useMemo(() => {
    const scopedAll = land ? base.filter((r) => r.c === land) : base;
    return stats.months.map((m, i) => {
      const point: Record<string, number | string | boolean> = { label: m.short, partial: m.partial };
      for (const s of SECTORS) point[s.code] = 0;
      for (const r of scopedAll) if (r.m === i) point[r.s] = (point[r.s] as number) + r[flow];
      // Scale partial month to a full-month estimate so the curve doesn't dive.
      return point;
    });
  }, [base, land, stats.months, flow]);
  const visibleSectors = SECTORS.filter((s) => sectorOk(s.code));

  const responseTrend = useMemo(() => {
    const scopedAll = land ? base.filter((r) => r.c === land) : base;
    return stats.months.map((m, i) => {
      const rows = scopedAll.filter((r) => r.m === i);
      const point: Record<string, number | string> = { label: m.short };
      const all = sumRows(rows);
      point.alle = Math.round(all.nDays * 10) / 10;
      point.frist = Math.round(all.nOnTime * 10) / 10;
      point.dem = Math.round(all.tDays * 10) / 10;
      for (const s of visibleSectors) {
        const t = sumRows(rows.filter((r) => r.s === s.code));
        point[s.code] = Math.round(t.nDays * 10) / 10;
      }
      return point;
    });
  }, [base, land, stats.months, visibleSectors]);
  const firstFull = responseTrend[0];
  const lastFull = responseTrend[stats.months.length - 2];
  const speedChange = pctChange(Number(lastFull.alle), Number(firstFull.alle));

  const scatter = useMemo(
    () =>
      byCountry.map((c) => ({
        code: c.code,
        name: COUNTRY_BY_CODE[c.code].name,
        x: Math.round(c.nDays * 10) / 10,
        y: Math.round(c.tDays * 10) / 10,
        z: c.sent + c.recv,
      })),
    [byCountry],
  );
  const scatterMax = Math.ceil(Math.max(10, ...scatter.map((s) => Math.max(s.x, s.y))) / 10) * 10;
  const slowerThanUs = scatter.filter((s) => s.y > s.x).length;

  const enheter = useMemo(() => {
    const m = new Map<string, { ans: number; days: number; onTime: number }>();
    for (const r of stats.enhetRows) {
      if (!monthSet.has(r.m)) continue;
      const e = m.get(r.e) ?? { ans: 0, days: 0, onTime: 0 };
      e.ans += r.ans;
      e.days += r.daysWeighted;
      e.onTime += r.onTimeWeighted;
      m.set(r.e, e);
    }
    return [...m.entries()]
      .map(([id, e]) => ({ id, ans: e.ans, days: e.days / Math.max(1, e.ans), onTime: e.onTime / Math.max(1, e.ans) }))
      .sort((a, b) => b.ans - a.ans);
  }, [stats.enhetRows, monthSet]);
  const maxEnhet = Math.max(1, ...enheter.map((e) => e.ans));

  const sedTop = useMemo(
    () =>
      stats.sedTypes
        .filter((s) => sectorOk(SED_BY_TYPE[s.type]?.sector))
        .slice(0, 12)
        .map((s) => ({ ...s, name: SED_BY_TYPE[s.type]?.name ?? s.type })),
    [stats.sedTypes, sectors], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const rhythmMax = Math.max(1, ...stats.rhythm.flat());
  const periodLabel = periode === "mnd" ? stats.months[stats.months.length - 1].label : PERIODE_LABEL[periode];
  const highlight = { from: stats.months[months[0]].short, to: stats.months[months[months.length - 1]].short };

  const selected = land ? byCountry.find((c) => c.code === land) : null;
  const selectedSectors = useMemo(() => {
    if (!land) return [];
    const g = groupBy(inPeriod.filter((r) => r.c === land), (r) => r.s);
    return [...g.entries()].map(([s, t]) => ({ s, v: t.sent + t.recv })).sort((a, b) => b.v - a.v);
  }, [inPeriod, land]);

  return (
    <>
      <PageHero
        variant="ocean"
        eyebrow="Statistikk"
        title={land ? <>Norge og {COUNTRY_BY_CODE[land].name}</> : "Norge i EESSI"}
        lead={
          <>
            En reise gjennom hvordan Norge leverer i det europeiske trygdesamarbeidet: hvem vi utveksler med, hvor raskt vi svarer – og hvor raskt de svarer oss. Viser {periodLabel.toLowerCase()}
            {sectors.length ? ` for ${sectors.map((s) => SECTOR_BY_CODE[s].name.toLowerCase()).join(", ")}` : ""}.
          </>
        }
        actions={
          <Button
            size="small"
            variant="secondary-neutral"
            icon={<DownloadIcon aria-hidden />}
            className={styles.heroBtn}
            onClick={() => push("Rapport generert", `«EESSI-statistikk ${periodLabel.toLowerCase()}» er lastet ned som PDF.`)}
          >
            Last ned rapport
          </Button>
        }
      >
        <HeroStat label="SED-er sendt" value={<CountUp value={totals.sent} />} hint={prevTotals ? <Delta v={pctChange(totals.sent, prevTotals.sent)} /> : "fra Norge"} />
        <HeroStat label="SED-er mottatt" value={<CountUp value={totals.recv} />} hint={prevTotals ? <Delta v={pctChange(totals.recv, prevTotals.recv)} /> : "til Norge"} />
        <HeroStat label="BUC-er opprettet" value={<CountUp value={totals.bucNew} />} hint={`+ ${fmtInt(totals.bucIn)} startet av andre land`} />
        <HeroStat label="Median svartid" value={<CountUp value={totals.nDays} decimals={1} suffix=" d" />} hint={prevTotals ? <Delta v={pctChange(totals.nDays, prevTotals.nDays)} invert /> : "Norges svar på forespørsler"} />
        <HeroStat label="Svar innen frist" value={<CountUp value={totals.nOnTime} decimals={1} suffix=" %" />} hint={land ? "for dette landet" : `${countriesActive} land i utvekslingen`} />
      </PageHero>

      <div className="sticky-filters">
        <div className="toolbar">
          <ToggleGroup size="small" value={periode} onChange={(v) => setPeriode(v as Periode)} label="">
            {(Object.keys(PERIODE_LABEL) as Periode[]).map((p) => (
              <ToggleGroup.Item key={p} value={p} label={PERIODE_LABEL[p]} />
            ))}
          </ToggleGroup>
          <Select label="Land" hideLabel size="small" value={land ?? ""} onChange={(e) => setLand((e.target.value || null) as CountryCode | null)} style={{ minWidth: 180 }}>
            <option value="">Alle land</option>
            {[...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name, "nb")).map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
          <AnimatePresence>
            {land || sectors.length || periode !== "12m" ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button
                  size="xsmall"
                  variant="tertiary"
                  icon={<XMarkIcon aria-hidden />}
                  onClick={() => {
                    setLand(null);
                    setSectors([]);
                    setPeriode("12m");
                  }}
                >
                  Nullstill
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <div style={{ marginTop: 10 }}>
          <Chips size="small">
            {SECTORS.map((s) => (
              <Chips.Toggle
                key={s.code}
                checkmark={false}
                selected={sectors.includes(s.code)}
                onClick={() => setSectors((prev) => (prev.includes(s.code) ? prev.filter((x) => x !== s.code) : [...prev, s.code]))}
              >
                {`${s.code} · ${s.name}`}
              </Chips.Toggle>
            ))}
          </Chips>
        </div>
      </div>

      <Section
        kicker="1 · Hvem utveksler vi med?"
        title="Europakartet sett fra Oslo"
        lead="Sverige, Polen og Danmark dominerer – naboland og arbeidsinnvandring setter preg på utvekslingen. Klikk på et land for å se forholdet vårt til det."
        actions={
          <ToggleGroup size="small" value={metric} onChange={(v) => setMetric(v as MapMetric)} label="">
            <ToggleGroup.Item value="total" label="Totalt" />
            <ToggleGroup.Item value="sent" label="Sendt" />
            <ToggleGroup.Item value="recv" label="Mottatt" />
            <ToggleGroup.Item value="balance" label="Overskudd inn" />
          </ToggleGroup>
        }
      >
        <div className="grid grid--main-side">
          <Card className={styles.mapCard}>
            <EuropeMap
              map={map}
              values={mapValues}
              selected={land}
              onSelect={setLand}
              flows={land ? 0 : 8}
              palette={metric === "sent" ? ["#bfdbfe", "#2563eb", "#1e3a8a"] : metric === "recv" ? ["#a7f3d0", "#10b981", "#064e3b"] : metric === "balance" ? ["#fde68a", "#f97316", "#7c2d12"] : ["#c7d2fe", "#6366f1", "#312e81"]}
              tooltip={(code) => {
                const c = byCountry.find((x) => x.code === code);
                if (!c) return null;
                return (
                  <div style={{ display: "grid", gap: 2 }}>
                    <span>Sendt {fmtInt(c.sent)} · mottatt {fmtInt(c.recv)}</span>
                    <span>Vi svarer på {fmtDays(c.nDays)} · de på {fmtDays(c.tDays)}</span>
                  </div>
                );
              }}
            />
          </Card>
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected.code} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <Card className={styles.profile}>
                  <div className={styles.profileHead}>
                    <Flag code={selected.code} size="lg" />
                    <div style={{ flex: 1 }}>
                      <div className="section__kicker">Landprofil</div>
                      <h3 className="card__title" style={{ margin: 0, fontSize: "1.4rem" }}>
                        {COUNTRY_BY_CODE[selected.code].name}
                      </h3>
                    </div>
                    <Button size="xsmall" variant="tertiary" icon={<XMarkIcon aria-hidden />} onClick={() => setLand(null)}>
                      Lukk
                    </Button>
                  </div>
                  <div className={styles.profileStats}>
                    <ProfileStat label="Sendt" value={fmtInt(selected.sent)} color="#2563eb" />
                    <ProfileStat label="Mottatt" value={fmtInt(selected.recv)} color="#10b981" />
                    <ProfileStat label="Vi svarer på" value={fmtDays(selected.nDays)} />
                    <ProfileStat label="De svarer på" value={fmtDays(selected.tDays)} />
                    <ProfileStat label="Vi innen frist" value={fmtPct(selected.nOnTime)} />
                    <ProfileStat label="De innen frist" value={fmtPct(selected.tOnTime)} />
                  </div>
                  <div className="muted" style={{ fontSize: "0.82rem", margin: "14px 0 8px" }}>
                    Sektorfordeling
                  </div>
                  <div className={styles.sectorBar}>
                    {selectedSectors.map((s) => (
                      <motion.span
                        key={s.s}
                        title={`${SECTOR_BY_CODE[s.s].name}: ${fmtInt(s.v)}`}
                        initial={{ flexGrow: 0 }}
                        animate={{ flexGrow: s.v }}
                        transition={{ duration: 0.8 }}
                        style={{ background: SECTOR_BY_CODE[s.s].color }}
                      />
                    ))}
                  </div>
                  <div className="legend" style={{ marginTop: 10 }}>
                    {selectedSectors.slice(0, 5).map((s) => (
                      <span key={s.s} className="legend__item">
                        <span className="legend__swatch" style={{ background: SECTOR_BY_CODE[s.s].color }} />
                        {SECTOR_BY_CODE[s.s].name}
                      </span>
                    ))}
                  </div>
                  <p className={styles.insight}>
                    {selected.tDays > selected.nDays
                      ? `${COUNTRY_BY_CODE[selected.code].name} bruker i snitt ${fmtDec(selected.tDays - selected.nDays)} dager lenger på å svare oss enn vi bruker på å svare dem.`
                      : `Vi bruker ${fmtDec(selected.nDays - selected.tDays)} dager lenger på å svare ${COUNTRY_BY_CODE[selected.code].name} enn de bruker på å svare oss.`}
                  </p>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card title="Topp 12 land" subtitle="Sendt (blå) og mottatt (grønn)">
                  <div className={styles.rank}>
                    {byCountry.slice(0, 12).map((c, i) => {
                      const max = byCountry[0].sent + byCountry[0].recv;
                      return (
                        <button key={c.code} className={styles.rankRow} onClick={() => setLand(c.code)}>
                          <span className={styles.rankNo}>{i + 1}</span>
                          <Flag code={c.code} />
                          <span className={styles.rankName}>{COUNTRY_BY_CODE[c.code].name}</span>
                          <span className={styles.rankBar}>
                            <motion.span
                              initial={{ width: 0 }}
                              whileInView={{ width: `${(c.sent / max) * 100}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.8, delay: i * 0.04 }}
                              style={{ background: "#2563eb" }}
                            />
                            <motion.span
                              initial={{ width: 0 }}
                              whileInView={{ width: `${(c.recv / max) * 100}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.8, delay: i * 0.04 + 0.1 }}
                              style={{ background: "#10b981" }}
                            />
                          </span>
                          <span className={styles.rankNum}>{fmtCompact(c.sent + c.recv)}</span>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Section>

      <Section
        kicker="2 · Måned for måned"
        title="Volumet gjennom året"
        lead="Sommerferien setter tydelige spor i juli, og desember roer seg ned. Den markerte perioden er utvalget ditt; inneværende måned er foreløpig."
        actions={
          <ToggleGroup size="small" value={flow} onChange={(v) => setFlow(v as "sent" | "recv")} label="">
            <ToggleGroup.Item value="sent" label="Sendt" />
            <ToggleGroup.Item value="recv" label="Mottatt" />
          </ToggleGroup>
        }
      >
        <Card>
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={monthly} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                {SECTORS.map((s) => (
                  <linearGradient key={s.code} id={`g-${s.code}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.85} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0.35} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtCompact(v)} width={52} />
              <ReTooltip content={<ChartTooltip formatter={(v) => fmtInt(v)} />} />
              <ReferenceArea x1={highlight.from} x2={highlight.to} fill="#6366f1" fillOpacity={0.06} stroke="#6366f1" strokeOpacity={0.25} strokeDasharray="4 4" />
              {visibleSectors.map((s) => (
                <Area key={s.code} type="monotone" dataKey={s.code} name={s.name} stackId="1" stroke={s.color} strokeWidth={1.5} fill={`url(#g-${s.code})`} animationDuration={900} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          <div className="legend" style={{ marginTop: 8 }}>
            {visibleSectors.map((s) => (
              <span key={s.code} className="legend__item">
                <span className="legend__swatch" style={{ background: s.color }} /> {s.name}
              </span>
            ))}
          </div>
        </Card>
      </Section>

      <Section
        kicker="3 · Hvor raskt svarer vi?"
        title={
          <>
            Svartiden er {speedChange < 0 ? "redusert" : "økt"} med{" "}
            <span className="gradient-text">{fmtDec(Math.abs(speedChange))} %</span> på ett år
          </>
        }
        lead={`Median antall dager fra Norge mottar en forespørsel til svaret er sendt, per sektor. ${firstFull.label}: ${fmtDays(Number(firstFull.alle))} → ${lastFull.label}: ${fmtDays(Number(lastFull.alle))}.`}
      >
        <div className="grid grid--main-side">
          <Card title="Median svartid per sektor" subtitle="Dager · tykk linje er alle sektorer samlet">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={responseTrend} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} unit=" d" width={52} />
                <ReTooltip content={<ChartTooltip formatter={(v) => fmtDays(v)} />} />
                {visibleSectors.map((s) => (
                  <Line key={s.code} type="monotone" dataKey={s.code} name={s.name} stroke={s.color} strokeWidth={1.5} dot={false} strokeOpacity={0.75} />
                ))}
                <Line type="monotone" dataKey="alle" name="Alle sektorer" stroke="#0f172a" strokeWidth={3.5} dot={{ r: 3 }} className={styles.allLine} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Andel svar innen frist" subtitle="Norges svar, alle valgte sektorer">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={responseTrend} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="fristFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} domain={[70, 100]} unit="%" fontSize={11} />
                <ReTooltip content={<ChartTooltip formatter={(v) => fmtPct(v)} />} />
                <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Mål 90 %", position: "insideBottomRight", fill: "#f59e0b", fontSize: 11 }} />
                <Area type="monotone" dataKey="frist" name="Innen frist" stroke="#10b981" strokeWidth={2.5} fill="url(#fristFill)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className={styles.bigFact}>
              <div className={styles.bigFactValue}>
                <CountUp value={Number(lastFull.frist)} decimals={1} suffix=" %" />
              </div>
              <div className="muted">av forespørslene ble besvart innen fristen i {stats.months[stats.months.length - 2].label}.</div>
            </div>
          </Card>
        </div>
      </Section>

      <Section
        kicker="4 · Gjensidighet"
        title="Vi mot dem"
        lead={`Hvert land er en boble: x-aksen er hvor raskt vi svarer dem, y-aksen hvor raskt de svarer oss. Over diagonalen er landet tregere enn oss – det gjelder ${slowerThanUs} av ${scatter.length} land.`}
      >
        <Card>
          <ResponsiveContainer width="100%" height={460}>
            <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="Norge svarer" unit=" d" domain={[0, scatterMax]} tickLine={false} label={{ value: "Norge svarer (dager)", position: "insideBottom", offset: -10, fontSize: 12, fill: "#64748b" }} />
              <YAxis type="number" dataKey="y" name="De svarer" unit=" d" domain={[0, scatterMax]} tickLine={false} label={{ value: "De svarer (dager)", angle: -90, position: "insideLeft", fontSize: 12, fill: "#64748b" }} />
              <ZAxis type="number" dataKey="z" range={[80, 1600]} />
              <ReferenceArea x1={0} x2={scatterMax} y1={0} y2={scatterMax} fill="transparent" />
              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: scatterMax, y: scatterMax }]} stroke="#94a3b8" strokeDasharray="6 6" />
              <ReTooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  const p = active && payload?.[0]?.payload as { code: CountryCode; name: string; x: number; y: number; z: number } | undefined;
                  if (!p) return null;
                  return (
                    <div className="chart-tooltip">
                      <div className="chart-tooltip__title" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <Flag code={p.code} /> {p.name}
                      </div>
                      <div className="chart-tooltip__row">Vi svarer: <strong>{fmtDays(p.x)}</strong></div>
                      <div className="chart-tooltip__row">De svarer: <strong>{fmtDays(p.y)}</strong></div>
                      <div className="chart-tooltip__row">Volum: <strong>{fmtInt(p.z)}</strong></div>
                    </div>
                  );
                }}
              />
              <Scatter
                data={scatter}
                onClick={(d: { payload?: { code?: CountryCode } }) => d.payload?.code && setLand(d.payload.code)}
                shape={(props: unknown) => {
                  const { cx, cy, size, payload } = props as { cx: number; cy: number; size: number; payload: { code: CountryCode; x: number; y: number } };
                  const r = Math.sqrt(size / Math.PI);
                  const slower = payload.y > payload.x;
                  const active = land === payload.code;
                  return (
                    <g style={{ cursor: "pointer" }}>
                      <circle cx={cx} cy={cy} r={r} fill={slower ? "#f97316" : "#6366f1"} fillOpacity={active ? 0.9 : 0.35} stroke={slower ? "#f97316" : "#6366f1"} strokeWidth={active ? 3 : 1.5} />
                      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={r > 14 ? 11 : 9} fontWeight={700} fill={active ? "#fff" : "currentColor"} className={styles.bubbleText}>
                        {payload.code}
                      </text>
                    </g>
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="legend" style={{ justifyContent: "center" }}>
            <span className="legend__item">
              <span className="legend__swatch" style={{ background: "#f97316" }} /> Tregere enn Norge
            </span>
            <span className="legend__item">
              <span className="legend__swatch" style={{ background: "#6366f1" }} /> Raskere enn Norge
            </span>
            <span className="legend__item muted">Boblestørrelse = volum</span>
          </div>
        </Card>
      </Section>

      <Section
        kicker="5 · Hvor svarer vi fra?"
        title="Enhetene som leverer svarene"
        lead="Antall svar sendt per Nav-enhet i perioden, med median svartid og andel innen frist. Sektorfilteret gjelder ikke her."
      >
        <Card>
          <div className={styles.enhetTable}>
            <div className={styles.enhetHead}>
              <span>Enhet</span>
              <span>Svar sendt</span>
              <span style={{ textAlign: "right" }}>Median</span>
              <span style={{ textAlign: "right" }}>Innen frist</span>
            </div>
            {enheter.map((e, i) => (
              <motion.div
                key={e.id}
                className={styles.enhetRow}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <span>
                  <strong>{ENHET_BY_ID[e.id]?.shortName}</strong>
                  <span className="muted mono" style={{ fontSize: "0.75rem", marginLeft: 8 }}>
                    {e.id}
                  </span>
                </span>
                <span className={styles.enhetBarWrap}>
                  <span className={styles.enhetBar}>
                    <motion.span
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(e.ans / maxEnhet) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: 0.1 + i * 0.05 }}
                    />
                  </span>
                  <span className="tabular" style={{ minWidth: 64, textAlign: "right" }}>
                    {fmtInt(e.ans)}
                  </span>
                </span>
                <span className="tabular" style={{ textAlign: "right" }}>
                  {fmtDays(e.days)}
                </span>
                <span style={{ textAlign: "right" }}>
                  <span className={styles.onTime} style={{ ["--c" as string]: e.onTime >= 92 ? "#10b981" : e.onTime >= 85 ? "#f59e0b" : "#f43f5e" }}>
                    {fmtPct(e.onTime)}
                  </span>
                </span>
              </motion.div>
            ))}
          </div>
        </Card>
      </Section>

      <div className="grid grid--2" style={{ marginTop: 8 }}>
        <Section kicker="6 · Hvilke SED-er?" title="De mest brukte dokumentene" lead="Siste 12 hele måneder.">
          <Card>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={sedTop} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barCategoryGap={6}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtCompact(v)} />
                <YAxis type="category" dataKey="type" tickLine={false} axisLine={false} width={56} tick={{ fontFamily: "var(--font-mono)", fontSize: 12 }} />
                <ReTooltip content={<ChartTooltip labelFormatter={(l) => `${l} – ${SED_BY_TYPE[String(l)]?.name ?? ""}`} formatter={(v) => fmtInt(v)} />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="sent" name="Sendt" stackId="a" fill="#2563eb" />
                <Bar dataKey="recv" name="Mottatt" stackId="a" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>
        <Section kicker="7 · Ukerytme" title="Når sender vi?" lead="SED-er sendt per time i en gjennomsnittlig uke.">
          <Card>
            <div className={styles.heat}>
              <span />
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h} className={styles.heatHour}>
                  {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
                </span>
              ))}
              {stats.rhythm.map((row, d) => (
                <HeatRow key={d} day={WEEKDAYS[d]} row={row} max={rhythmMax} index={d} />
              ))}
            </div>
            <div className={styles.heatLegend}>
              <span className="muted">Lite</span>
              <span className={styles.heatScale} />
              <span className="muted">Mye</span>
            </div>
            <p className={styles.insight}>
              Toppen er tirsdag kl. 09–10 med rundt {fmtInt(Math.max(...stats.rhythm[1]))} SED-er i timen. Lunsjen er tydelig rundt kl. 11–12, og fredag ettermiddag er stille.
            </p>
          </Card>
        </Section>
      </div>
      {toasts}
    </>
  );
}

function HeatRow({ day, row, max, index }: { day: string; row: number[]; max: number; index: number }) {
  return (
    <>
      <span className={styles.heatDay}>{day}</span>
      {row.map((v, h) => (
        <motion.span
          key={h}
          className={styles.heatCell}
          title={`${day} kl. ${String(h).padStart(2, "0")}: ${fmtInt(v)} SED-er`}
          initial={{ opacity: 0, scale: 0.4 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.05 + h * 0.012 }}
          style={{ background: `color-mix(in srgb, #6366f1 ${Math.round(Math.pow(v / max, 0.7) * 100)}%, var(--heat-empty))` }}
        />
      ))}
    </>
  );
}

function ProfileStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: "0.8rem" }}>
        {label}
      </div>
      <div style={{ fontWeight: 750, fontSize: "1.25rem", color }}>{value}</div>
    </div>
  );
}

function Delta({ v, invert }: { v: number; invert?: boolean }) {
  const good = invert ? v <= 0 : v >= 0;
  return (
    <span style={{ fontWeight: 700, color: good ? "#a7f3d0" : "#fecdd3" }}>
      {v >= 0 ? "▲" : "▼"} {fmtDec(Math.abs(v))} % mot forrige periode
    </span>
  );
}

export type { StatRow };

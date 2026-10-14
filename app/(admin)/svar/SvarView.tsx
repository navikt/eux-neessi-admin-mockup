"use client";

import {
  BellIcon,
  ExternalLinkIcon,
  FilterIcon,
  PersonIcon,
  XMarkIcon,
} from "@navikt/aksel-icons";
import { Button, Chips, Modal, Pagination, Search, Select, Table, Tag, ToggleGroup, Tooltip } from "@navikt/ds-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
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
import { fmtDate, fmtDateShort, fmtInt } from "@/lib/format";
import type { AwaitingItem, AwaitingStatus } from "@/lib/mock/awaiting";
import { addDaysIso } from "@/lib/mock/clock";
import { COUNTRY_BY_CODE, ENHETER, ENHET_BY_ID, SECTORS, SECTOR_BY_CODE, type CountryCode } from "@/lib/mock/reference";
import styles from "./svar.module.css";

export interface SvarFilters {
  status: AwaitingStatus | "ALLE";
  land: string | null;
  sektor: string | null;
  enhet: string | null;
  q: string;
}

interface Props {
  items: AwaitingItem[];
  map: EuropeMapData;
  todayIso: string;
  initial: SvarFilters;
  teams: Record<string, string[]>;
}

const STATUS_COLOR: Record<AwaitingStatus, string> = { FORFALT: "#c4505c", SNART: "#c98a2b", OK: "#3a8a5f" };
const STATUS_LABEL: Record<AwaitingStatus, string> = { FORFALT: "Forfalt", SNART: "Snart frist", OK: "Innen frist" };
const STATUS_TAG: Record<AwaitingStatus, "danger" | "warning" | "success"> = { FORFALT: "danger", SNART: "warning", OK: "success" };

const AGING = [
  { key: "a", label: "> 30 d igjen", test: (d: number) => d > 30, color: "#3a8a5f" },
  { key: "b", label: "8–30 d igjen", test: (d: number) => d > 7 && d <= 30, color: "#6fb38c" },
  { key: "c", label: "0–7 d igjen", test: (d: number) => d >= 0 && d <= 7, color: "#c98a2b" },
  { key: "d", label: "1–14 d over", test: (d: number) => d < 0 && d >= -14, color: "#d98a92" },
  { key: "e", label: "15–30 d over", test: (d: number) => d < -14 && d >= -30, color: "#c4505c" },
  { key: "f", label: "31–60 d over", test: (d: number) => d < -30 && d >= -60, color: "#b23a48" },
  { key: "g", label: "61–120 d over", test: (d: number) => d < -60 && d >= -120, color: "#9c2f3c" },
  { key: "h", label: "> 120 d over", test: (d: number) => d < -120, color: "#6e2430" },
];

type SortKey = "frist" | "sed" | "land" | "sektor" | "enhet" | "saksbehandler" | "paaminnelser" | "mottatt";
const PAGE_SIZE = 12;

function matches(i: AwaitingItem, f: SvarFilters, skip?: keyof SvarFilters): boolean {
  if (skip !== "status" && f.status !== "ALLE" && i.status !== f.status) return false;
  if (skip !== "land" && f.land && i.country !== f.land) return false;
  if (skip !== "sektor" && f.sektor && i.sector !== f.sektor) return false;
  if (skip !== "enhet" && f.enhet && i.enhetId !== f.enhet) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    const hay = `${i.rinasakId} ${i.sedType} ${i.personName} ${i.saksbehandler ?? ""} ${i.institution} ${i.buc}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function countByStatus(list: AwaitingItem[]) {
  const out = { FORFALT: 0, SNART: 0, OK: 0, total: list.length };
  for (const i of list) out[i.status]++;
  return out;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export function SvarView({ items, map, todayIso, initial, teams }: Props) {
  const [f, setF] = useState<SvarFilters>(initial);
  const [sort, setSort] = useState<{ orderBy: SortKey; direction: "ascending" | "descending" }>({ orderBy: "frist", direction: "ascending" });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<AwaitingItem | null>(null);
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const { toasts, push } = useToasts();

  const update = (patch: Partial<SvarFilters>) => {
    setF((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (f.status !== "ALLE") params.set("status", f.status);
    if (f.land) params.set("land", f.land);
    if (f.sektor) params.set("sektor", f.sektor);
    if (f.enhet) params.set("enhet", f.enhet);
    if (f.q) params.set("q", f.q);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [f]);

  const filtered = useMemo(() => items.filter((i) => matches(i, f)), [items, f]);
  const all = useMemo(() => countByStatus(items), [items]);
  const counts = useMemo(() => countByStatus(filtered), [filtered]);
  const medianWait = useMemo(() => median(filtered.map((i) => i.daysWaiting)), [filtered]);
  const oldest = useMemo(() => filtered.reduce<AwaitingItem | null>((a, b) => (!a || b.daysWaiting > a.daysWaiting ? b : a), null), [filtered]);
  const reminders = useMemo(() => filtered.reduce((s, i) => s + i.reminders, 0), [filtered]);
  const countriesWaiting = useMemo(() => new Set(items.map((i) => i.country)).size, [items]);

  const byCountry = useMemo(() => {
    const m = new Map<string, { FORFALT: number; SNART: number; OK: number; total: number; maxDays: number }>();
    for (const i of items) {
      if (!matches(i, f, "land")) continue;
      const e = m.get(i.country) ?? { FORFALT: 0, SNART: 0, OK: 0, total: 0, maxDays: 0 };
      e[i.status]++;
      e.total++;
      e.maxDays = Math.max(e.maxDays, i.daysWaiting);
      m.set(i.country, e);
    }
    return [...m.entries()].map(([code, v]) => ({ code: code as CountryCode, ...v })).sort((a, b) => b.FORFALT - a.FORFALT || b.total - a.total);
  }, [items, f]);
  const mapValues = useMemo(() => {
    const out: Partial<Record<CountryCode, number>> = {};
    for (const c of byCountry) out[c.code] = f.status === "ALLE" ? c.total : c[f.status];
    return out;
  }, [byCountry, f.status]);
  const maxCountry = Math.max(1, ...byCountry.map((c) => c.total));

  const bySector = useMemo(
    () =>
      SECTORS.map((s) => {
        const list = items.filter((i) => i.sector === s.code && matches(i, f, "sektor"));
        return { code: s.code, name: s.name, ...countByStatus(list) };
      }).filter((s) => s.total > 0).sort((a, b) => b.total - a.total),
    [items, f],
  );
  const byEnhet = useMemo(
    () =>
      ENHETER.map((e) => {
        const list = items.filter((i) => i.enhetId === e.id && matches(i, f, "enhet"));
        return { code: e.id, name: e.shortName, ...countByStatus(list), median: median(list.map((i) => i.daysWaiting)) };
      }).filter((s) => s.total > 0).sort((a, b) => b.FORFALT - a.FORFALT),
    [items, f],
  );
  const aging = useMemo(() => AGING.map((b) => ({ ...b, count: filtered.filter((i) => b.test(i.daysLeft)).length })), [filtered]);

  const sorted = useMemo(() => {
    const dir = sort.direction === "ascending" ? 1 : -1;
    const val = (i: AwaitingItem): string | number => {
      switch (sort.orderBy) {
        case "frist": return i.daysLeft;
        case "sed": return i.sedType;
        case "land": return COUNTRY_BY_CODE[i.country].name;
        case "sektor": return i.sector;
        case "enhet": return ENHET_BY_ID[i.enhetId]?.shortName ?? "";
        case "saksbehandler": return assigned[i.id] ?? i.saksbehandler ?? "ÿ";
        case "paaminnelser": return i.reminders;
        case "mottatt": return i.receivedIso;
      }
    };
    return [...filtered].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      return (typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "nb")) * dir;
    });
  }, [filtered, sort, assigned]);
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  const activeFilters = [
    f.status !== "ALLE" && { key: "status" as const, label: STATUS_LABEL[f.status as AwaitingStatus] },
    f.land && { key: "land" as const, label: COUNTRY_BY_CODE[f.land as CountryCode]?.name ?? f.land },
    f.sektor && { key: "sektor" as const, label: SECTOR_BY_CODE[f.sektor as keyof typeof SECTOR_BY_CODE]?.name ?? f.sektor },
    f.enhet && { key: "enhet" as const, label: ENHET_BY_ID[f.enhet]?.shortName ?? f.enhet },
    f.q && { key: "q" as const, label: `«${f.q}»` },
  ].filter(Boolean) as { key: keyof SvarFilters; label: string }[];

  const clearFilter = (key: keyof SvarFilters) => update({ [key]: key === "status" ? "ALLE" : key === "q" ? "" : null } as Partial<SvarFilters>);

  return (
    <>
      <PageHero
        variant="sunset"
        eyebrow="Svarfrister"
        title="Har vi svart de andre landene?"
        lead={
          <>
            Akkurat nå venter <strong>{fmtInt(all.total)}</strong> forespørsler fra {countriesWaiting} land på svar fra Norge.{" "}
            <strong>{fmtInt(all.FORFALT)}</strong> av dem har passert fristen. Klikk i kart og grafer for å filtrere.
          </>
        }
      >
        <HeroStat label="Venter på svar" value={<CountUp value={counts.total} />} hint={counts.total !== all.total ? `av ${fmtInt(all.total)} totalt` : "innkommende forespørsler"} />
        <HeroStat label="Forfalt" value={<CountUp value={counts.FORFALT} />} hint={`${counts.total ? Math.round((counts.FORFALT / counts.total) * 100) : 0} % har passert fristen`} />
        <HeroStat label="Frist innen 7 dager" value={<CountUp value={counts.SNART} />} hint="bør prioriteres nå" />
        <HeroStat label="Median ventetid" value={<CountUp value={medianWait} suffix=" d" />} hint={oldest ? `Eldste: ${oldest.daysWaiting} dager` : "–"} />
        <HeroStat label="Påminnelser (X009)" value={<CountUp value={reminders} />} hint="mottatt på forfalte saker" />
      </PageHero>

      <div className="sticky-filters">
        <div className="toolbar">
          <ToggleGroup size="small" value={f.status} onChange={(v) => update({ status: v as SvarFilters["status"] })} label="">
            <ToggleGroup.Item value="ALLE" label={`Alle ${all.total}`} />
            <ToggleGroup.Item value="FORFALT" label={`Forfalt ${all.FORFALT}`} />
            <ToggleGroup.Item value="SNART" label={`Snart ${all.SNART}`} />
            <ToggleGroup.Item value="OK" label={`Innen frist ${all.OK}`} />
          </ToggleGroup>
          <Select label="Enhet" hideLabel size="small" value={f.enhet ?? ""} onChange={(e) => update({ enhet: e.target.value || null })} style={{ minWidth: 220 }}>
            <option value="">Alle enheter</option>
            {ENHETER.map((e) => (
              <option key={e.id} value={e.id}>
                {e.id} {e.shortName}
              </option>
            ))}
          </Select>
          <Select label="Land" hideLabel size="small" value={f.land ?? ""} onChange={(e) => update({ land: e.target.value || null })} style={{ minWidth: 160 }}>
            <option value="">Alle land</option>
            {[...byCountry].sort((a, b) => COUNTRY_BY_CODE[a.code].name.localeCompare(COUNTRY_BY_CODE[b.code].name, "nb")).map((c) => (
              <option key={c.code} value={c.code}>
                {COUNTRY_BY_CODE[c.code].name}
              </option>
            ))}
          </Select>
          <div style={{ flex: "1 1 220px", maxWidth: 320 }}>
            <Search label="Søk" hideLabel size="small" variant="simple" placeholder="RINA-sak, SED, person, saksbehandler" value={f.q} onChange={(v) => update({ q: v })} />
          </div>
        </div>
        <div className={styles.sectorChips}>
          <Chips size="small">
            {SECTORS.map((s) => (
              <Chips.Toggle key={s.code} selected={f.sektor === s.code} onClick={() => update({ sektor: f.sektor === s.code ? null : s.code })} checkmark={false}>
                {`${s.code} · ${s.name}`}
              </Chips.Toggle>
            ))}
          </Chips>
          <AnimatePresence>
            {activeFilters.length ? (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className={styles.active}>
                <FilterIcon aria-hidden />
                <span className="muted">
                  {fmtInt(filtered.length)} treff ·
                </span>
                <Chips size="small">
                  {activeFilters.map((a) => (
                    <Chips.Removable key={a.key} data-color="accent" onDelete={() => clearFilter(a.key)}>
                      {a.label}
                    </Chips.Removable>
                  ))}
                </Chips>
                <Button size="xsmall" variant="tertiary" onClick={() => update({ status: "ALLE", land: null, sektor: null, enhet: null, q: "" })}>
                  Nullstill
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid--main-side">
        <Reveal>
          <Card
            title="Hvor venter de?"
            subtitle={f.status === "ALLE" ? "Antall ventende forespørsler per land" : `${STATUS_LABEL[f.status]} per land`}
            actions={
              f.land ? (
                <Button size="xsmall" variant="tertiary" icon={<XMarkIcon aria-hidden />} onClick={() => update({ land: null })}>
                  {COUNTRY_BY_CODE[f.land as CountryCode]?.name}
                </Button>
              ) : null
            }
          >
            <EuropeMap
              map={map}
              values={mapValues}
              palette={f.status === "OK" ? ["#d6eadc", "#3a8a5f", "#24563c"] : f.status === "SNART" ? ["#ecdcb0", "#c98a2b", "#7d5418"] : ["#efd3d5", "#c4505c", "#6e2430"]}
              selected={(f.land as CountryCode) ?? null}
              onSelect={(c) => update({ land: c })}
              tooltip={(code) => {
                const c = byCountry.find((x) => x.code === code);
                if (!c) return "Ingen ventende";
                return (
                  <div style={{ display: "grid", gap: 2 }}>
                    <span>{fmtInt(c.total)} venter · eldste {c.maxDays} d</span>
                    <span style={{ color: STATUS_COLOR.FORFALT }}>{c.FORFALT} forfalt</span>
                    <span style={{ color: STATUS_COLOR.SNART }}>{c.SNART} snart</span>
                  </div>
                );
              }}
              flows={0}
            />
          </Card>
        </Reveal>
        <Reveal delay={0.08}>
          <Card title="Land" subtitle="Sortert etter antall forfalte">
            <div className={styles.countryList}>
              {byCountry.slice(0, 14).map((c, i) => (
                <motion.button
                  key={c.code}
                  className={`${styles.countryRow} ${f.land === c.code ? styles.countryRowActive : ""}`}
                  onClick={() => update({ land: f.land === c.code ? null : c.code })}
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Flag code={c.code} />
                  <span className={styles.countryName}>{COUNTRY_BY_CODE[c.code].name}</span>
                  <span className={styles.stack} style={{ width: `${(c.total / maxCountry) * 100}%` }}>
                    {(["FORFALT", "SNART", "OK"] as const).map((s) => (
                      <span key={s} style={{ flex: c[s], background: STATUS_COLOR[s] }} />
                    ))}
                  </span>
                  <span className={styles.countryNum}>
                    <strong style={{ color: c.FORFALT ? STATUS_COLOR.FORFALT : undefined }}>{c.FORFALT}</strong>
                    <span className="muted"> / {c.total}</span>
                  </span>
                </motion.button>
              ))}
            </div>
          </Card>
        </Reveal>
      </div>

      <div className="grid grid--2" style={{ marginTop: 20 }}>
        <Reveal>
          <Card title="Per sektor" subtitle="Klikk på en sektor for å filtrere" actions={<StatusLegend />}>
            <StackedBars data={bySector} selected={f.sektor} onSelect={(code) => update({ sektor: f.sektor === code ? null : code })} />
          </Card>
        </Reveal>
        <Reveal delay={0.08}>
          <Card title="Per enhet" subtitle="Hvem sitter på de forfalte svarene?" actions={<StatusLegend />}>
            <StackedBars data={byEnhet} selected={f.enhet} onSelect={(code) => update({ enhet: f.enhet === code ? null : code })} width={170} />
          </Card>
        </Reveal>
      </div>

      <Section kicker="Alder" title="Hvor langt over fristen er vi?" lead="Fordeling av ventende forespørsler etter dager igjen til – eller over – fristen. Halen til høyre er sakene som risikerer purring fra utlandet.">
        <div className="grid grid--main-side">
          <Card>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={aging} margin={{ top: 24, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} interval={0} />
                <YAxis tickLine={false} axisLine={false} />
                <ReTooltip cursor={{ fill: "rgba(111, 119, 133, 0.08)" }} content={<ChartTooltip formatter={(v) => `${fmtInt(v)} forespørsler`} />} />
                <ReferenceLine x="1–14 d over" stroke="#c4505c" strokeDasharray="4 4" label={{ value: "Frist", position: "top", fill: "#c4505c", fontWeight: 600, fontSize: 12 }} />
                <Bar dataKey="count" name="Antall" radius={[6, 6, 0, 0]} animationDuration={900}>
                  {aging.map((a) => (
                    <Cell key={a.key} fill={a.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Hva står i veien?" subtitle="Forfalte forespørsler i utvalget">
            <Insights list={filtered} assigned={assigned} />
          </Card>
        </div>
      </Section>

      <Section
        kicker="Detaljer"
        title={`${fmtInt(sorted.length)} forespørsler`}
        lead="Klikk på en rad for detaljer, tidslinje og handlinger."
        id="liste"
      >
        <div className="card card--flush">
          <div className="data-table">
            <Table
              size="small"
              sort={sort}
              onSortChange={(key) =>
                setSort((s) => ({
                  orderBy: key as SortKey,
                  direction: s.orderBy === key && s.direction === "ascending" ? "descending" : "ascending",
                }))
              }
            >
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader sortKey="frist" sortable>Frist</Table.ColumnHeader>
                  <Table.ColumnHeader sortKey="sed" sortable>Forespørsel</Table.ColumnHeader>
                  <Table.ColumnHeader sortKey="land" sortable>Fra</Table.ColumnHeader>
                  <Table.ColumnHeader sortKey="enhet" sortable className="hide-sm">Enhet</Table.ColumnHeader>
                  <Table.ColumnHeader sortKey="saksbehandler" sortable className="hide-sm">Saksbehandler</Table.ColumnHeader>
                  <Table.ColumnHeader sortKey="paaminnelser" sortable align="right">X009</Table.ColumnHeader>
                  <Table.ColumnHeader sortKey="mottatt" sortable align="right">Mottatt</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {pageItems.map((i) => {
                  const sb = assigned[i.id] ?? i.saksbehandler;
                  return (
                    <Table.Row key={i.id} onClick={() => setOpen(i)} className={styles.row}>
                      <Table.DataCell>
                        <div className={styles.fristCell}>
                          <span className={styles.fristBar} style={{ background: STATUS_COLOR[i.status] }} />
                          <div>
                            <div style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", color: i.status === "OK" ? undefined : STATUS_COLOR[i.status] }}>
                              {i.daysLeft < 0 ? `${-i.daysLeft} d over` : i.daysLeft === 0 ? "I dag" : `${i.daysLeft} d igjen`}
                            </div>
                            <div className="muted" style={{ fontSize: "0.78rem" }}>{fmtDateShort(i.fristIso)}</div>
                          </div>
                        </div>
                      </Table.DataCell>
                      <Table.DataCell>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="sed-code">{i.sedType}</span>
                          <div style={{ minWidth: 0 }}>
                            <div className={styles.ellipsis}>{i.sedName}</div>
                            <div className="muted mono" style={{ fontSize: "0.75rem" }}>
                              {i.buc} · {i.rinasakId}
                            </div>
                          </div>
                        </div>
                      </Table.DataCell>
                      <Table.DataCell>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Flag code={i.country} />
                          <div style={{ minWidth: 0 }}>
                            <div>{COUNTRY_BY_CODE[i.country].name}</div>
                            <div className={`muted ${styles.ellipsis}`} style={{ fontSize: "0.75rem", maxWidth: 150 }}>{i.institution}</div>
                          </div>
                        </div>
                      </Table.DataCell>
                      <Table.DataCell className="hide-sm">
                        <div style={{ whiteSpace: "nowrap" }}>{ENHET_BY_ID[i.enhetId]?.shortName}</div>
                        <div className="muted mono" style={{ fontSize: "0.75rem" }}>{i.enhetId}</div>
                      </Table.DataCell>
                      <Table.DataCell className="hide-sm">
                        {sb ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                            <span className="avatar avatar--sm">{sb.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
                            {sb}
                          </span>
                        ) : (
                          <Tag size="xsmall" variant="outline" data-color="warning">Ikke tildelt</Tag>
                        )}
                      </Table.DataCell>
                      <Table.DataCell align="right">
                        {i.reminders ? (
                          <span className={styles.reminder}>
                            <BellIcon aria-hidden /> {i.reminders}
                          </span>
                        ) : (
                          <span className="muted">–</span>
                        )}
                      </Table.DataCell>
                      <Table.DataCell align="right">
                        <div>{fmtDateShort(i.receivedIso)}</div>
                        <div className="muted" style={{ fontSize: "0.75rem" }}>{i.daysWaiting} d siden</div>
                      </Table.DataCell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
            {!pageItems.length ? <div className="empty">Ingen forespørsler matcher filteret.</div> : null}
          </div>
          <div className={styles.pager}>
            <span className="muted">
              Viser {sorted.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, sorted.length)} av {fmtInt(sorted.length)}
            </span>
            {pageCount > 1 ? <Pagination size="small" page={page} onPageChange={setPage} count={pageCount} boundaryCount={1} siblingCount={1} /> : null}
          </div>
        </div>
      </Section>

      <DetailModal
        key={open?.id ?? "none"}
        item={open}
        team={open ? teams[open.enhetId] ?? [] : []}
        todayIso={todayIso}
        assignedTo={open ? assigned[open.id] ?? open.saksbehandler : null}
        onClose={() => setOpen(null)}
        onAssign={(id, name) => {
          setAssigned((a) => ({ ...a, [id]: name }));
          push("Saksbehandler tildelt", `${name} har fått saken i arbeidskøen sin.`);
        }}
        onRemind={(item, who) => push("Påminnelse sendt", `${who ?? ENHET_BY_ID[item.enhetId]?.name} får varsel om ${item.sedType} fra ${COUNTRY_BY_CODE[item.country].name}.`, "info")}
      />
      {toasts}
    </>
  );
}

function StatusLegend() {
  return (
    <div className="legend">
      {(["FORFALT", "SNART", "OK"] as const).map((s) => (
        <span key={s} className="legend__item">
          <span className="legend__swatch" style={{ background: STATUS_COLOR[s] }} /> {STATUS_LABEL[s]}
        </span>
      ))}
    </div>
  );
}

function StackedBars({
  data,
  selected,
  onSelect,
  width = 120,
}: {
  data: { code: string; name: string; FORFALT: number; SNART: number; OK: number; total: number }[];
  selected: string | null;
  onSelect: (code: string) => void;
  width?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <div className={styles.hbars}>
      {data.map((d, i) => (
        <button key={d.code} className={`${styles.hbar} ${selected === d.code ? styles.hbarActive : ""} ${selected && selected !== d.code ? styles.hbarDim : ""}`} onClick={() => onSelect(d.code)}>
          <span className={styles.hbarLabel} style={{ width }}>
            {d.name}
          </span>
          <span className={styles.hbarTrack}>
            <motion.span
              className={styles.hbarFill}
              initial={{ width: 0 }}
              whileInView={{ width: `${(d.total / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              {(["FORFALT", "SNART", "OK"] as const).map((s) =>
                d[s] ? (
                  <Tooltip key={s} content={`${STATUS_LABEL[s]}: ${d[s]}`}>
                    <span style={{ flex: d[s], background: STATUS_COLOR[s] }} />
                  </Tooltip>
                ) : null,
              )}
            </motion.span>
          </span>
          <span className={styles.hbarNum}>
            <strong style={{ color: d.FORFALT ? STATUS_COLOR.FORFALT : undefined }}>{d.FORFALT}</strong>
            <span className="muted"> / {d.total}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function Insights({ list, assigned }: { list: AwaitingItem[]; assigned: Record<string, string> }) {
  const overdue = list.filter((i) => i.status === "FORFALT");
  const unassigned = overdue.filter((i) => !(assigned[i.id] ?? i.saksbehandler)).length;
  const drafts = overdue.filter((i) => i.draftStarted).length;
  const reminded = overdue.filter((i) => i.reminders > 0).length;
  const veryOld = overdue.filter((i) => i.daysLeft < -60).length;
  const rows = [
    { label: "Mangler saksbehandler", value: unassigned, color: "#c98a2b", hint: "Ingen eier – fordel dem" },
    { label: "Har mottatt purring (X009)", value: reminded, color: "#c4505c", hint: "Landet har etterlyst svar" },
    { label: "Mer enn 60 dager over frist", value: veryOld, color: "#6f7785", hint: "Kan være glemt eller feilrutet" },
    { label: "Svarutkast påbegynt", value: drafts, color: "#3a8a5f", hint: "Nesten i mål" },
  ];
  const total = Math.max(1, overdue.length);
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {rows.map((r, i) => (
        <div key={r.label}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontWeight: 600 }}>{r.label}</span>
            <span style={{ fontWeight: 600, fontSize: "1.2rem", fontVariantNumeric: "tabular-nums", color: r.color }}>{r.value}</span>
          </div>
          <div className="bar-track" style={{ margin: "6px 0 2px" }}>
            <motion.div
              className="bar-fill"
              style={{ background: r.color }}
              initial={{ width: 0 }}
              whileInView={{ width: `${(r.value / total) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: i * 0.08 }}
            />
          </div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>{r.hint}</div>
        </div>
      ))}
    </div>
  );
}

function DetailModal({
  item,
  team,
  todayIso,
  assignedTo,
  onClose,
  onAssign,
  onRemind,
}: {
  item: AwaitingItem | null;
  team: string[];
  todayIso: string;
  assignedTo: string | null;
  onClose: () => void;
  onAssign: (id: string, name: string) => void;
  onRemind: (item: AwaitingItem, who: string | null) => void;
}) {
  const [pick, setPick] = useState("");
  if (!item) return null;
  const country = COUNTRY_BY_CODE[item.country];
  const enhet = ENHET_BY_ID[item.enhetId];
  const events: { date: string; title: string; body?: string; color: string; done: boolean }[] = [
    { date: item.receivedIso, title: `${item.sedType} mottatt`, body: `${item.institution}, ${country.name}`, color: "#2a6cb3", done: true },
  ];
  if (item.saksbehandler) events.push({ date: addDaysIso(item.receivedIso, 2), title: "Tildelt saksbehandler", body: item.saksbehandler, color: "#7d6aa5", done: true });
  if (item.draftStarted) events.push({ date: addDaysIso(item.receivedIso, Math.min(item.daysWaiting, 6)), title: `Utkast til ${item.replySed} påbegynt`, body: "Lagret i nEESSI", color: "#3a8a5f", done: true });
  events.push({ date: item.fristIso, title: "Svarfrist", body: `${item.fristDager} dager etter mottak`, color: "#c4505c", done: item.daysLeft < 0 });
  for (let r = 0; r < item.reminders; r++) {
    events.push({ date: addDaysIso(item.fristIso, 7 + r * 21), title: `Påminnelse X009 nr. ${r + 1}`, body: `Fra ${item.institution}`, color: "#c98a2b", done: true });
  }
  events.push({ date: todayIso, title: "I dag", body: item.daysLeft < 0 ? `${-item.daysLeft} dager over fristen` : `${item.daysLeft} dager igjen`, color: "var(--ax-text-neutral)", done: true });
  events.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Modal open={Boolean(item)} onClose={onClose} header={{ heading: `${item.sedType} – ${item.sedName}`, label: `${item.buc} · RINA-sak ${item.rinasakId}` }} width={760}>
      <Modal.Body>
        <div className={styles.modalTop}>
          <Tag variant="strong" data-color={STATUS_TAG[item.status]} size="small">
            {STATUS_LABEL[item.status]} · {item.daysLeft < 0 ? `${-item.daysLeft} d over` : `${item.daysLeft} d igjen`}
          </Tag>
          <span className="chip">
            <Flag code={item.country} /> {country.name}
          </span>
          <span className="chip" style={{ background: `${SECTOR_BY_CODE[item.sector].color}22`, color: SECTOR_BY_CODE[item.sector].color }}>
            {item.sector} · {SECTOR_BY_CODE[item.sector].name}
          </span>
          <span className="chip">Svar med {item.replySed}</span>
        </div>
        <div className={styles.modalGrid}>
          <dl className={styles.facts}>
            <dt>Person</dt>
            <dd>{item.personName}</dd>
            <dt>Avsender</dt>
            <dd>{item.institution}</dd>
            <dt>Enhet</dt>
            <dd>
              {enhet?.name} <span className="muted mono">({item.enhetId})</span>
            </dd>
            <dt>Saksbehandler</dt>
            <dd>{assignedTo ?? <span style={{ color: "#c98a2b", fontWeight: 600 }}>Ikke tildelt</span>}</dd>
            <dt>Mottatt</dt>
            <dd>{fmtDate(item.receivedIso)}</dd>
            <dt>Frist</dt>
            <dd>{fmtDate(item.fristIso)}</dd>
          </dl>
          <ol className={styles.timeline}>
            {events.map((e, i) => (
              <motion.li key={`${e.title}-${i}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
                <span className={styles.tlDot} style={{ background: e.done ? e.color : "transparent", borderColor: e.color }} />
                <div>
                  <div style={{ fontWeight: 600 }}>{e.title}</div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>
                    {fmtDate(e.date)}
                    {e.body ? ` · ${e.body}` : ""}
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
        <div className={styles.assign}>
          <PersonIcon aria-hidden />
          <Select label="Tildel saksbehandler" hideLabel size="small" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Tildel til …</option>
            {team.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Button
            size="small"
            variant="secondary"
            disabled={!pick}
            onClick={() => {
              onAssign(item.id, pick);
              setPick("");
            }}
          >
            Tildel
          </Button>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button as="a" href={`#nEESSI/rinasak/${item.rinasakId}`} icon={<ExternalLinkIcon aria-hidden />} iconPosition="right" onClick={(e: React.MouseEvent) => e.preventDefault()}>
          Åpne i nEESSI
        </Button>
        <Button variant="secondary" icon={<BellIcon aria-hidden />} onClick={() => onRemind(item, assignedTo)}>
          Send påminnelse
        </Button>
        <Button variant="tertiary" onClick={onClose}>
          Lukk
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

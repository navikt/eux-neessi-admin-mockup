"use client";

import {
  BellIcon,
  ChevronDownIcon,
  DownloadIcon,
  PaperplaneIcon,
  PersonCheckmarkIcon,
  PersonCrossIcon,
  PersonGroupIcon,
  PersonPlusIcon,
  ShieldCheckmarkIcon,
  XMarkIcon,
} from "@navikt/aksel-icons";
import { ActionMenu, Button, Checkbox, Chips, Pagination, Search, Select, Table, Tag, ToggleGroup, Tooltip, type SortState } from "@navikt/ds-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { CountUp } from "@/components/ui/CountUp";
import { KpiCard } from "@/components/ui/KpiCard";
import { HeroStat, PageHero } from "@/components/ui/PageHero";
import { Stagger, StaggerItem } from "@/components/ui/Reveal";
import { Card, Section } from "@/components/ui/Section";
import { useToasts } from "@/components/ui/Toast";
import { fmtInt } from "@/lib/format";
import { ROLE_LABELS, STATUS_LABELS } from "@/lib/mock/users";
import { dailyActivity } from "./activity";
import styles from "./brukere.module.css";
import { InviteModal, type InviteInput } from "./InviteModal";
import {
  avatarGradient,
  initials,
  ROLE_META,
  ROLE_ORDER,
  sinceText,
  STATUS_META,
  STATUS_ORDER,
  type AdminUser,
  type EnhetOption,
  type UserRole,
  type UserStatus,
} from "./types";
import { UserDetail } from "./UserDetail";

interface Props {
  initialUsers: AdminUser[];
  enheter: EnhetOption[];
  currentUser: string;
  todayIso: string;
}

type StatusFilter = "ALLE" | UserStatus;
const PAGE_SIZE = 12;

function compareUsers(a: AdminUser, b: AdminUser, key: string, enhetName: (id: string) => string): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name, "nb");
    case "ident":
      return a.ident.localeCompare(b.ident);
    case "enhet":
      return enhetName(a.enhetId).localeCompare(enhetName(b.enhetId), "nb");
    case "status":
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    case "lastActive":
      return (a.lastActiveDaysAgo ?? 9999) - (b.lastActiveDaysAgo ?? 9999);
    case "sessions":
      return a.sessions30d - b.sessions30d;
    default:
      return 0;
  }
}

export function BrukereView({ initialUsers, enheter, currentUser, todayIso }: Props) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [query, setQuery] = useState("");
  const [enhetFilter, setEnhetFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALLE");
  const [sort, setSort] = useState<SortState>({ orderBy: "lastActive", direction: "ascending" });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailIdent, setDetailIdent] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { toasts, push } = useToasts();

  const enhetById = useMemo(() => Object.fromEntries(enheter.map((e) => [e.id, e])), [enheter]);
  const enhetName = useCallback((id: string) => enhetById[id]?.shortName ?? id, [enhetById]);

  const toast = (t: { variant: "success" | "info" | "warning" | "error"; title: string; body?: string }) => push(t.title, t.body, t.variant);

  /* ---------- Derived stats ---------- */
  const stats = useMemo(() => {
    const active = users.filter((u) => u.status === "AKTIV");
    const invited = users.filter((u) => u.status === "INVITERT").length;
    const active7 = active.filter((u) => (u.lastActiveDaysAgo ?? 99) <= 6).length;
    const sessions = users.reduce((s, u) => s + u.sessions30d, 0);
    const seds = users.reduce((s, u) => s + u.seds30d, 0);
    const enhetCount = new Set(users.map((u) => u.enhetId)).size;
    const daily = Array.from({ length: 30 }, () => ({ users: 0, sessions: 0 }));
    for (const u of users) {
      dailyActivity(u).forEach((v, i) => {
        if (v > 0) daily[i].users += 1;
        daily[i].sessions += v;
      });
    }
    const workdays = daily.filter((d) => d.users > 0);
    const dau = workdays.reduce((s, d) => s + d.users, 0) / Math.max(1, workdays.length);
    // Cumulative growth by half-year from createdIso
    const growth: number[] = [];
    for (let y = 2021; y <= Number(todayIso.slice(0, 4)); y++) {
      for (const h of [6, 12]) {
        const cutoff = `${y}-${String(h).padStart(2, "0")}-31`;
        growth.push(users.filter((u) => u.createdIso <= cutoff).length);
      }
    }
    return {
      total: users.length,
      active: active.length,
      invited,
      active7,
      sessions,
      seds,
      enhetCount,
      dau,
      dailyUsers: daily.map((d) => d.users),
      dailySessions: daily.map((d) => d.sessions),
      growth,
      avgSessions: sessions / Math.max(1, active.length),
    };
  }, [users, todayIso]);

  const perEnhet = useMemo(
    () =>
      enheter
        .map((e) => {
          const list = users.filter((u) => u.enhetId === e.id);
          const byStatus = Object.fromEntries(STATUS_ORDER.map((s) => [s, list.filter((u) => u.status === s).length])) as Record<UserStatus, number>;
          return { ...e, total: list.length, byStatus };
        })
        .sort((a, b) => b.total - a.total),
    [users, enheter],
  );
  const maxEnhet = Math.max(...perEnhet.map((e) => e.total), 1);

  const roleDist = useMemo(
    () => ROLE_ORDER.map((r) => ({ role: r, name: ROLE_LABELS[r], value: users.filter((u) => u.roles.includes(r)).length, color: ROLE_META[r].hex })),
    [users],
  );

  const statusCounts = useMemo(() => Object.fromEntries(STATUS_ORDER.map((s) => [s, users.filter((u) => u.status === s).length])) as Record<UserStatus, number>, [users]);

  /* ---------- Filtering, sorting, paging ---------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = users.filter(
      (u) =>
        (!q || u.name.toLowerCase().includes(q) || u.ident.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
        (!enhetFilter || u.enhetId === enhetFilter || u.extraEnheter.includes(enhetFilter)) &&
        (roleFilter.length === 0 || roleFilter.every((r) => u.roles.includes(r))) &&
        (statusFilter === "ALLE" || u.status === statusFilter),
    );
    const dir = sort.direction === "descending" ? -1 : 1;
    return list.sort((a, b) => {
      if (a.fresh !== b.fresh) return a.fresh ? -1 : 1;
      return sort.direction === "none" ? 0 : compareUsers(a, b, sort.orderBy, enhetName) * dir || a.name.localeCompare(b.name, "nb");
    });
  }, [users, query, enhetFilter, roleFilter, statusFilter, sort, enhetName]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const maxSessions = Math.max(...users.map((u) => u.sessions30d), 1);

  const resetPage = () => setPage(1);
  const filtersActive = Boolean(query || enhetFilter || roleFilter.length || statusFilter !== "ALLE");

  /* ---------- Selection & bulk actions ---------- */
  const pageIdents = pageRows.map((u) => u.ident);
  const allOnPage = pageIdents.length > 0 && pageIdents.every((id) => selected.includes(id));
  const someOnPage = pageIdents.some((id) => selected.includes(id));
  const toggleSelect = (ident: string) => setSelected((prev) => (prev.includes(ident) ? prev.filter((i) => i !== ident) : [...prev, ident]));
  const togglePage = () =>
    setSelected((prev) => (allOnPage ? prev.filter((id) => !pageIdents.includes(id)) : Array.from(new Set([...prev, ...pageIdents]))));

  const bulkDeactivate = () => {
    const n = selected.length;
    setUsers((prev) => prev.map((u) => (selected.includes(u.ident) ? { ...u, status: "INAKTIV", sessions30d: u.sessions30d } : u)));
    setSelected([]);
    toast({ variant: "success", title: `${n} ${n === 1 ? "bruker" : "brukere"} deaktivert`, body: "Tilgangen til nEESSI er fjernet. Du kan aktivere dem igjen fra brukerpanelet." });
  };
  const bulkRole = (role: UserRole, add: boolean) => {
    const n = selected.length;
    setUsers((prev) =>
      prev.map((u) =>
        selected.includes(u.ident)
          ? { ...u, roles: add ? ROLE_ORDER.filter((r) => u.roles.includes(r) || r === role) : u.roles.filter((r) => r !== role) }
          : u,
      ),
    );
    toast({ variant: "success", title: `${ROLE_LABELS[role]} ${add ? "lagt til for" : "fjernet fra"} ${n} ${n === 1 ? "bruker" : "brukere"}` });
  };
  const bulkRemind = () => {
    const n = selected.length;
    setSelected([]);
    toast({ variant: "info", title: `Påminnelse sendt til ${n} ${n === 1 ? "bruker" : "brukere"}`, body: "E-post med lenke til nEESSI er lagt i kø." });
  };

  /* ---------- Detail & invite ---------- */
  const detailUser = users.find((u) => u.ident === detailIdent) ?? null;
  const openDetail = (ident: string) => {
    setDetailIdent(ident);
    setDetailOpen(true);
  };
  const saveUser = (updated: AdminUser) => {
    setUsers((prev) => prev.map((u) => (u.ident === updated.ident ? updated : u)));
    setDetailOpen(false);
    toast({ variant: "success", title: "Endringene er lagret", body: `${updated.name} har nå ${updated.roles.length} ${updated.roles.length === 1 ? "rolle" : "roller"} og tilgang til ${updated.extraEnheter.length + 1} ${updated.extraEnheter.length ? "enheter" : "enhet"}.` });
  };
  const remindUser = (u: AdminUser) => {
    toast({ variant: "info", title: u.status === "INVITERT" ? "Invitasjonen er sendt på nytt" : "Påminnelse sendt", body: `E-post sendt til ${u.email}` });
  };
  const invite = (input: InviteInput) => {
    const created: AdminUser = {
      ...input,
      status: "INVITERT",
      lastActiveDaysAgo: null,
      createdIso: todayIso,
      sessions30d: 0,
      seds30d: 0,
      extraEnheter: [],
      fresh: true,
    };
    setUsers((prev) => [created, ...prev.map((u) => (u.fresh ? { ...u, fresh: false } : u))]);
    setInviteOpen(false);
    setQuery("");
    setEnhetFilter("");
    setRoleFilter([]);
    setStatusFilter("ALLE");
    setPage(1);
    toast({ variant: "success", title: `Invitasjon sendt til ${input.name}`, body: `${input.email} · sendt av ${currentUser}` });
  };

  const existingIdents = useMemo(() => new Set(users.map((u) => u.ident)), [users]);

  return (
    <>
      <PageHero
        eyebrow={
          <>
            <PersonGroupIcon aria-hidden /> Brukeradministrasjon
          </>
        }
        title="Brukere i nEESSI"
        lead="Hvem har tilgang, hvem er aktive, og hvem venter på å komme i gang. Inviter nye saksbehandlere, juster roller og enhetstilgang – alt på ett sted."
        variant="violet"
        actions={
          <>
            <Button className={styles.heroButton} icon={<PersonPlusIcon aria-hidden />} onClick={() => setInviteOpen(true)}>
              Inviter bruker
            </Button>
            <Button className={styles.heroGhost} variant="secondary" icon={<DownloadIcon aria-hidden />} onClick={() => toast({ variant: "info", title: "Eksport startet", body: `${filtered.length} brukere eksporteres til CSV` })}>
              Eksporter
            </Button>
          </>
        }
      >
          <HeroStat label="Aktive brukere" value={<CountUp value={stats.active} />} hint={`av ${fmtInt(stats.total)} registrerte`} />
          <HeroStat label="Invitert" value={<CountUp value={stats.invited} />} hint="venter på første innlogging" />
          <HeroStat label="Aktive siste 7 dager" value={<CountUp value={stats.active7} />} hint={`${Math.round((stats.active7 / Math.max(1, stats.active)) * 100)} % av aktive brukere`} />
          <HeroStat label="Enheter" value={<CountUp value={stats.enhetCount} />} hint="med nEESSI-brukere" />
      </PageHero>

      <Stagger className="grid grid--4">
        <StaggerItem>
          <KpiCard label="Registrerte brukere" value={stats.total} icon={PersonGroupIcon} color="#8b5cf6" spark={stats.growth} deltaLabel="vekst siden 2021" />
        </StaggerItem>
        <StaggerItem>
          <KpiCard label="Snitt daglig aktive" value={stats.dau} icon={PersonCheckmarkIcon} color="#10b981" spark={stats.dailyUsers} deltaLabel="siste 30 dager" />
        </StaggerItem>
        <StaggerItem>
          <KpiCard label="Økter siste 30 dager" value={stats.sessions} icon={ShieldCheckmarkIcon} color="#0ea5e9" spark={stats.dailySessions} deltaLabel={`${stats.avgSessions.toLocaleString("nb-NO", { maximumFractionDigits: 1 })} per aktiv bruker`} />
        </StaggerItem>
        <StaggerItem>
          <KpiCard label="SED-er sendt siste 30 dager" value={stats.seds} icon={PaperplaneIcon} color="#ec4899" spark={stats.dailySessions.map((v, i) => v * (3 + ((i * 7) % 5)))} deltaLabel="fra saksbehandlerne" />
        </StaggerItem>
      </Stagger>

      <Section kicker="Fordeling" title="Hvor sitter brukerne?" lead="Klikk på en enhet eller rolle for å filtrere brukerlisten.">
        <div className="grid grid--main-side">
          <Card title="Brukere per enhet" subtitle="Fordelt på status" actions={<StatusLegend />}>
            <div className={styles.enhetBars}>
              {perEnhet.map((e, i) => (
                <button
                  key={e.id}
                  type="button"
                  className={`${styles.enhetBar} ${enhetFilter === e.id ? styles.enhetBarActive : ""} ${enhetFilter && enhetFilter !== e.id ? styles.enhetBarDim : ""}`}
                  onClick={() => {
                    setEnhetFilter((cur) => (cur === e.id ? "" : e.id));
                    resetPage();
                  }}
                >
                  <span className={styles.enhetBarLabel}>
                    <span className="mono muted">{e.id}</span> {e.shortName}
                  </span>
                  <span className={styles.enhetBarTrack}>
                    {STATUS_ORDER.map((s) =>
                      e.byStatus[s] ? (
                        <motion.span
                          key={s}
                          className={styles.enhetBarSeg}
                          style={{ background: STATUS_META[s].hex }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(e.byStatus[s] / maxEnhet) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                          title={`${STATUS_LABELS[s]}: ${e.byStatus[s]}`}
                        />
                      ) : null,
                    )}
                  </span>
                  <span className={`${styles.enhetBarValue} tabular`}>{e.total}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Rollefordeling" subtitle="En bruker kan ha flere roller">
            <div className={styles.donutWrap}>
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={roleDist}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={64}
                    outerRadius={96}
                    paddingAngle={2}
                    stroke="none"
                    cornerRadius={6}
                    onClick={(d: { payload?: { role?: UserRole } }) => {
                      const r = d.payload?.role;
                      if (!r) return;
                      setRoleFilter((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
                      resetPage();
                    }}
                  >
                    {roleDist.map((d) => (
                      <Cell key={d.role} fill={d.color} opacity={roleFilter.length && !roleFilter.includes(d.role) ? 0.3 : 1} style={{ cursor: "pointer", outline: "none" }} />
                    ))}
                  </Pie>
                  <RTooltip content={<ChartTooltip formatter={(v) => `${fmtInt(v)} brukere`} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.donutCenter}>
                <div className={styles.donutValue}>
                  <CountUp value={stats.total} />
                </div>
                <div className="muted" style={{ fontSize: "0.8rem" }}>
                  brukere
                </div>
              </div>
            </div>
            <div className={styles.roleLegend}>
              {roleDist.map((d) => (
                <button
                  type="button"
                  key={d.role}
                  className={`${styles.roleLegendItem} ${roleFilter.includes(d.role) ? styles.roleLegendOn : ""}`}
                  onClick={() => {
                    setRoleFilter((prev) => (prev.includes(d.role) ? prev.filter((x) => x !== d.role) : [...prev, d.role]));
                    resetPage();
                  }}
                >
                  <span className="legend__swatch" style={{ background: d.color }} />
                  <span>{d.name}</span>
                  <strong className="tabular">{d.value}</strong>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </Section>

      <Section kicker="Brukerliste" title="Alle brukere" lead="Søk, filtrer og velg flere for å gjøre endringer i bulk. Klikk på en rad for detaljer.">
        <div className={`sticky-filters ${styles.filters}`}>
          <div className={styles.filterRow}>
            <div className={styles.searchBox}>
              <Search
                label="Søk etter bruker"
                hideLabel
                size="small"
                variant="simple"
                placeholder="Søk på navn, ident eller e-post"
                value={query}
                onChange={(v) => {
                  setQuery(v);
                  resetPage();
                }}
                onClear={() => setQuery("")}
              />
            </div>
            <Select
              label="Enhet"
              hideLabel
              size="small"
              value={enhetFilter}
              onChange={(e) => {
                setEnhetFilter(e.target.value);
                resetPage();
              }}
              className={styles.enhetSelect}
            >
              <option value="">Alle enheter</option>
              {enheter.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id} · {e.shortName}
                </option>
              ))}
            </Select>
            <ToggleGroup
              size="small"
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v as StatusFilter);
                resetPage();
              }}
            >
              <ToggleGroup.Item value="ALLE" label={`Alle ${users.length}`} />
              {STATUS_ORDER.map((s) => (
                <ToggleGroup.Item key={s} value={s} label={`${STATUS_LABELS[s]} ${statusCounts[s]}`} />
              ))}
            </ToggleGroup>
          </div>
          <div className={styles.filterRow}>
            <Chips size="small">
              {ROLE_ORDER.map((r) => (
                <Chips.Toggle
                  key={r}
                  selected={roleFilter.includes(r)}
                  onClick={() => {
                    setRoleFilter((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
                    resetPage();
                  }}
                >
                  {ROLE_LABELS[r]}
                </Chips.Toggle>
              ))}
            </Chips>
            <span className={styles.resultCount}>
              <strong className="tabular">{filtered.length}</strong> treff
            </span>
            <AnimatePresence>
              {filtersActive ? (
                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <Button
                    size="xsmall"
                    variant="tertiary"
                    icon={<XMarkIcon aria-hidden />}
                    onClick={() => {
                      setQuery("");
                      setEnhetFilter("");
                      setRoleFilter([]);
                      setStatusFilter("ALLE");
                      resetPage();
                    }}
                  >
                    Nullstill
                  </Button>
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className={`card card--flush ${styles.tableCard}`}>
          <div className={`data-table ${styles.tableScroll}`}>
            <Table
              size="medium"
              sort={sort}
              onSortChange={(key) => {
                setSort((prev) =>
                  prev.orderBy === key
                    ? { orderBy: key, direction: prev.direction === "ascending" ? "descending" : "ascending" }
                    : { orderBy: key, direction: "ascending" },
                );
              }}
            >
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell className={styles.checkCell}>
                    <Checkbox size="small" hideLabel checked={allOnPage} indeterminate={someOnPage && !allOnPage} onChange={togglePage}>
                      Velg alle på siden
                    </Checkbox>
                  </Table.HeaderCell>
                  <Table.ColumnHeader sortKey="name" sortable>
                    Bruker
                  </Table.ColumnHeader>
                  <Table.ColumnHeader sortKey="ident" sortable>
                    Ident
                  </Table.ColumnHeader>
                  <Table.ColumnHeader sortKey="enhet" sortable>
                    Enhet
                  </Table.ColumnHeader>
                  <Table.HeaderCell>Roller</Table.HeaderCell>
                  <Table.ColumnHeader sortKey="status" sortable>
                    Status
                  </Table.ColumnHeader>
                  <Table.ColumnHeader sortKey="lastActive" sortable>
                    Sist aktiv
                  </Table.ColumnHeader>
                  <Table.ColumnHeader sortKey="sessions" sortable align="right">
                    Økter 30 d
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body key={`${currentPage}-${sort.orderBy}-${sort.direction}`}>
                {pageRows.map((u, i) => {
                  const isSel = selected.includes(u.ident);
                  return (
                    <Table.Row
                      key={u.ident}
                      selected={isSel}
                      className={`${styles.row} ${u.fresh ? styles.rowFresh : ""}`}
                      style={{ animationDelay: `${i * 22}ms` }}
                      onClick={() => openDetail(u.ident)}
                    >
                      <Table.DataCell className={styles.checkCell} onClick={(e) => e.stopPropagation()}>
                        <Checkbox size="small" hideLabel checked={isSel} onChange={() => toggleSelect(u.ident)}>
                          Velg {u.name}
                        </Checkbox>
                      </Table.DataCell>
                      <Table.DataCell>
                        <div className={styles.userCell}>
                          <span className="avatar avatar--sm" style={{ background: avatarGradient(u.ident) }}>
                            {initials(u.name)}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div className={styles.userName}>
                              {u.name}
                              {u.fresh ? (
                                <Tag size="xsmall" variant="strong" data-color="success" className={styles.newTag}>
                                  Ny
                                </Tag>
                              ) : null}
                            </div>
                            <div className={styles.userEmail}>{u.email}</div>
                          </div>
                        </div>
                      </Table.DataCell>
                      <Table.DataCell>
                        <span className={`mono ${styles.ident}`}>{u.ident}</span>
                      </Table.DataCell>
                      <Table.DataCell>
                        <div className={styles.enhetCell}>
                          <span>{enhetName(u.enhetId)}</span>
                          <span className="muted mono" style={{ fontSize: "0.75rem" }}>
                            {u.enhetId}
                            {u.extraEnheter.length ? ` +${u.extraEnheter.length}` : ""}
                          </span>
                        </div>
                      </Table.DataCell>
                      <Table.DataCell>
                        <div className={styles.tagRow}>
                          {u.roles.map((r) => (
                            <span key={r} className={styles.rolePill} style={{ "--role": ROLE_META[r].hex } as React.CSSProperties}>
                              {ROLE_LABELS[r]}
                            </span>
                          ))}
                        </div>
                      </Table.DataCell>
                      <Table.DataCell>
                        <span className={styles.statusCell}>
                          <span className={`dot ${STATUS_META[u.status].dot} ${u.status === "AKTIV" && (u.lastActiveDaysAgo ?? 99) === 0 ? "dot--pulse" : ""}`} style={{ background: STATUS_META[u.status].hex }} />
                          {STATUS_LABELS[u.status]}
                        </span>
                      </Table.DataCell>
                      <Table.DataCell>
                        <span className={u.lastActiveDaysAgo === null || u.lastActiveDaysAgo > 30 ? "muted" : undefined}>{sinceText(u.lastActiveDaysAgo)}</span>
                      </Table.DataCell>
                      <Table.DataCell align="right">
                        <Tooltip content={`${u.sessions30d} økter · ${u.seds30d} SED-er sendt`}>
                          <span className={styles.sessionsCell}>
                            <span className="bar-track" style={{ width: 70 }}>
                              <span
                                className="bar-fill"
                                style={{ width: `${(u.sessions30d / maxSessions) * 100}%`, background: "linear-gradient(90deg, #8b5cf6, #ec4899)" }}
                              />
                            </span>
                            <span className="tabular">{u.sessions30d}</span>
                          </span>
                        </Tooltip>
                      </Table.DataCell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
            {pageRows.length === 0 ? (
              <div className="empty">
                <PersonCrossIcon aria-hidden style={{ fontSize: "2.4rem" }} />
                <div>Ingen brukere matcher filtrene.</div>
              </div>
            ) : null}
          </div>
          <div className={styles.tableFoot}>
            <span className="muted">
              Viser {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} av {filtered.length}
            </span>
            {pageCount > 1 ? <Pagination page={currentPage} count={pageCount} onPageChange={setPage} size="small" /> : null}
          </div>
        </div>
      </Section>

      <AnimatePresence>
        {selected.length > 0 ? (
          <motion.div
            className={styles.bulkBar}
            initial={{ y: 120, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 120, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <motion.span key={selected.length} className={styles.bulkCount} initial={{ scale: 1.4 }} animate={{ scale: 1 }}>
              {selected.length}
            </motion.span>
            <span className={styles.bulkLabel}>valgt</span>
            <span className={styles.bulkDivider} />
            <ActionMenu>
              <ActionMenu.Trigger>
                <Button size="small" variant="tertiary" className={styles.bulkBtn} icon={<ChevronDownIcon aria-hidden />} iconPosition="right">
                  Endre rolle
                </Button>
              </ActionMenu.Trigger>
              <ActionMenu.Content>
                <ActionMenu.Group label="Legg til rolle">
                  {ROLE_ORDER.map((r) => (
                    <ActionMenu.Item key={r} onSelect={() => bulkRole(r, true)}>
                      {ROLE_LABELS[r]}
                    </ActionMenu.Item>
                  ))}
                </ActionMenu.Group>
                <ActionMenu.Divider />
                <ActionMenu.Group label="Fjern rolle">
                  {ROLE_ORDER.map((r) => (
                    <ActionMenu.Item key={r} onSelect={() => bulkRole(r, false)} variant="danger">
                      {ROLE_LABELS[r]}
                    </ActionMenu.Item>
                  ))}
                </ActionMenu.Group>
              </ActionMenu.Content>
            </ActionMenu>
            <Button size="small" variant="tertiary" className={styles.bulkBtn} icon={<BellIcon aria-hidden />} onClick={bulkRemind}>
              Send påminnelse
            </Button>
            <Button size="small" variant="tertiary" className={`${styles.bulkBtn} ${styles.bulkDanger}`} icon={<PersonCrossIcon aria-hidden />} onClick={bulkDeactivate}>
              Deaktiver
            </Button>
            <span className={styles.bulkDivider} />
            <Button size="small" variant="tertiary" className={styles.bulkBtn} icon={<XMarkIcon aria-hidden />} onClick={() => setSelected([])} aria-label="Fjern valg" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <UserDetail user={detailUser} open={detailOpen} onOpenChange={setDetailOpen} enheter={enheter} onSave={saveUser} onRemind={remindUser} />
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} onInvite={invite} enheter={enheter} existingIdents={existingIdents} />
      {toasts}
    </>
  );
}

function StatusLegend() {
  return (
    <div className="legend">
      {STATUS_ORDER.map((s) => (
        <span key={s} className="legend__item">
          <span className="legend__swatch" style={{ background: STATUS_META[s].hex }} />
          {STATUS_LABELS[s]}
        </span>
      ))}
    </div>
  );
}


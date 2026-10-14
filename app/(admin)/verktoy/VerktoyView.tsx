"use client";

import { ClockDashedIcon, PaperplaneIcon, XMarkIcon, ArrowLeftIcon } from "@navikt/aksel-icons";
import { Button, Chips, Search } from "@navikt/ds-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHero, HeroStat } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { useToasts } from "@/components/ui/Toast";
import { CountUp } from "@/components/ui/CountUp";
import { AuditLog } from "./AuditLog";
import { SuggestToolCard, SuggestToolModal, type Suggestion } from "./SuggestTool";
import { relTime } from "./time";
import { ToolCard } from "./ToolCard";
import { ToolHeader } from "./ToolRunner";
import { TOOLS, TOOL_BY_ID } from "./tools";
import { CATEGORIES, STATUS_META, type AuditEntry, type RunRecord, type ToolCategory } from "./types";
import styles from "./verktoy.module.css";

interface Props {
  initialToolId: string | null;
  initialAudit: AuditEntry[];
  nowMs: number;
  userName: string;
}

const DAY = 86_400_000;

export function VerktoyView({ initialToolId, initialAudit, nowMs, userName }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialToolId && TOOL_BY_ID[initialToolId] ? initialToolId : null);
  const [visited, setVisited] = useState<string[]>(selectedId ? [selectedId] : []);
  const [audit, setAudit] = useState<AuditEntry[]>(initialAudit);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(nowMs);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategory | "alle" | "favoritter">("alle");
  const [favorites, setFavorites] = useState<string[]>(["publiser-sed-hendelser", "spill-av-dlq"]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const runSeq = useRef(0);
  const { toasts, push } = useToasts();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const select = (id: string | null) => {
    setSelectedId(id);
    if (id) setVisited((prev) => (prev.includes(id) ? prev : [...prev, id]));
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("verktoy", id);
    else url.searchParams.delete("verktoy");
    window.history.replaceState(null, "", url.toString());
    if (id) {
      window.setTimeout(() => workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    }
  };

  const onRunComplete = (record: RunRecord) => {
    runSeq.current += 1;
    const id = `run-${runSeq.current}`;
    const at = Date.now();
    setAudit((prev) => [{ ...record, id, atMs: at, who: userName }, ...prev]);
    setNow(at);
    setFreshIds((prev) => new Set(prev).add(id));
    window.setTimeout(
      () =>
        setFreshIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        }),
      4000,
    );
    const tool = TOOL_BY_ID[record.toolId];
    const variant = record.status === "SUCCESS" ? "success" : record.status === "DRY_RUN" ? "info" : record.status === "FAILURE" ? "error" : "warning";
    push(`${tool?.name ?? record.toolId}: ${STATUS_META[record.status].label.toLowerCase()}`, `${record.summary} · lagt i kjørehistorikken`, variant);
  };

  const lastRunByTool = useMemo(() => {
    const m = new Map<string, AuditEntry>();
    for (const e of audit) if (!m.has(e.toolId)) m.set(e.toolId, e);
    return m;
  }, [audit]);

  const runs30 = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of audit) if (now - e.atMs < 30 * DAY) m.set(e.toolId, (m.get(e.toolId) ?? 0) + 1);
    return m;
  }, [audit, now]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((t) => {
      if (category === "favoritter" && !favorites.includes(t.id)) return false;
      if (category !== "alle" && category !== "favoritter" && t.category !== category) return false;
      if (!q) return true;
      return [t.name, t.description, t.category, ...t.keywords].some((s) => s.toLowerCase().includes(q));
    }).sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)));
  }, [query, category, favorites]);

  const stats = useMemo(() => {
    const last7 = audit.filter((e) => now - e.atMs < 7 * DAY);
    const last30 = audit.filter((e) => now - e.atMs < 30 * DAY && e.status !== "DRY_RUN");
    const ok = last30.filter((e) => e.status === "SUCCESS").length;
    return { runs7: last7.length, successRate: last30.length ? (ok / last30.length) * 100 : 100, last: audit[0] };
  }, [audit, now]);

  const selected = selectedId ? TOOL_BY_ID[selectedId] : null;
  const compact = !!selected;

  const searchField = (
    <Search
      label="Søk etter verktøy"
      hideLabel
      variant="simple"
      size="small"
      value={query}
      onChange={setQuery}
      placeholder={compact ? "Søk …" : "Søk etter verktøy, topic, system …"}
      htmlSize={compact ? undefined : 30}
    />
  );

  const toggleFavorite = (id: string) => setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <>
      <PageHero
        variant="ocean"
        eyebrow="Ad hoc-verktøy"
        title="Verktøykasse"
        lead="Trygge, sporbare verktøy for de tingene vi før gjorde med curl og SQL. Hver kjøring valideres, bekreftes og logges."
        actions={
          <>
            <Button className={styles.heroPrimary} icon={<PaperplaneIcon aria-hidden />} onClick={() => select("publiser-sed-hendelser")}>
              Publiser SED-hendelser
            </Button>
            <Button
              variant="tertiary"
              data-color="neutral"
              icon={<ClockDashedIcon aria-hidden />}
              onClick={() => document.getElementById("kjorehistorikk")?.scrollIntoView({ behavior: "smooth" })}
              className={styles.heroGhost}
            >
              Kjørehistorikk
            </Button>
          </>
        }
      >
        <HeroStat label="Verktøy" value={<CountUp value={TOOLS.length} />} hint="+ ett på vei fra deg?" />
        <HeroStat label="Kjøringer siste 7 dager" value={<CountUp value={stats.runs7} />} hint={`${audit.length} i loggen totalt`} />
        <HeroStat label="Suksessrate 30 d" value={<CountUp value={stats.successRate} decimals={0} suffix=" %" />} hint="Uten tørrkjøringer" />
        <HeroStat
          label="Sist kjørt"
          value={stats.last ? relTime(stats.last.atMs, now).replace(/^for /, "") : "–"}
          hint={stats.last ? `${TOOL_BY_ID[stats.last.toolId]?.name ?? ""} · ${stats.last.who.split(" ")[0]}` : undefined}
        />
      </PageHero>

      <Section
        kicker="Verktøy"
        title={selected ? "Arbeidsflate" : "Hva vil du gjøre?"}
        lead={
          selected
            ? "Alle verktøy følger samme flyt: fyll ut skjema, bekreft, se fremdriften og få et resultat som logges."
            : "Velg et verktøy for å åpne det. Risikable verktøy krever bekreftelse, og alt du kjører havner i kjørehistorikken."
        }
        actions={
          selected ? (
            <Button variant="tertiary" size="small" icon={<ArrowLeftIcon aria-hidden />} onClick={() => select(null)}>
              Alle verktøy
            </Button>
          ) : null
        }
      >
        <AnimatePresence initial={false}>
          {!compact ? (
            <motion.div
              key="filters"
              className={`sticky-filters ${styles.filters}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
            >
              {searchField}
              <Chips size="small">
                {(["alle", "favoritter", ...CATEGORIES] as const).map((c) => (
                  <Chips.Toggle key={c} selected={category === c} onClick={() => setCategory(c)} checkmark={false}>
                    {c === "alle" ? "Alle" : c === "favoritter" ? "★ Favoritter" : c}
                  </Chips.Toggle>
                ))}
              </Chips>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div ref={workspaceRef} className={styles.workspaceAnchor} />
        <LayoutGroup>
          <div className={compact ? styles.split : undefined}>
            <motion.div layout className={compact ? styles.rail : styles.gallery}>
              {compact ? <div className={styles.railSearch}>{searchField}</div> : null}
              <AnimatePresence mode="popLayout">
                {filtered.map((t) => (
                  <ToolCard
                    key={t.id}
                    tool={t}
                    lastRun={lastRunByTool.get(t.id)}
                    runs30d={runs30.get(t.id) ?? 0}
                    now={now}
                    favorite={favorites.includes(t.id)}
                    selected={t.id === selectedId}
                    compact={compact}
                    onSelect={() => select(t.id === selectedId ? null : t.id)}
                    onToggleFavorite={() => toggleFavorite(t.id)}
                  />
                ))}
                <SuggestToolCard key="suggest" suggestions={suggestions} onOpen={() => setSuggestOpen(true)} compact={compact} />
              </AnimatePresence>
              {filtered.length === 0 ? (
                <div className={`empty ${styles.galleryEmpty}`}>
                  Ingen verktøy matcher «{query}».{" "}
                  <Button
                    size="xsmall"
                    variant="tertiary"
                    icon={<XMarkIcon aria-hidden />}
                    onClick={() => {
                      setQuery("");
                      setCategory("alle");
                    }}
                  >
                    Nullstill
                  </Button>
                </div>
              ) : null}
            </motion.div>

            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key="workspace"
                  className={`card ${styles.workspace}`}
                  style={{ ["--tool" as string]: selected.color }}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className={styles.workspaceGlow} />
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={selected.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ToolHeader tool={selected} onClose={() => select(null)} />
                    </motion.div>
                  </AnimatePresence>
                  {/* Visited tools stay mounted so half-filled forms survive switching. */}
                  {visited.map((id) => {
                    const t = TOOL_BY_ID[id];
                    const Component = t.component;
                    return (
                      <div key={id} hidden={id !== selected.id}>
                        <Component tool={t} onRunComplete={onRunComplete} />
                      </div>
                    );
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      </Section>

      <Section
        id="kjorehistorikk"
        kicker="Revisjon"
        title="Kjørehistorikk"
        lead="Hvem kjørte hva, når, med hvilke parametere – og hvordan det gikk. Nye kjøringer dukker opp øverst."
      >
        <AuditLog entries={audit} freshIds={freshIds} now={now} userName={userName} selectedToolId={selectedId} onOpenTool={(id) => select(id)} />
      </Section>

      <SuggestToolModal
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        onSubmit={(s) => {
          setSuggestions((prev) => [s, ...prev]);
          setSuggestOpen(false);
          push("Takk for forslaget!", `«${s.name}» er sendt til Team EESSI`, "success");
        }}
      />
      {toasts}
    </>
  );
}

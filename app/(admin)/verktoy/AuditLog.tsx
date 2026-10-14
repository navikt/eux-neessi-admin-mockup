"use client";

import { ChevronDownIcon } from "@navikt/aksel-icons";
import { Button, Search, Table, Tag, ToggleGroup } from "@navikt/ds-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { initials } from "@/lib/session";
import { clockTime, dayLabel, fmtDuration, relTime } from "./time";
import { TOOL_BY_ID } from "./tools";
import { STATUS_META, type AuditEntry } from "./types";
import styles from "./verktoy.module.css";

interface Props {
  entries: AuditEntry[];
  freshIds: Set<string>;
  now: number;
  userName: string;
  selectedToolId: string | null;
  onOpenTool: (id: string) => void;
}

const PAGE = 10;

export function AuditLog({ entries, freshIds, now, userName, selectedToolId, onOpenTool }: Props) {
  const [scope, setScope] = useState("alle");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (scope === "mine" && e.who !== userName) return false;
      if (scope === "verktoy" && e.toolId !== selectedToolId) return false;
      if (scope === "feil" && e.status !== "FAILURE" && e.status !== "PARTIAL_SUCCESS") return false;
      if (!q) return true;
      const tool = TOOL_BY_ID[e.toolId];
      return [e.who, e.params, e.summary, tool?.name ?? ""].some((s) => s.toLowerCase().includes(q));
    });
  }, [entries, scope, query, userName, selectedToolId]);

  const rows = filtered.slice(0, limit);
  const effectiveScope = scope === "verktoy" && !selectedToolId ? "alle" : scope;

  return (
    <div className="card card--flush">
      <div className={styles.auditToolbar}>
        <div className={styles.auditScope}>
        <ToggleGroup size="small" value={effectiveScope} onChange={setScope} aria-label="Vis kjøringer">
          <ToggleGroup.Item value="alle" label="Alle" />
          <ToggleGroup.Item value="mine" label="Mine" />
          <ToggleGroup.Item value="feil" label="Med feil" />
          {selectedToolId ? <ToggleGroup.Item value="verktoy" label="Valgt verktøy" /> : null}
        </ToggleGroup>
        </div>
        <div style={{ flex: 1 }} />
        <Search
          label="Søk i kjørehistorikk"
          hideLabel
          variant="simple"
          size="small"
          value={query}
          onChange={setQuery}
          placeholder="Søk på person, sak, topic …"
          htmlSize={28}
        />
      </div>
      <div className={styles.auditScroll}>
        <Table size="small" className={styles.auditTable}>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell scope="col">Når</Table.HeaderCell>
              <Table.HeaderCell scope="col">Hvem</Table.HeaderCell>
              <Table.HeaderCell scope="col">Verktøy</Table.HeaderCell>
              <Table.HeaderCell scope="col">Parametere</Table.HeaderCell>
              <Table.HeaderCell scope="col">Resultat</Table.HeaderCell>
              <Table.HeaderCell scope="col" align="right">
                Varighet
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <AnimatePresence initial={false}>
              {rows.map((e) => {
                const tool = TOOL_BY_ID[e.toolId];
                const Icon = tool?.icon;
                const fresh = freshIds.has(e.id);
                return (
                  <motion.tr
                    key={e.id}
                    layout="position"
                    className={`${styles.auditRow} ${fresh ? styles.auditRowFresh : ""}`}
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Table.DataCell>
                      <div className={styles.auditWhen}>
                        <span>
                          {dayLabel(e.atMs, now)} <span className="tabular">{clockTime(e.atMs)}</span>
                        </span>
                        <span className="muted">{relTime(e.atMs, now)}</span>
                      </div>
                    </Table.DataCell>
                    <Table.DataCell>
                      <span className={styles.inlineGap}>
                        <span className="avatar avatar--sm">{initials(e.who)}</span>
                        <span style={{ whiteSpace: "nowrap" }}>
                          {e.who}
                          {e.who === userName ? <span className="muted"> (deg)</span> : null}
                        </span>
                      </span>
                    </Table.DataCell>
                    <Table.DataCell>
                      {tool && Icon ? (
                        <button type="button" className={styles.auditTool} onClick={() => onOpenTool(tool.id)} style={{ ["--tool" as string]: tool.color }}>
                          <span className={styles.auditToolIcon}>
                            <Icon aria-hidden />
                          </span>
                          {tool.name}
                        </button>
                      ) : (
                        e.toolId
                      )}
                    </Table.DataCell>
                    <Table.DataCell>
                      <span className={styles.auditParams}>{e.params}</span>
                    </Table.DataCell>
                    <Table.DataCell>
                      <div className={styles.auditResult}>
                        <Tag size="xsmall" variant="moderate" data-color={STATUS_META[e.status].color}>
                          {STATUS_META[e.status].label}
                        </Tag>
                        <span className="muted">{e.summary}</span>
                      </div>
                    </Table.DataCell>
                    <Table.DataCell align="right" className="tabular muted">
                      {fmtDuration(e.durationMs)}
                    </Table.DataCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </Table.Body>
        </Table>
        {rows.length === 0 ? <div className="empty">Ingen kjøringer matcher filteret</div> : null}
      </div>
      <div className={styles.auditFoot}>
        <span className="muted">
          Viser {rows.length} av {filtered.length} kjøringer · logges i 12 måneder
        </span>
        {filtered.length > limit ? (
          <Button size="small" variant="tertiary" icon={<ChevronDownIcon aria-hidden />} iconPosition="right" onClick={() => setLimit((l) => l + PAGE)}>
            Vis flere
          </Button>
        ) : null}
      </div>
    </div>
  );
}

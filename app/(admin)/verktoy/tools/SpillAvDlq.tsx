"use client";

import { ArrowRedoIcon, CheckmarkIcon, XMarkIcon } from "@navikt/aksel-icons";
import { BodyShort, Checkbox, Table, Tag, ToggleGroup } from "@navikt/ds-react";
import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { fmtInt } from "@/lib/format";
import { CONSUMER_GROUPS, dlqMessages, replayOutcome, type ConsumerGroup, type DlqMessage } from "../mock";
import { ToolRunner, type RunContext, type RunOutcome } from "../ToolRunner";
import type { RunStatus, ToolComponentProps } from "../types";
import styles from "../verktoy.module.css";

interface ReplayResult {
  group: ConsumerGroup;
  items: { msg: DlqMessage; ok: boolean }[];
}

function ago(min: number): string {
  if (min < 60) return `${min} min siden`;
  if (min < 60 * 24) return `${Math.floor(min / 60)} t siden`;
  return `${Math.floor(min / 1440)} d siden`;
}

export function SpillAvDlq({ tool, onRunComplete }: ToolComponentProps) {
  const [messages, setMessages] = useState<DlqMessage[]>(() => dlqMessages());
  const [group, setGroup] = useState<ConsumerGroup>("eux-journal");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const salt = useRef(0);

  const visible = useMemo(() => messages.filter((m) => m.group === group), [messages, group]);
  const chosen = visible.filter((m) => selected.has(m.id));
  const allChecked = visible.length > 0 && chosen.length === visible.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = async (ctx: RunContext): Promise<RunOutcome<ReplayResult>> => {
    salt.current += 1;
    const items: ReplayResult["items"] = [];
    ctx.step(`Pauser DLQ-konsument for ${group}`);
    await ctx.sleep(400);
    for (let i = 0; i < chosen.length; i++) {
      const m = chosen[i];
      ctx.step(`Spiller av offset ${fmtInt(m.offset)} (sak ${m.rinasakId})`);
      await ctx.sleep(320 + ((i * 53) % 200));
      items.push({ msg: m, ok: replayOutcome(m, salt.current) });
      ctx.progress((i + 1) / (chosen.length + 1));
    }
    ctx.step("Committer offsets og gjenopptar konsument");
    await ctx.sleep(350);
    const okIds = new Set(items.filter((x) => x.ok).map((x) => x.msg.id));
    setMessages((prev) =>
      prev.filter((m) => !okIds.has(m.id)).map((m) => (selected.has(m.id) ? { ...m, attempts: m.attempts + 1, minutesAgo: 0 } : m)),
    );
    setSelected(new Set());
    const ok = okIds.size;
    const status: RunStatus = ok === items.length ? "SUCCESS" : ok === 0 ? "FAILURE" : "PARTIAL_SUCCESS";
    return {
      status,
      headline: `${ok} av ${items.length} meldinger behandlet på nytt i ${group}`,
      summary: `${ok} av ${items.length} spilt av`,
      params: `${group} · ${items.length} meldinger`,
      data: { group, items },
    };
  };

  return (
    <ToolRunner<ReplayResult>
      tool={tool}
      onRunComplete={onRunComplete}
      canRun={chosen.length > 0}
      runLabel={chosen.length ? `Spill av ${chosen.length} ${chosen.length === 1 ? "melding" : "meldinger"}` : "Spill av meldinger"}
      runIcon={<ArrowRedoIcon aria-hidden />}
      footerNote={chosen.length ? `${chosen.length} valgt i ${group}` : "Velg meldinger som skal spilles av"}
      confirm={{
        heading: "Spille av meldinger?",
        confirmLabel: `Spill av ${chosen.length}`,
        body: (
          <BodyShort>
            <strong>{chosen.length} meldinger</strong> sendes tilbake til <span className="mono">{group}</span>. Feiler de igjen, havner de
            tilbake i DLQ med økt antall forsøk.
          </BodyShort>
        ),
      }}
      run={run}
      renderResult={(d) => (
        <ul className={styles.replayList}>
          {d.items.map((x, i) => (
            <motion.li
              key={x.msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <span className={styles.rowIcon} data-ok={x.ok}>
                {x.ok ? <CheckmarkIcon aria-hidden /> : <XMarkIcon aria-hidden />}
              </span>
              <span className="sed-code">{x.msg.sedType}</span>
              <span className="mono">{x.msg.rinasakId}</span>
              <span className="muted mono" style={{ fontSize: "0.8rem" }}>
                p{x.msg.partition}:{fmtInt(x.msg.offset)}
              </span>
              <span style={{ marginLeft: "auto" }}>
                {x.ok ? (
                  <Tag size="xsmall" variant="moderate" data-color="success">
                    Behandlet
                  </Tag>
                ) : (
                  <Tag size="xsmall" variant="moderate" data-color="danger">
                    {x.msg.error}
                  </Tag>
                )}
              </span>
            </motion.li>
          ))}
        </ul>
      )}
    >
      <div className={styles.stack}>
        <div className={styles.dlqGroups}>
          {CONSUMER_GROUPS.map((g) => {
            const n = messages.filter((m) => m.group === g).length;
            return (
              <button
                key={g}
                type="button"
                className={styles.dlqGroup}
                data-active={g === group}
                onClick={() => {
                  setGroup(g);
                  setSelected(new Set());
                }}
              >
                {g === group ? <motion.span layoutId="dlq-group-bg" className={styles.dlqGroupBg} /> : null}
                <span className="mono">{g}</span>
                <span className={styles.dlqCount} data-zero={n === 0}>
                  {n}
                </span>
              </button>
            );
          })}
        </div>

        <div className={styles.tableScroll}>
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.DataCell style={{ width: 44 }}>
                  <Checkbox
                    hideLabel
                    size="small"
                    checked={allChecked}
                    indeterminate={chosen.length > 0 && !allChecked}
                    onChange={() => setSelected(allChecked ? new Set() : new Set(visible.map((m) => m.id)))}
                  >
                    Velg alle
                  </Checkbox>
                </Table.DataCell>
                <Table.HeaderCell scope="col">Sak</Table.HeaderCell>
                <Table.HeaderCell scope="col">Topic · offset</Table.HeaderCell>
                <Table.HeaderCell scope="col">Feil</Table.HeaderCell>
                <Table.HeaderCell scope="col" align="right">
                  Forsøk
                </Table.HeaderCell>
                <Table.HeaderCell scope="col" align="right">
                  Feilet
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
                {visible.map((m) => (
                  <Table.Row key={m.id} selected={selected.has(m.id)} onClick={() => toggle(m.id)} className={styles.clickRow}>
                    <Table.DataCell>
                      <Checkbox hideLabel size="small" checked={selected.has(m.id)} onChange={() => toggle(m.id)} onClick={(e) => e.stopPropagation()}>
                        Velg melding
                      </Checkbox>
                    </Table.DataCell>
                    <Table.DataCell>
                      <span className={styles.inlineGap}>
                        <span className="sed-code">{m.sedType}</span>
                        <span className="mono">{m.rinasakId}</span>
                      </span>
                    </Table.DataCell>
                    <Table.DataCell>
                      <span className="mono muted" style={{ fontSize: "0.8rem" }}>
                        {m.topic.replace("eessibasis.", "")} · p{m.partition}:{fmtInt(m.offset)}
                      </span>
                    </Table.DataCell>
                    <Table.DataCell>
                      <span className={styles.errorText}>{m.error}</span>
                    </Table.DataCell>
                    <Table.DataCell align="right" className="tabular">
                      {m.attempts}
                    </Table.DataCell>
                    <Table.DataCell align="right" className="muted" style={{ whiteSpace: "nowrap" }}>
                      {m.minutesAgo === 0 ? "Nå nettopp" : ago(m.minutesAgo)}
                    </Table.DataCell>
                  </Table.Row>
                ))}
            </Table.Body>
          </Table>
          {visible.length === 0 ? (
            <div className="empty">
              <CheckmarkIcon aria-hidden fontSize="2rem" color="#10b981" />
              <div>DLQ for {group} er tom</div>
            </div>
          ) : null}
        </div>
      </div>
    </ToolRunner>
  );
}

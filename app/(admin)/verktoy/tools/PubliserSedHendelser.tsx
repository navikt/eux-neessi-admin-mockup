"use client";

import {
  ArrowUndoIcon,
  CheckmarkIcon,
  ExclamationmarkTriangleIcon,
  FilesIcon,
  MagnifyingGlassCheckmarkIcon,
  PaperplaneIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from "@navikt/aksel-icons";
import {
  BodyShort,
  Button,
  CopyButton,
  InlineMessage,
  Radio,
  RadioGroup,
  Switch,
  Table,
  Tag,
  Textarea,
  ToggleGroup,
  Tooltip,
} from "@navikt/ds-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { fmtInt } from "@/lib/format";
import { exampleLines, publishOutcome, TOPICS, type TopicId } from "../mock";
import { ToolRunner, type RunContext, type RunOutcome } from "../ToolRunner";
import type { RunStatus, ToolComponentProps } from "../types";
import styles from "../verktoy.module.css";

/* ------------------------------ Parsing ------------------------------ */

type LineStatus = "valid" | "invalid" | "duplicate";

interface ParsedLine {
  lineNo: number;
  raw: string;
  status: LineStatus;
  reason?: string;
  rinasakId?: string;
  documentId?: string;
  version?: string;
}

function validate(raw: string): string | null {
  const parts = raw.split("_");
  if (parts.length !== 3) return `Forventet 3 deler adskilt med «_», fant ${parts.length}`;
  const [rinasakId, documentId, version] = parts;
  if (!rinasakId) return "Mangler rinasakId";
  if (!/^\d+$/.test(rinasakId)) return "rinasakId kan bare inneholde siffer";
  if (documentId.length !== 32) return `documentId må være 32 tegn (fant ${documentId.length})`;
  if (!/^[0-9a-f]{32}$/i.test(documentId)) return "documentId må være heksadesimal (0–9, a–f)";
  if (!/^\d+$/.test(version)) return "documentVersion må være et heltall";
  return null;
}

function parseLines(text: string): ParsedLine[] {
  const seen = new Map<string, number>();
  const out: ParsedLine[] = [];
  text.split("\n").forEach((line, i) => {
    const raw = line.trim();
    if (!raw) return;
    const lineNo = i + 1;
    const reason = validate(raw);
    if (reason) {
      out.push({ lineNo, raw, status: "invalid", reason });
      return;
    }
    const [rinasakId, documentId, version] = raw.split("_");
    const key = raw.toLowerCase();
    const first = seen.get(key);
    if (first !== undefined) {
      out.push({ lineNo, raw, status: "duplicate", reason: `= linje ${first}`, rinasakId, documentId, version });
      return;
    }
    seen.set(key, lineNo);
    out.push({ lineNo, raw, status: "valid", rinasakId, documentId: documentId.toLowerCase(), version });
  });
  return out;
}

const shortId = (id: string) => `${id.slice(0, 6)}…${id.slice(-4)}`;

/* ------------------------------ Result types ------------------------------ */

interface LineResult {
  line: string;
  rinasakId: string;
  documentId: string;
  version: string;
  ok: boolean;
  detail: string;
}

interface PublishResult {
  topic: TopicId;
  dryRun: boolean;
  successCount: number;
  failureCount: number;
  lines: LineResult[];
}

type Cell = "pending" | "ok" | "fail";

/* ------------------------------ Component ------------------------------ */

export function PubliserSedHendelser({ tool, onRunComplete }: ToolComponentProps) {
  const [text, setText] = useState("");
  const [topic, setTopic] = useState<TopicId>("eessibasis.sedmottatt-v1");
  const [dryRun, setDryRun] = useState(false);
  const [cells, setCells] = useState<Cell[]>([]);

  const parsed = useMemo(() => parseLines(text), [text]);
  const valid = parsed.filter((p) => p.status === "valid");
  const invalid = parsed.filter((p) => p.status === "invalid");
  const dupes = parsed.filter((p) => p.status === "duplicate");

  const run = async (ctx: RunContext): Promise<RunOutcome<PublishResult>> => {
    const lines = valid;
    setCells(lines.map(() => "pending"));
    ctx.step(`Validerer ${lines.length} linjer`);
    ctx.progress(0.03);
    await ctx.sleep(450);
    ctx.step("Slår opp dokumenter i RINA CPI");
    ctx.progress(0.08);
    await ctx.sleep(550);
    ctx.step(dryRun ? "Tørrkjøring – sjekker uten å publisere" : `Publiserer til ${topic}`);
    const results: LineResult[] = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      await ctx.sleep(lines.length > 30 ? 60 : 140 + ((i * 37) % 90));
      const o = publishOutcome(l.raw);
      results.push({
        line: l.raw,
        rinasakId: l.rinasakId ?? "",
        documentId: l.documentId ?? "",
        version: l.version ?? "",
        ok: o.ok,
        detail: o.ok ? (dryRun ? "Klar for publisering" : `p${o.partition} · offset ${fmtInt(o.offset)}`) : o.reason,
      });
      setCells((prev) => prev.map((c, j) => (j === i ? (o.ok ? "ok" : "fail") : c)));
      ctx.progress(0.1 + ((i + 1) / lines.length) * 0.85);
    }
    ctx.step(dryRun ? "Oppsummerer tørrkjøring" : "Venter på ack fra Kafka");
    await ctx.sleep(500);
    const successCount = results.filter((r) => r.ok).length;
    const failureCount = results.length - successCount;
    const status: RunStatus = dryRun ? "DRY_RUN" : failureCount === 0 ? "SUCCESS" : successCount === 0 ? "FAILURE" : "PARTIAL_SUCCESS";
    const headline = dryRun
      ? `${successCount} av ${results.length} hendelser kan publiseres – ingenting er sendt`
      : `${successCount} av ${results.length} hendelser publisert til ${topic}`;
    return {
      status,
      headline,
      summary: dryRun ? `${successCount} av ${results.length} klare (tørrkjøring)` : `${successCount} av ${results.length} publisert`,
      params: `${results.length} ${results.length === 1 ? "linje" : "linjer"} · ${topic}`,
      data: { topic, dryRun, successCount, failureCount, lines: results },
    };
  };

  return (
    <ToolRunner<PublishResult>
      tool={tool}
      onRunComplete={onRunComplete}
      canRun={valid.length > 0}
      runLabel={dryRun ? `Tørrkjør ${valid.length} hendelser` : `Publiser ${valid.length} hendelser`}
      runIcon={dryRun ? <MagnifyingGlassCheckmarkIcon aria-hidden /> : <PaperplaneIcon aria-hidden />}
      footerNote={
        valid.length > 0 ? (
          <>
            <strong>{valid.length}</strong> klare → <span className="mono">{topic.replace("eessibasis.", "")}</span>
          </>
        ) : (
          "Lim inn minst én gyldig linje"
        )
      }
      formActions={
        <>
          <Button variant="secondary" size="small" icon={<SparklesIcon aria-hidden />} onClick={() => setText(exampleLines())}>
            Fyll inn eksempel
          </Button>
          <Button variant="tertiary" size="small" icon={<TrashIcon aria-hidden />} onClick={() => setText("")} disabled={!text}>
            Tøm
          </Button>
        </>
      }
      confirm={
        dryRun
          ? null
          : {
              heading: "Publiser SED-hendelser?",
              confirmLabel: `Publiser ${valid.length} hendelser`,
              body: (
                <div className={styles.confirmStack}>
                  <BodyShort>
                    Du er i ferd med å publisere <strong>{valid.length} hendelser</strong> til{" "}
                    <span className="mono">{topic}</span>.
                  </BodyShort>
                  <BodyShort size="small" className="muted">
                    Hendelsene plukkes opp av eux-journal, eux-oppgave og eux-nav-rinasak. Det kan gi nye journalposter og
                    oppgaver hvis de ikke allerede finnes.
                  </BodyShort>
                  {invalid.length + dupes.length > 0 ? (
                    <InlineMessage status="info" size="small">
                      {invalid.length} ugyldige og {dupes.length} dupliserte linjer hoppes over.
                    </InlineMessage>
                  ) : null}
                </div>
              ),
            }
      }
      run={run}
      liveView={<CellGrid cells={cells} />}
      renderResult={(data) => <PublishResultView data={data} />}
      resultActions={(data, back) => {
        const failed = data.lines.filter((l) => !l.ok);
        return (
          <>
            <CopyButton size="small" variant="action" copyText={toCsv(data)} text="Kopier resultat (CSV)" activeText="Kopiert!" />
            {failed.length > 0 ? (
              <>
                <CopyButton
                  size="small"
                  variant="neutral"
                  copyText={failed.map((l) => l.line).join("\n")}
                  text={`Kopier ${failed.length} feilede`}
                  activeText="Kopiert!"
                />
                <Button
                  size="small"
                  variant="tertiary"
                  icon={<ArrowUndoIcon aria-hidden />}
                  onClick={() => {
                    setText(failed.map((l) => l.line).join("\n"));
                    back();
                  }}
                >
                  Prøv feilede på nytt
                </Button>
              </>
            ) : null}
          </>
        );
      }}
    >
      <div className={styles.publishGrid}>
        <div className={styles.stack}>
          <Textarea
            label="Hendelser"
            description="Én hendelse per linje på formatet rinasakId_documentId_documentVersion"
            value={text}
            onChange={(e) => setText(e.target.value)}
            minRows={8}
            maxRows={14}
            resize="vertical"
            placeholder={"1452389_8f3c2a91b7e64d0c9a1f2b3c4d5e6f70_1\n1452390_0c7d1e44a8b94f22b6d3e1f0a9c8b7d6_2"}
            className={styles.monoArea}
          />

          <div className={styles.validationHead}>
            <span className={styles.counter} data-kind="valid">
              <CheckmarkIcon aria-hidden /> {valid.length} gyldige
            </span>
            <span className={styles.counter} data-kind="invalid">
              <XMarkIcon aria-hidden /> {invalid.length} ugyldige
            </span>
            <span className={styles.counter} data-kind="duplicate">
              <FilesIcon aria-hidden /> {dupes.length} duplikater
            </span>
          </div>

          <AnimatePresence initial={false}>
            {dupes.length > 0 ? (
              <motion.div
                key="dupes"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden" }}
              >
                <InlineMessage status="warning" size="small">
                  {dupes.length === 1 ? "1 linje er" : `${dupes.length} linjer er`} lagt inn flere ganger. Duplikater fjernes
                  automatisk – hver hendelse publiseres bare én gang.
                </InlineMessage>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {parsed.length > 0 ? (
            <div className={styles.lineChips}>
              <AnimatePresence initial={false} mode="popLayout">
                {parsed.map((p) => (
                  <motion.div
                    key={`${p.lineNo}-${p.raw}`}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  >
                    <Tooltip content={p.raw} placement="top">
                      <span className={styles.lineChip} data-status={p.status}>
                        <span className={styles.lineChipIcon}>
                          {p.status === "valid" ? (
                            <CheckmarkIcon aria-hidden />
                          ) : p.status === "duplicate" ? (
                            <FilesIcon aria-hidden />
                          ) : (
                            <XMarkIcon aria-hidden />
                          )}
                        </span>
                        <span className={styles.lineNo}>L{p.lineNo}</span>
                        {p.status === "invalid" ? (
                          <span>{p.reason}</span>
                        ) : (
                          <span className="mono">
                            {p.rinasakId} · {shortId(p.documentId ?? "")} · v{p.version}
                          </span>
                        )}
                        {p.status === "duplicate" ? <span className={styles.lineChipNote}>{p.reason}</span> : null}
                      </span>
                    </Tooltip>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className={styles.emptyHint}>
              <SparklesIcon aria-hidden />
              <span>
                Lim inn linjer, eller trykk <strong>Fyll inn eksempel</strong> for å se valideringen i aksjon.
              </span>
            </div>
          )}
        </div>

        <div className={styles.stack}>
          <RadioGroup legend="Topic" value={topic} onChange={(v: TopicId) => setTopic(v)} className={styles.radioCards}>
            {TOPICS.map((t) => (
              <Radio key={t.id} value={t.id} description={t.description} className={styles.radioCard}>
                <span className={styles.radioCardTitle}>{t.label}</span>
                <span className={`mono ${styles.radioCardTopic}`}>{t.id}</span>
              </Radio>
            ))}
          </RadioGroup>

          <div className={styles.switchCard} data-on={dryRun}>
            <Switch checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} description="Slår opp i RINA, men sender ingenting til Kafka">
              Tørrkjøring
            </Switch>
          </div>

          <div className={styles.tipCard}>
            <ExclamationmarkTriangleIcon aria-hidden />
            <BodyShort size="small">
              Brukes når en hendelse har gått tapt eller må behandles på nytt, f.eks. etter feil i journalføringen. Konsumentene er
              idempotente, men nye oppgaver kan bli opprettet.
            </BodyShort>
          </div>
        </div>
      </div>
    </ToolRunner>
  );
}

function CellGrid({ cells }: { cells: Cell[] }) {
  if (!cells.length) return null;
  return (
    <div className={styles.cellGrid}>
      {cells.map((c, i) => (
        <motion.span
          key={i}
          className={styles.cell}
          data-state={c}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: c === "pending" ? 1 : [1.35, 1], opacity: 1 }}
          transition={{ duration: 0.3, delay: c === "pending" ? i * 0.01 : 0 }}
        />
      ))}
    </div>
  );
}

function toCsv(data: PublishResult): string {
  const rows = data.lines.map((l) => [l.rinasakId, l.documentId, l.version, l.ok ? "OK" : "FEIL", l.detail].join(";"));
  return ["rinasakId;documentId;documentVersion;resultat;detaljer", ...rows].join("\n");
}

function PublishResultView({ data }: { data: PublishResult }) {
  const [filter, setFilter] = useState(data.failureCount > 0 && !data.dryRun ? "feil" : "alle");
  const total = data.lines.length;
  const rows = data.lines.filter((l) => (filter === "alle" ? true : filter === "ok" ? l.ok : !l.ok));
  const response = {
    status: data.dryRun ? "DRY_RUN" : data.failureCount === 0 ? "SUCCESS" : data.successCount === 0 ? "FAILURE" : "PARTIAL_SUCCESS",
    successCount: data.successCount,
    failureCount: data.failureCount,
  };

  return (
    <div className={styles.stack}>
      <div className={styles.resultStats}>
        <div className={styles.resultStat} data-kind="ok">
          <span className={styles.resultStatValue}>{data.successCount}</span>
          <span className={styles.resultStatLabel}>{data.dryRun ? "kan publiseres" : "publisert"}</span>
        </div>
        <div className={styles.resultStat} data-kind="fail">
          <span className={styles.resultStatValue}>{data.failureCount}</span>
          <span className={styles.resultStatLabel}>feilet</span>
        </div>
        <div className={styles.resultRatio}>
          <div className={styles.ratioTrack}>
            <motion.span
              className={styles.ratioOk}
              initial={{ width: 0 }}
              animate={{ width: `${(data.successCount / Math.max(1, total)) * 100}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            />
            <motion.span
              className={styles.ratioFail}
              initial={{ width: 0 }}
              animate={{ width: `${(data.failureCount / Math.max(1, total)) * 100}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
            />
          </div>
          <pre className={styles.jsonPreview}>{JSON.stringify(response, null, 2)}</pre>
        </div>
      </div>

      <ToggleGroup size="small" value={filter} onChange={setFilter} label="Vis linjer">
        <ToggleGroup.Item value="alle" label={`Alle (${total})`} />
        <ToggleGroup.Item value="ok" label={`OK (${data.successCount})`} />
        <ToggleGroup.Item value="feil" label={`Feilet (${data.failureCount})`} />
      </ToggleGroup>

      <div className={styles.tableScroll}>
        <Table size="small">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell scope="col" style={{ width: 40 }} />
              <Table.HeaderCell scope="col">rinasakId</Table.HeaderCell>
              <Table.HeaderCell scope="col">documentId</Table.HeaderCell>
              <Table.HeaderCell scope="col" align="right">
                Versjon
              </Table.HeaderCell>
              <Table.HeaderCell scope="col">Resultat</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((l) => (
              <Table.Row key={l.line}>
                <Table.DataCell>
                  <span className={styles.rowIcon} data-ok={l.ok}>
                    {l.ok ? <CheckmarkIcon aria-hidden /> : <XMarkIcon aria-hidden />}
                  </span>
                </Table.DataCell>
                <Table.DataCell className="mono">{l.rinasakId}</Table.DataCell>
                <Table.DataCell className="mono" title={l.documentId}>
                  {shortId(l.documentId)}
                </Table.DataCell>
                <Table.DataCell align="right" className="tabular">
                  {l.version}
                </Table.DataCell>
                <Table.DataCell>
                  {l.ok ? (
                    <span className="muted mono" style={{ fontSize: "0.8rem" }}>
                      {l.detail}
                    </span>
                  ) : (
                    <Tag size="xsmall" variant="moderate" data-color="danger">
                      {l.detail}
                    </Tag>
                  )}
                </Table.DataCell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        {rows.length === 0 ? <div className="empty">Ingen linjer i dette utvalget</div> : null}
      </div>
    </div>
  );
}

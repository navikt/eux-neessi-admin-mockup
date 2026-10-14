"use client";

import {
  CheckmarkCircleFillIcon,
  CheckmarkIcon,
  ExclamationmarkTriangleFillIcon,
  MagnifyingGlassCheckmarkIcon,
  PlayFillIcon,
  ArrowUndoIcon,
  XMarkOctagonFillIcon,
} from "@navikt/aksel-icons";
import { BodyLong, BodyShort, Button, Loader, Modal, ProgressBar, Tag, TextField } from "@navikt/ds-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { fmtDec } from "@/lib/format";
import { RISK_META, STATUS_META, type RunRecord, type RunStatus, type ToolDefinition } from "./types";
import styles from "./verktoy.module.css";

/* ==========================================================================
   ToolRunner — the shared lifecycle every tool uses:
   form → (confirm, for risky tools) → running → result
   ========================================================================== */

export interface RunContext {
  /** Add a new line to the live log. The previous line is marked done. */
  step: (label: string) => void;
  /** Progress 0..1 */
  progress: (fraction: number) => void;
  sleep: (ms: number) => Promise<void>;
}

export interface RunOutcome<R> {
  status: RunStatus;
  /** Big result headline, e.g. "12 av 14 hendelser publisert". */
  headline: string;
  /** Short parameter summary for the audit log. */
  params: string;
  /** Short result summary for the audit log (defaults to headline). */
  summary?: string;
  data: R;
}

export interface ConfirmSpec {
  heading: string;
  body: ReactNode;
  confirmLabel: string;
  /** If set, the user has to type this word to enable the confirm button. */
  typeToConfirm?: string;
}

interface Props<R> {
  tool: ToolDefinition;
  onRunComplete: (record: RunRecord) => void;
  /** The form. Its state lives in the tool component, so it survives a run. */
  children: ReactNode;
  canRun: boolean;
  runLabel: string;
  runIcon?: ReactNode;
  /** Extra buttons on the left side of the form footer. */
  formActions?: ReactNode;
  /** Short hint next to the run button (e.g. "12 hendelser klare"). */
  footerNote?: ReactNode;
  /** Confirmation dialog before running. Omit/`null` to run directly (low risk tools, dry runs). */
  confirm?: ConfirmSpec | null;
  run: (ctx: RunContext) => Promise<RunOutcome<R>>;
  renderResult: (data: R, outcome: RunOutcome<R>) => ReactNode;
  /** Optional extra live visualisation while running. */
  liveView?: ReactNode;
  /** Optional extra actions in the result footer. */
  resultActions?: (data: R, backToForm: () => void) => ReactNode;
}

type Phase = "form" | "running" | "result";

interface LogLine {
  id: number;
  label: string;
  done: boolean;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export function ToolRunner<R>({
  tool,
  onRunComplete,
  children,
  canRun,
  runLabel,
  runIcon,
  formActions,
  footerNote,
  confirm,
  run,
  renderResult,
  liveView,
  resultActions,
}: Props<R>) {
  const [phase, setPhase] = useState<Phase>("form");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [log, setLog] = useState<LogLine[]>([]);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ outcome: RunOutcome<R>; durationMs: number } | null>(null);
  const startedAt = useRef(0);
  const logId = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Keep the runner in view when the content height changes between phases.
  useEffect(() => {
    if (phase === "form") return;
    const el = rootRef.current;
    if (el && el.getBoundingClientRect().top < 72) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => setElapsed(performance.now() - startedAt.current), 100);
    return () => clearInterval(t);
  }, [phase]);

  const needsConfirm = !!confirm;
  const steps = tool.risk !== "lav" ? ["Skjema", "Bekreft", "Kjører", "Resultat"] : ["Skjema", "Kjører", "Resultat"];
  const activeStep =
    phase === "form" ? (confirmOpen ? 1 : 0) : phase === "running" ? steps.indexOf("Kjører") : steps.indexOf("Resultat");

  const execute = async () => {
    setConfirmOpen(false);
    setTyped("");
    setLog([]);
    setProgress(0);
    setElapsed(0);
    setResult(null);
    setPhase("running");
    startedAt.current = performance.now();
    const ctx: RunContext = {
      step: (label) => {
        logId.current += 1;
        const id = logId.current;
        setLog((prev) => [...prev.map((l) => ({ ...l, done: true })), { id, label, done: false }]);
      },
      progress: (f) => setProgress(Math.max(0, Math.min(1, f))),
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    };
    const outcome = await run(ctx);
    setLog((prev) => prev.map((l) => ({ ...l, done: true })));
    setProgress(1);
    await ctx.sleep(380);
    const durationMs = performance.now() - startedAt.current;
    setResult({ outcome, durationMs });
    setPhase("result");
    onRunComplete({
      toolId: tool.id,
      status: outcome.status,
      params: outcome.params,
      summary: outcome.summary ?? outcome.headline,
      durationMs,
    });
  };

  const onRunClick = () => {
    if (needsConfirm) setConfirmOpen(true);
    else void execute();
  };

  const backToForm = () => {
    setPhase("form");
    setResult(null);
  };

  const confirmReady = !confirm?.typeToConfirm || typed.trim().toUpperCase() === confirm.typeToConfirm;

  return (
    <div ref={rootRef} className={styles.runner}>
      <RunnerStepper steps={steps} active={activeStep} done={phase === "result"} color={tool.color} />

      <AnimatePresence mode="wait" initial={false}>
        {phase === "form" ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <div className={styles.runnerBody}>{children}</div>
            <div className={styles.runnerFooter}>
              <div className={styles.runnerFooterLeft}>{formActions}</div>
              <div className={styles.runnerFooterRight}>
                {footerNote ? <span className={styles.footerNote}>{footerNote}</span> : null}
                <Button
                  onClick={onRunClick}
                  disabled={!canRun}
                  icon={runIcon ?? <PlayFillIcon aria-hidden />}
                  data-color={tool.risk === "høy" ? "danger" : undefined}
                >
                  {runLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}

        {phase === "running" ? (
          <motion.div
            key="running"
            className={styles.runnerBody}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <div className={styles.runningHead}>
              <motion.span
                className={styles.runningOrb}
                animate={{ scale: [1, 1.05, 1], opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <tool.icon aria-hidden />
              </motion.span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.runningTitle}>Kjører {tool.name.toLowerCase()} …</div>
                <BodyShort size="small" className="muted">
                  {Math.round(progress * 100)} % · {fmtDec(elapsed / 1000)} s
                </BodyShort>
              </div>
              <span className={styles.runningPct}>{Math.round(progress * 100)}%</span>
            </div>
            <ProgressBar value={progress * 100} valueMax={100} size="small" aria-label="Fremdrift" />
            <ul className={styles.runLog}>
              <AnimatePresence initial={false}>
                {log.slice(-6).map((l) => (
                  <motion.li
                    key={l.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className={l.done ? styles.runLogDone : undefined}
                  >
                    {l.done ? <CheckmarkIcon aria-hidden className={styles.runLogCheck} /> : <Loader size="xsmall" title="Jobber" />}
                    <span>{l.label}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            {liveView}
          </motion.div>
        ) : null}

        {phase === "result" && result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <div className={styles.runnerBody}>
              <ResultBanner status={result.outcome.status} headline={result.outcome.headline} durationMs={result.durationMs} />
              <div style={{ marginTop: 18 }}>{renderResult(result.outcome.data, result.outcome)}</div>
            </div>
            <div className={styles.runnerFooter}>
              <div className={styles.runnerFooterLeft}>{resultActions?.(result.outcome.data, backToForm)}</div>
              <div className={styles.runnerFooterRight}>
                <Button variant="secondary" icon={<ArrowUndoIcon aria-hidden />} onClick={backToForm}>
                  Tilbake til skjema
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {confirm ? (
        <Modal
          open={confirmOpen}
          onClose={() => {
            setConfirmOpen(false);
            setTyped("");
          }}
          header={{
            heading: confirm.heading,
            icon: <ExclamationmarkTriangleFillIcon aria-hidden color={tool.risk === "høy" ? "#c4505c" : "#c98a2b"} />,
          }}
          width={540}
          closeOnBackdropClick
        >
          <Modal.Body>
            <div className={styles.confirmBody}>
              <Tag size="small" variant="moderate" data-color={RISK_META[tool.risk].color}>
                {RISK_META[tool.risk].label}
              </Tag>
              <div>{confirm.body}</div>
              {confirm.typeToConfirm ? (
                <TextField
                  label={
                    <>
                      Skriv <span className="mono">{confirm.typeToConfirm}</span> for å bekrefte
                    </>
                  }
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  className={styles.typeConfirm}
                />
              ) : null}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => void execute()}
              disabled={!confirmReady}
              data-color={tool.risk === "høy" ? "danger" : undefined}
              icon={<PlayFillIcon aria-hidden />}
            >
              {confirm.confirmLabel}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmOpen(false);
                setTyped("");
              }}
            >
              Avbryt
            </Button>
          </Modal.Footer>
        </Modal>
      ) : null}
    </div>
  );
}

function RunnerStepper({ steps, active, done, color }: { steps: string[]; active: number; done: boolean; color: string }) {
  return (
    <ol className={styles.stepper}>
      {steps.map((s, i) => {
        const state = i < active || (done && i === active) ? "done" : i === active ? "active" : "todo";
        return (
          <li key={s} className={styles.stepperItem} data-state={state}>
            <span className={styles.stepperDot} style={state !== "todo" ? { background: color, borderColor: color } : undefined}>
              {state === "done" ? <CheckmarkIcon aria-hidden /> : i + 1}
            </span>
            <span className={styles.stepperLabel}>{s}</span>
            {i < steps.length - 1 ? (
              <span className={styles.stepperLine}>
                <motion.span
                  className={styles.stepperLineFill}
                  style={{ background: color }}
                  initial={false}
                  animate={{ scaleX: i < active || done ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                />
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

const STATUS_ICON: Record<RunStatus, typeof CheckmarkCircleFillIcon> = {
  SUCCESS: CheckmarkCircleFillIcon,
  PARTIAL_SUCCESS: ExclamationmarkTriangleFillIcon,
  FAILURE: XMarkOctagonFillIcon,
  DRY_RUN: MagnifyingGlassCheckmarkIcon,
};

function ResultBanner({ status, headline, durationMs }: { status: RunStatus; headline: string; durationMs: number }) {
  const Icon = STATUS_ICON[status];
  return (
    <div className={styles.resultBanner} data-status={status}>
      <motion.span
        className={styles.resultIcon}
        initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
      >
        <Icon aria-hidden />
      </motion.span>
      <div style={{ minWidth: 0 }}>
        <div className={styles.resultStatus}>{STATUS_META[status].label.toUpperCase()}</div>
        <BodyLong className={styles.resultHeadline}>{headline}</BodyLong>
      </div>
      <span className={styles.resultDuration}>{fmtDec(durationMs / 1000)} s</span>
    </div>
  );
}

/** Small reusable header shown above every tool form. */
export function ToolHeader({ tool, onClose }: { tool: ToolDefinition; onClose?: () => void }) {
  return (
    <div className={styles.toolHeader}>
      <motion.span
        className={styles.toolHeaderIcon}
        initial={{ rotate: -8, scale: 0.85, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
      >
        <tool.icon aria-hidden />
      </motion.span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={styles.toolHeaderMeta}>
          <span className="chip">{tool.category}</span>
          <Tag size="xsmall" variant="moderate" data-color={RISK_META[tool.risk].color}>
            {RISK_META[tool.risk].label}
          </Tag>
        </div>
        <h2 className={styles.toolHeaderTitle}>{tool.name}</h2>
        <BodyShort className="muted">{tool.details}</BodyShort>
      </div>
      {onClose ? (
        <Button variant="tertiary" size="small" onClick={onClose}>
          Lukk
        </Button>
      ) : null}
    </div>
  );
}

"use client";

import { FileCheckmarkIcon } from "@navikt/aksel-icons";
import { BodyShort, Checkbox, Select, TextField } from "@navikt/ds-react";
import { motion } from "motion/react";
import { useState } from "react";
import { createRng, hashSeed, int } from "@/lib/mock/random";
import { ENHETER, ENHET_BY_ID } from "@/lib/mock/reference";
import { ToolRunner, type RunContext, type RunOutcome } from "../ToolRunner";
import type { ToolComponentProps } from "../types";
import styles from "../verktoy.module.css";

interface JournalResult {
  journalpostId: string;
  oppgaveId: string | null;
  enhet: string;
  tema: string;
  sedType: string;
}

const TEMA: Record<string, string> = {
  "4530": "MED",
  "0393": "PEN",
  "4862": "BAR",
  "4817": "KON",
  "4402": "DAG",
  "4475": "DAG",
  "4489": "SYK",
  "4488": "YRK",
  "4303": "GEN",
};

export function JournalforSed({ tool, onRunComplete }: ToolComponentProps) {
  const [rinasakId, setRinasakId] = useState("");
  const [sedId, setSedId] = useState("");
  const [enhet, setEnhet] = useState("4530");
  const [oppgave, setOppgave] = useState(true);

  const rErr = rinasakId && !/^\d{6,8}$/.test(rinasakId.trim()) ? "Må være 6–8 siffer" : undefined;
  const sErr = sedId && !/^[0-9a-f]{32}$/i.test(sedId.trim()) ? `SED-id må være 32 heksadesimale tegn (${sedId.trim().length}/32)` : undefined;
  const canRun = !!rinasakId.trim() && !!sedId.trim() && !rErr && !sErr;

  const run = async (ctx: RunContext): Promise<RunOutcome<JournalResult>> => {
    const rng = createRng(hashSeed(`${rinasakId}${sedId}${enhet}`));
    const sedType = ["H001", "A003", "P2000", "F001", "U002", "S080"][int(rng, 0, 5)];
    const steps = [
      "Henter SED og vedlegg fra RINA",
      `Konverterer ${sedType} til PDF`,
      "Slår opp bruker i PDL",
      `Oppretter journalpost i Dokarkiv (enhet ${enhet})`,
      ...(oppgave ? ["Oppretter oppgave i Gosys"] : []),
    ];
    for (let i = 0; i < steps.length; i++) {
      ctx.step(steps[i]);
      ctx.progress((i + 0.4) / steps.length);
      await ctx.sleep(420 + int(rng, 0, 300));
    }
    const journalpostId = String(int(rng, 670_000_000, 679_999_999));
    const failed = rng() < 0.12;
    if (failed) {
      return {
        status: "FAILURE",
        headline: "Dokarkiv svarte 409 Conflict – SED-en er allerede journalført",
        summary: "409 Conflict fra Dokarkiv",
        params: `rinasakId=${rinasakId.trim()} · enhet=${enhet}`,
        data: { journalpostId: "—", oppgaveId: null, enhet, tema: TEMA[enhet] ?? "GEN", sedType },
      };
    }
    return {
      status: "SUCCESS",
      headline: `${sedType} journalført på nytt som journalpost ${journalpostId}`,
      summary: `Journalpost ${journalpostId} opprettet`,
      params: `rinasakId=${rinasakId.trim()} · enhet=${enhet}`,
      data: {
        journalpostId,
        oppgaveId: oppgave ? String(int(rng, 410_000_000, 419_999_999)) : null,
        enhet,
        tema: TEMA[enhet] ?? "GEN",
        sedType,
      },
    };
  };

  return (
    <ToolRunner<JournalResult>
      tool={tool}
      onRunComplete={onRunComplete}
      canRun={canRun}
      runLabel="Journalfør på nytt"
      runIcon={<FileCheckmarkIcon aria-hidden />}
      formActions={
        <button
          type="button"
          className={styles.quickPick}
          onClick={() => {
            setRinasakId("1452389");
            setSedId("8f3c2a91b7e64d0c9a1f2b3c4d5e6f70");
          }}
        >
          Bruk eksempel
        </button>
      }
      confirm={{
        heading: "Journalføre på nytt?",
        confirmLabel: "Journalfør",
        body: (
          <BodyShort>
            SED <span className="mono">{sedId.slice(0, 8)}…</span> i sak <span className="mono">{rinasakId}</span> journalføres på{" "}
            <strong>{ENHET_BY_ID[enhet]?.name}</strong>
            {oppgave ? " og det opprettes en ny oppgave." : "."} Eventuell eksisterende journalpost blir ikke feilregistrert automatisk.
          </BodyShort>
        ),
      }}
      run={run}
      renderResult={(d) => (
        <div className={styles.factGrid}>
          {[
            { label: "Journalpost", value: d.journalpostId },
            { label: "SED", value: d.sedType },
            { label: "Tema", value: d.tema },
            { label: "Enhet", value: `${d.enhet} · ${ENHET_BY_ID[d.enhet]?.shortName ?? ""}` },
            { label: "Oppgave", value: d.oppgaveId ?? "Ikke opprettet" },
          ].map((f, i) => (
            <motion.div
              key={f.label}
              className={styles.fact}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
            >
              <span className={styles.factLabel}>{f.label}</span>
              <span className={styles.factValue}>{f.value}</span>
            </motion.div>
          ))}
        </div>
      )}
    >
      <div className={styles.formGrid}>
        <TextField label="rinasakId" value={rinasakId} onChange={(e) => setRinasakId(e.target.value)} error={rErr} className={styles.monoInput} />
        <TextField
          label="SED-id (documentId)"
          value={sedId}
          onChange={(e) => setSedId(e.target.value)}
          error={sErr}
          className={styles.monoInput}
        />
        <Select label="Journalførende enhet" value={enhet} onChange={(e) => setEnhet(e.target.value)}>
          {ENHETER.map((e) => (
            <option key={e.id} value={e.id}>
              {e.id} – {e.name}
            </option>
          ))}
        </Select>
        <div style={{ alignSelf: "end", paddingBottom: 6 }}>
          <Checkbox checked={oppgave} onChange={(e) => setOppgave(e.target.checked)} description="Gosys-oppgave til valgt enhet">
            Opprett oppgave
          </Checkbox>
        </div>
      </div>
    </ToolRunner>
  );
}

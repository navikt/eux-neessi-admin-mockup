"use client";

import { ArrowRightIcon, MegaphoneIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Checkbox, CopyButton, Modal, ProgressBar, Tag } from "@navikt/ds-react";
import { motion } from "motion/react";
import NextLink from "next/link";
import { useState } from "react";
import { fmtInt } from "@/lib/format";
import type { DbInstance, UpgradeRecommendation } from "./data";
import styles from "./databaser.module.css";
import { fmtGb, HEALTH_META, PRIORITY_META } from "./ui";

interface Props {
  rec: UpgradeRecommendation | null;
  instances: DbInstance[];
  onClose: () => void;
  onDone: (app: string) => void;
}

const CHECKLIST = [
  "Bekreft at siste automatiske backup er vellykket og at PITR er aktivert",
  "Ta en manuell on-demand backup rett før oppgraderingen",
  "Kjør regresjonstester mot q1/q2 etter oppgradering i dev",
  "Sjekk at Flyway-migreringer og utvidelser (pg_trgm, uuid-ossp) støttes i PG17",
  "Varsle saksbehandlere med en driftsmelding i nEESSI",
  "Kjør ANALYZE på alle tabeller etter oppgraderingen",
  "Følg med på feilrate og responstid i Grafana i 24 timer",
];

function yamlDiff(inst: DbInstance, target: number): { text: string; kind?: "add" | "del" | "key" | "comment" }[] {
  const file = inst.env === "prod-gcp" ? ".nais/nais-prod.yaml" : `.nais/nais-${inst.variant === "dev" ? "dev" : inst.variant}.yaml`;
  return [
    { text: `# ${file}`, kind: "comment" },
    { text: "spec:", kind: "key" },
    { text: "  gcp:", kind: "key" },
    { text: "    sqlInstances:", kind: "key" },
    { text: `-     - type: ${inst.typeLabel}`, kind: "del" },
    { text: `+     - type: POSTGRES_${target}`, kind: "add" },
    { text: `        tier: ${inst.tier}` },
    { text: `        highAvailability: ${inst.highAvailability}` },
    ...(inst.diskAutoresize
      ? [{ text: "        diskAutoresize: true" }]
      : [
          { text: "-       diskAutoresize: false", kind: "del" as const },
          { text: "+       diskAutoresize: true", kind: "add" as const },
        ]),
    ...(inst.pointInTimeRecovery
      ? [{ text: "        pointInTimeRecovery: true" }]
      : [{ text: "+       pointInTimeRecovery: true", kind: "add" as const }]),
    { text: "        databases:" },
    { text: `          - name: ${inst.app.replace(/^eux-/, "").replaceAll("-", "_")}` },
  ];
}

export function YamlBlock({ lines }: { lines: { text: string; kind?: "add" | "del" | "key" | "comment" }[] }) {
  return (
    <pre className={styles.code}>
      {lines.map((l, i) => (
        <span
          key={i}
          className={`${styles.codeLine} ${
            l.kind === "add" ? styles.codeAdd : l.kind === "del" ? styles.codeDel : l.kind === "key" ? styles.codeKey : l.kind === "comment" ? styles.codeComment : ""
          }`}
        >
          {l.text}
        </span>
      ))}
    </pre>
  );
}

export function UpgradePlanModal({ rec, instances, onClose, onDone }: Props) {
  const [checked, setChecked] = useState<string[]>([]);
  if (!rec) return null;
  const list = rec.instanceIds.map((id) => instances.find((i) => i.id === id)!).filter(Boolean);
  const dev = list.filter((i) => i.env === "dev-gcp");
  const prod = list.filter((i) => i.env === "prod-gcp");
  const prio = PRIORITY_META[rec.priority];
  const plainPlan = [
    `Oppgraderingsplan ${rec.app}: PG${rec.fromVersions.join("/PG")} → PG${rec.target}`,
    ...list.map((i) => `- ${i.env}/${i.name}: ${i.typeLabel} → POSTGRES_${rec.target}`),
    `Estimert nedetid: ca. ${rec.estDowntimeMin} min per instans`,
  ].join("\n");

  const steps = [
    {
      title: "Forbered og sikre data",
      text: "Verifiser backup og PITR. Les release notes for PostgreSQL 17 og sjekk utvidelser.",
    },
    ...(dev.length
      ? [
          {
            title: `Oppgrader dev-gcp (${dev.map((d) => d.variant).join(", ")})`,
            text: "Endre type i nais-manifestet og deploy. Nais/Cloud SQL utfører en in-place hovedversjonsoppgradering.",
            yaml: yamlDiff(dev[0], rec.target),
          },
        ]
      : []),
    ...(prod.length
      ? [
          {
            title: "Oppgrader prod-gcp i vedlikeholdsvindu",
            text: "Anbefalt vindu: tirsdag kl. 06:00–07:00. Publiser driftsmelding i nEESSI dagen før.",
            yaml: yamlDiff(prod[0], rec.target),
          },
        ]
      : []),
    {
      title: "Verifiser etterpå",
      text: "Kjør ANALYZE, sjekk Flyway-status og følg med på tilkoblinger og spørretider.",
    },
  ];

  const maintMsg = new URLSearchParams({
    tittel: `Planlagt vedlikehold av ${rec.app.replace(/^eux-/, "")}`,
    melding: `Databasen til ${rec.app} oppgraderes til PostgreSQL ${rec.target}. Tjenesten kan være utilgjengelig i ca. ${rec.estDowntimeMin} minutter.`,
    alvorlighet: "advarsel",
  });

  return (
    <Modal
      open
      onClose={() => {
        setChecked([]);
        onClose();
      }}
      width={780}
      header={{ heading: `Oppgraderingsplan · ${rec.app}`, label: `${prio.label} prioritet`, closeButton: true }}
      closeOnBackdropClick
    >
      <Modal.Body>
        <div className={styles.versionJump} style={{ marginBottom: 16 }}>
          {rec.fromVersions.map((v) => (
            <span key={v} className={styles.vchip} style={{ ["--c" as string]: HEALTH_META[list.find((i) => i.version === v)?.health ?? "ok"].color }}>
              POSTGRES_{v}
            </span>
          ))}
          <ArrowRightIcon aria-hidden />
          <span className={styles.vchip} style={{ ["--c" as string]: "#3a8a5f" }}>
            POSTGRES_{rec.target}
          </span>
          <span className="muted" style={{ fontWeight: 500 }}>
            {rec.reason}
          </span>
        </div>

        <div className={styles.planSummary}>
          {[
            ["Instanser", `${list.length}`],
            ["Data som oppgraderes", fmtGb(rec.totalGb)],
            ["Estimert nedetid", `≈ ${fmtInt(rec.estDowntimeMin)} min`],
          ].map(([l, v], i) => (
            <motion.div
              key={l}
              className={styles.planStat}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.07 }}
            >
              <div>{l}</div>
              <div>{v}</div>
            </motion.div>
          ))}
        </div>

        <ol className={styles.steps}>
          {steps.map((s, i) => (
            <motion.li
              key={s.title}
              className={styles.step}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.08, ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
            >
              <span className={styles.stepNum}>{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <div className={styles.stepTitle}>{s.title}</div>
                <p className={styles.stepText}>{s.text}</p>
                {"yaml" in s && s.yaml ? <YamlBlock lines={s.yaml} /> : null}
              </div>
            </motion.li>
          ))}
        </ol>

        <div className={styles.checklist}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <strong>Sjekkliste</strong>
            <Tag size="xsmall" variant="moderate" data-color={checked.length === CHECKLIST.length ? "success" : "neutral"}>
              {checked.length} av {CHECKLIST.length}
            </Tag>
          </div>
          <ProgressBar value={checked.length} valueMax={CHECKLIST.length} size="small" aria-label="Fremdrift sjekkliste" />
          <div style={{ marginTop: 8 }}>
            {CHECKLIST.map((c) => (
              <Checkbox
                key={c}
                size="small"
                checked={checked.includes(c)}
                onChange={(e) => setChecked((prev) => (e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)))}
              >
                {c}
              </Checkbox>
            ))}
          </div>
        </div>
        <BodyShort size="small" className="muted" style={{ marginTop: 12 }}>
          Nedetiden er estimert ut fra datamengde ({fmtGb(rec.totalGb)}) og erfaring fra tidligere in-place-oppgraderinger i Cloud SQL.
        </BodyShort>
      </Modal.Body>
      <Modal.Footer>
        <Button
          onClick={() => {
            onDone(rec.app);
            setChecked([]);
          }}
        >
          Opprett oppgave i Jira
        </Button>
        <Button as={NextLink} href={`/driftsmeldinger?${maintMsg.toString()}`} variant="secondary" icon={<MegaphoneIcon aria-hidden />}>
          Lag driftsmelding
        </Button>
        <CopyButton copyText={plainPlan} text="Kopier plan" activeText="Kopiert!" variant="action" />
      </Modal.Footer>
    </Modal>
  );
}

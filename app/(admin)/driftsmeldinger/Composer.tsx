"use client";

import { ArrowUndoIcon, MegaphoneSpeakingIcon, PaperplaneIcon, SparklesIcon } from "@navikt/aksel-icons";
import {
  BodyShort,
  Button,
  Chips,
  DatePicker,
  HStack,
  InlineMessage,
  Modal,
  Switch,
  TextField,
  Textarea,
  ToggleGroup,
  useDatepicker,
} from "@navikt/ds-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { fmtInt } from "@/lib/format";
import { ENHETER, ENHET_BY_ID } from "@/lib/mock/reference";
import { Banner, BannerPreview, SEVERITY_ICON } from "./BannerPreview";
import styles from "./driftsmeldinger.module.css";
import {
  dateOf,
  fmtDuration,
  fmtPeriod,
  fmtRelative,
  minutesBetween,
  isoToLocalDate,
  localDateToIso,
  SEVERITY_META,
  type Driftsmelding,
  type Prefill,
  type Severity,
} from "./model";

export interface Draft {
  title: string;
  body: string;
  severity: Severity;
  audienceMode: "alle" | "utvalgte";
  enheter: string[];
  startMode: "na" | "planlagt";
  startDate: string;
  startTime: string;
  hasEnd: boolean;
  endDate: string;
  endTime: string;
  dismissible: boolean;
}

export function emptyDraft(now: string, prefill: Prefill | null): Draft {
  const today = dateOf(now);
  const [y, m, d] = today.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return {
    title: prefill?.title ?? "",
    body: prefill?.body ?? "",
    severity: prefill?.severity ?? "info",
    audienceMode: "alle",
    enheter: [],
    startMode: prefill ? "planlagt" : "na",
    startDate: tomorrow,
    startTime: "08:00",
    hasEnd: true,
    endDate: tomorrow,
    endTime: prefill ? "12:00" : "16:00",
    dismissible: true,
  };
}

export function draftFromMessage(msg: Driftsmelding, now: string): Draft {
  const base = emptyDraft(now, null);
  return {
    ...base,
    title: msg.title,
    body: msg.body,
    severity: msg.severity,
    audienceMode: msg.audience === "alle" ? "alle" : "utvalgte",
    enheter: msg.audience === "alle" ? [] : [...msg.audience],
    dismissible: msg.dismissible,
    hasEnd: msg.end !== null,
  };
}

const TEMPLATES: { label: string; draft: Pick<Draft, "title" | "body" | "severity" | "dismissible"> }[] = [
  {
    label: "RINA-vedlikehold",
    draft: {
      title: "RINA er nede for planlagt vedlikehold",
      body: "I tidsrommet kan du ikke åpne, opprette eller sende saker i nEESSI. Lagre arbeidet ditt før vedlikeholdet starter.",
      severity: "advarsel",
      dismissible: true,
    },
  },
  {
    label: "Treghet",
    draft: {
      title: "Treg innlasting av saker",
      body: "Vi opplever treg innlasting i nEESSI og jobber med å finne årsaken. Du kan jobbe som normalt, men må regne med ventetid.",
      severity: "advarsel",
      dismissible: true,
    },
  },
  {
    label: "Utfall",
    draft: {
      title: "nEESSI er utilgjengelig",
      body: "Vi har driftsproblemer og jobber med å rette feilen. Meldingen oppdateres når vi vet mer.",
      severity: "feil",
      dismissible: false,
    },
  },
  {
    label: "Nyhet",
    draft: {
      title: "Ny versjon av nEESSI",
      body: "Vi har lansert forbedringer i saksvisningen. Se «Hva er nytt» i menyen for detaljer.",
      severity: "info",
      dismissible: true,
    },
  },
];

interface Props {
  now: string;
  initial: Draft;
  prefilled: boolean;
  nextId: string;
  activeUsersByEnhet: Record<string, number>;
  totalActiveUsers: number;
  userName: string;
  onPublish: (msg: Driftsmelding) => void;
}

export function Composer({ now, initial, prefilled, nextId, activeUsersByEnhet, totalActiveUsers, userName, onPublish }: Props) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [attempted, setAttempted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const fromDate = isoToLocalDate(dateOf(now));
  const startPicker = useDatepicker({
    defaultSelected: isoToLocalDate(initial.startDate),
    fromDate,
    onDateChange: (d) => set("startDate", d ? localDateToIso(d) : ""),
  });
  const endPicker = useDatepicker({
    defaultSelected: isoToLocalDate(initial.endDate),
    fromDate,
    onDateChange: (d) => set("endDate", d ? localDateToIso(d) : ""),
  });

  const start = draft.startMode === "na" ? now : `${draft.startDate}T${draft.startTime}`;
  const end = draft.hasEnd ? `${draft.endDate}T${draft.endTime}` : null;
  const audience: "alle" | string[] = draft.audienceMode === "alle" ? "alle" : draft.enheter;
  const reach =
    audience === "alle" ? totalActiveUsers : audience.reduce((s, id) => s + (activeUsersByEnhet[id] ?? 0), 0);

  const errors: Partial<Record<"title" | "body" | "enheter" | "start" | "end", string>> = {};
  if (!draft.title.trim()) errors.title = "Skriv en kort tittel.";
  else if (draft.title.length > 90) errors.title = "Tittelen kan ikke være lengre enn 90 tegn.";
  if (!draft.body.trim()) errors.body = "Skriv selve meldingen.";
  else if (draft.body.length > 400) errors.body = "Meldingen er for lang.";
  if (draft.audienceMode === "utvalgte" && draft.enheter.length === 0) errors.enheter = "Velg minst én enhet.";
  if (draft.startMode === "planlagt" && (!draft.startDate || start <= now)) errors.start = "Starttid må være frem i tid.";
  if (end && (!draft.endDate || end <= start)) errors.end = "Sluttid må være etter start.";
  const valid = Object.keys(errors).length === 0;
  const err = (k: keyof typeof errors) => (attempted ? errors[k] : undefined);

  const period = fmtPeriod(start, end);
  const Icon = SEVERITY_ICON[draft.severity];
  const meta = SEVERITY_META[draft.severity];

  const reset = (next: Draft) => {
    setDraft(next);
    setAttempted(false);
    startPicker.setSelected(isoToLocalDate(next.startDate));
    endPicker.setSelected(isoToLocalDate(next.endDate));
  };

  const publish = () => {
    const msg: Driftsmelding = {
      id: nextId,
      title: draft.title.trim(),
      body: draft.body.trim(),
      severity: draft.severity,
      audience,
      start,
      end,
      dismissible: draft.dismissible,
      createdBy: userName,
      createdAt: now,
      deactivatedAt: null,
      stats: {
        target: reach,
        seen: 0,
        closed: 0,
        medianMinutesToSeen: null,
        curve: Array.from({ length: 12 }, () => 0),
        byEnhet: (audience === "alle" ? ENHETER.map((e) => e.id) : audience).map((id) => ({
          enhetId: id,
          target: activeUsersByEnhet[id] ?? 0,
          seen: 0,
        })),
      },
    };
    setConfirmOpen(false);
    onPublish(msg);
    reset(emptyDraft(now, null));
  };

  return (
    <div className={styles.composer}>
      <motion.div
        className={`card ${styles.formCard}`}
        style={{ ["--sev" as string]: meta.color }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.formHead}>
          <motion.span key={draft.severity} className={styles.formHeadIcon} initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
            <Icon aria-hidden />
          </motion.span>
          <div>
            <h3 className="card__title">Ny driftsmelding</h3>
            <p className="card__subtitle">Vises som banner øverst i nEESSI for valgt målgruppe.</p>
          </div>
        </div>

        <AnimatePresence>
          {prefilled ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <InlineMessage status="info" size="small" className={styles.prefillNote}>
                Utfylt fra oppgraderingsplanen på Databaser. Se over tekst og tidspunkt før du publiserer.
              </InlineMessage>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className={styles.templates}>
          <span className={styles.fieldLabel}>
            <SparklesIcon aria-hidden /> Start fra mal
          </span>
          <HStack gap="space-8" wrap>
            {TEMPLATES.map((t) => (
              <Button
                key={t.label}
                size="xsmall"
                variant="secondary"
                className={styles.tplBtn}
                style={{ ["--sev" as string]: SEVERITY_META[t.draft.severity].color }}
                icon={<span className={styles.tplDot} aria-hidden />}
                onClick={() => setDraft((d) => ({ ...d, ...t.draft }))}
              >
                {t.label}
              </Button>
            ))}
          </HStack>
        </div>

        <div className={styles.fields}>
          <TextField
            label="Tittel"
            description="Kort og konkret. Vises i fet skrift."
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            error={err("title")}
          />
          <Textarea
            label="Melding"
            description="Hva skjer, hvem berøres, og hva bør brukeren gjøre?"
            value={draft.body}
            onChange={(e) => set("body", e.target.value)}
            maxLength={400}
            minRows={3}
            error={err("body")}
          />

          <div>
            <span className={styles.fieldLabel}>Alvorlighetsgrad</span>
            <ToggleGroup value={draft.severity} onChange={(v) => set("severity", v as Severity)} fill variant="neutral">
              {(Object.keys(SEVERITY_META) as Severity[]).map((s) => {
                const SIcon = SEVERITY_ICON[s];
                return (
                  <ToggleGroup.Item
                    key={s}
                    value={s}
                    icon={<SIcon aria-hidden style={{ color: SEVERITY_META[s].color }} />}
                    label={SEVERITY_META[s].label}
                  />
                );
              })}
            </ToggleGroup>
          </div>

          <div>
            <span className={styles.fieldLabel}>Målgruppe</span>
            <ToggleGroup
              value={draft.audienceMode}
              onChange={(v) => set("audienceMode", v as Draft["audienceMode"])}
              fill
              variant="neutral"
            >
              <ToggleGroup.Item value="alle" label="Alle brukere" />
              <ToggleGroup.Item value="utvalgte" label="Utvalgte enheter" />
            </ToggleGroup>
            <AnimatePresence initial={false}>
              {draft.audienceMode === "utvalgte" ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: "hidden" }}
                >
                  <Chips className={styles.enhetChips} size="small">
                    {ENHETER.map((e) => (
                      <Chips.Toggle
                        key={e.id}
                        selected={draft.enheter.includes(e.id)}
                        checkmark
                        onClick={() =>
                          set(
                            "enheter",
                            draft.enheter.includes(e.id) ? draft.enheter.filter((x) => x !== e.id) : [...draft.enheter, e.id],
                          )
                        }
                      >
                        {`${e.id} ${e.shortName}`}
                      </Chips.Toggle>
                    ))}
                  </Chips>
                  {err("enheter") ? (
                    <InlineMessage status="error" size="small">
                      {err("enheter")}
                    </InlineMessage>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
            <div className={styles.reach}>
              Når ca. <strong className="tabular">
                <CountUp value={reach} duration={0.5} />
              </strong>{" "}
              aktive brukere
              <span className={styles.reachBar}>
                <motion.i animate={{ width: `${(reach / Math.max(totalActiveUsers, 1)) * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 26 }} />
              </span>
            </div>
          </div>

          <div className={styles.timeGrid}>
            <div>
              <span className={styles.fieldLabel}>Start</span>
              <ToggleGroup
                size="small"
                value={draft.startMode}
                onChange={(v) => set("startMode", v as Draft["startMode"])}
                variant="neutral"
              >
                <ToggleGroup.Item value="na" label="Med en gang" />
                <ToggleGroup.Item value="planlagt" label="Velg tidspunkt" />
              </ToggleGroup>
              <AnimatePresence initial={false}>
                {draft.startMode === "planlagt" ? (
                  <motion.div
                    className={styles.dateTime}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <DatePicker {...startPicker.datepickerProps}>
                      <DatePicker.Input {...startPicker.inputProps} label="Startdato" size="small" error={err("start")} />
                    </DatePicker>
                    <TextField
                      label="Kl."
                      type="time"
                      size="small"
                      value={draft.startTime}
                      onChange={(e) => set("startTime", e.target.value)}
                      className={styles.timeField}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            <div>
              <span className={styles.fieldLabel}>Slutt</span>
              <ToggleGroup
                size="small"
                value={draft.hasEnd ? "tid" : "manuell"}
                onChange={(v) => set("hasEnd", v === "tid")}
                variant="neutral"
              >
                <ToggleGroup.Item value="tid" label="Velg tidspunkt" />
                <ToggleGroup.Item value="manuell" label="Til deaktivert" />
              </ToggleGroup>
              <AnimatePresence initial={false}>
                {draft.hasEnd ? (
                  <motion.div
                    className={styles.dateTime}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <DatePicker {...endPicker.datepickerProps}>
                      <DatePicker.Input {...endPicker.inputProps} label="Sluttdato" size="small" error={err("end")} />
                    </DatePicker>
                    <TextField
                      label="Kl."
                      type="time"
                      size="small"
                      value={draft.endTime}
                      onChange={(e) => set("endTime", e.target.value)}
                      className={styles.timeField}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <div className={styles.switchRow}>
            <Switch checked={draft.dismissible} onChange={(e) => set("dismissible", e.target.checked)} description="Brukeren kan skjule banneret med et kryss. Det vises igjen hvis meldingen endres.">
              Kan lukkes av bruker
            </Switch>
          </div>
        </div>

        <div className={styles.formFoot}>
          <Button
            variant="tertiary"
            data-color="neutral"
            icon={<ArrowUndoIcon aria-hidden />}
            onClick={() => reset(emptyDraft(now, null))}
          >
            Nullstill
          </Button>
          <Button
            icon={draft.startMode === "na" ? <MegaphoneSpeakingIcon aria-hidden /> : <PaperplaneIcon aria-hidden />}
            onClick={() => {
              setAttempted(true);
              if (valid) setConfirmOpen(true);
            }}
          >
            {draft.startMode === "na" ? "Publiser" : "Planlegg"}
          </Button>
        </div>
      </motion.div>

      <div className={styles.previewCol}>
        <BannerPreview
          title={draft.title}
          body={draft.body}
          severity={draft.severity}
          dismissible={draft.dismissible}
          period={draft.startMode === "planlagt" ? `Gjelder ${fmtPeriod(start, end).replace(/^Fra /, "fra ")}` : undefined}
          userName={userName}
          enhetLabel={draft.audienceMode === "utvalgte" && draft.enheter[0] ? `${ENHET_BY_ID[draft.enheter[0]]?.id} ${ENHET_BY_ID[draft.enheter[0]]?.shortName}` : "4530 Medlemskap og avgift"}
        />
        <div className={styles.previewFacts}>
          <Fact label="Vises" value={draft.startMode === "na" ? "Med en gang" : fmtRelative(start, now)} />
          <Fact label="Varighet" value={end ? (end > start ? fmtDuration(minutesBetween(start, end)) : "–") : "Til deaktivert"} />
          <Fact label="Målgruppe" value={audience === "alle" ? "Alle enheter" : `${audience.length} enhet${audience.length === 1 ? "" : "er"}`} />
          <Fact label="Kan lukkes" value={draft.dismissible ? "Ja" : "Nei"} />
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        width={640}
        header={{
          heading: draft.startMode === "na" ? "Publisere driftsmeldingen?" : "Planlegge driftsmeldingen?",
          label: SEVERITY_META[draft.severity].label,
          closeButton: true,
        }}
        closeOnBackdropClick
      >
        <Modal.Body>
          <div className={styles.confirmBanner}>
            <Banner title={draft.title} body={draft.body} severity={draft.severity} dismissible={draft.dismissible} compact />
          </div>
          <dl className={styles.confirmList}>
            <dt>Periode</dt>
            <dd>{period}</dd>
            <dt>Målgruppe</dt>
            <dd>
              {audience === "alle"
                ? "Alle brukere i nEESSI"
                : audience.map((id) => `${id} ${ENHET_BY_ID[id]?.shortName ?? ""}`).join(", ")}
              <BodyShort size="small" className="muted">
                Ca. {fmtInt(reach)} aktive brukere
              </BodyShort>
            </dd>
            <dt>Kan lukkes</dt>
            <dd>{draft.dismissible ? "Ja, brukeren kan skjule banneret" : "Nei, banneret vises hele perioden"}</dd>
          </dl>
          {draft.severity === "feil" && !draft.dismissible && audience === "alle" ? (
            <InlineMessage status="warning" size="small">
              Alle brukere vil se en rød melding som ikke kan lukkes. Husk å deaktivere den når feilen er rettet.
            </InlineMessage>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={publish} icon={draft.startMode === "na" ? <MegaphoneSpeakingIcon aria-hidden /> : <PaperplaneIcon aria-hidden />}>
            {draft.startMode === "na" ? "Publiser nå" : "Planlegg melding"}
          </Button>
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Avbryt
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.fact}>
      <span>{label}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.strong
          key={value}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {value}
        </motion.strong>
      </AnimatePresence>
    </div>
  );
}

"use client";

import { LightBulbIcon, PaperplaneIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Modal, Radio, RadioGroup, Select, Textarea, TextField } from "@navikt/ds-react";
import { motion } from "motion/react";
import { useState } from "react";
import { CATEGORIES } from "./types";
import styles from "./verktoy.module.css";

export interface Suggestion {
  name: string;
  category: string;
  frequency: string;
}

export function SuggestToolCard({ suggestions, onOpen, compact }: { suggestions: Suggestion[]; onOpen: () => void; compact: boolean }) {
  return (
    <motion.button
      layout
      layoutId="tool-suggest"
      type="button"
      className={styles.suggestCard}
      data-compact={compact}
      onClick={onOpen}
      whileHover={compact ? { x: 3 } : { y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
    >
      <motion.span
        className={styles.suggestIcon}
        animate={{ rotate: [0, -8, 8, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2.5 }}
      >
        <LightBulbIcon aria-hidden />
      </motion.span>
      <span className={styles.suggestTitle}>Foreslå nytt verktøy</span>
      {!compact ? (
        <span className={styles.suggestText}>
          Gjør du noe manuelt i databasen eller med curl? Beskriv det, så lager vi et verktøy.
        </span>
      ) : null}
      {suggestions.length > 0 && !compact ? (
        <span className={styles.suggestCount}>
          {suggestions.length} {suggestions.length === 1 ? "forslag" : "forslag"} til vurdering · siste: «{suggestions[0].name}»
        </span>
      ) : null}
    </motion.button>
  );
}

export function SuggestToolModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (s: Suggestion) => void;
}) {
  const [name, setName] = useState("");
  const [what, setWhat] = useState("");
  const [category, setCategory] = useState("Kafka");
  const [frequency, setFrequency] = useState("Ukentlig");
  const [tried, setTried] = useState(false);

  const reset = () => {
    setName("");
    setWhat("");
    setTried(false);
  };

  const submit = () => {
    setTried(true);
    if (!name.trim() || what.trim().length < 10) return;
    onSubmit({ name: name.trim(), category, frequency });
    reset();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      header={{ heading: "Foreslå nytt verktøy", icon: <LightBulbIcon aria-hidden color="#f59e0b" /> }}
      width={560}
      closeOnBackdropClick
    >
      <Modal.Body>
        <div className={styles.stack}>
          <BodyShort className="muted">
            Forslaget havner i backloggen til Team EESSI. Jo mer konkret, jo raskere kan vi lage det.
          </BodyShort>
          <TextField
            label="Navn på verktøyet"
            placeholder="F.eks. «Flytt sak til annen enhet»"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={tried && !name.trim() ? "Gi verktøyet et navn" : undefined}
          />
          <Textarea
            label="Hva skal det gjøre?"
            description="Hva gjør du i dag, og hvor ofte går det galt?"
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            minRows={3}
            maxLength={500}
            error={tried && what.trim().length < 10 ? "Skriv litt mer (minst 10 tegn)" : undefined}
          />
          <div className={styles.formGrid}>
            <Select label="Kategori" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="Annet">Annet</option>
            </Select>
            <RadioGroup legend="Hvor ofte trengs det?" value={frequency} onChange={(v: string) => setFrequency(v)} size="small">
              {["Daglig", "Ukentlig", "Sjelden"].map((f) => (
                <Radio key={f} value={f}>
                  {f}
                </Radio>
              ))}
            </RadioGroup>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button icon={<PaperplaneIcon aria-hidden />} onClick={submit}>
          Send forslag
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            onClose();
            reset();
          }}
        >
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

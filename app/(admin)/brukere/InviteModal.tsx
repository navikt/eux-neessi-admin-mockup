"use client";

import { PaperplaneIcon, PersonPlusIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Checkbox, CheckboxGroup, Modal, Select, Tag, TextField } from "@navikt/ds-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import styles from "./brukere.module.css";
import { ROLE_LABELS } from "@/lib/mock/users";
import { avatarGradient, initials, ROLE_META, ROLE_ORDER, type EnhetOption, type UserRole } from "./types";

export interface InviteInput {
  name: string;
  ident: string;
  email: string;
  enhetId: string;
  roles: UserRole[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onInvite: (input: InviteInput) => void;
  enheter: EnhetOption[];
  existingIdents: Set<string>;
}

export function InviteModal({ open, onClose, onInvite, enheter, existingIdents }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      header={{ heading: "Inviter bruker til nEESSI", icon: <PersonPlusIcon aria-hidden />, label: "Brukeradministrasjon" }}
      width={640}
      closeOnBackdropClick
    >
      {open ? <InviteForm onClose={onClose} onInvite={onInvite} enheter={enheter} existingIdents={existingIdents} /> : <Modal.Body>{null}</Modal.Body>}
    </Modal>
  );
}

function slugEmail(name: string): string {
  const parts = name
    .toLowerCase()
    .replaceAll("ø", "o")
    .replaceAll("æ", "ae")
    .replaceAll("å", "a")
    .split(/\s+/)
    .map((p) => p.replace(/[^a-z-]/g, ""))
    .filter(Boolean);
  if (!parts.length) return "";
  return `${parts[0]}${parts.length > 1 ? `.${parts[parts.length - 1]}` : ""}@nav.no`;
}

function InviteForm({ onClose, onInvite, enheter, existingIdents }: Omit<Props, "open">) {
  const [name, setName] = useState("");
  const [ident, setIdent] = useState("");
  const [emailOverride, setEmailOverride] = useState<string | null>(null);
  const [enhetId, setEnhetId] = useState("");
  const [roles, setRoles] = useState<UserRole[]>(["SAKSBEHANDLER"]);
  const [submitted, setSubmitted] = useState(false);

  const email = emailOverride ?? slugEmail(name);
  const errors = {
    name: name.trim().split(/\s+/).length < 2 ? "Skriv inn fornavn og etternavn" : undefined,
    ident: !/^[A-Z]\d{6}$/.test(ident)
      ? "NAV-ident er én bokstav og seks siffer, f.eks. A123456"
      : existingIdents.has(ident)
        ? "Det finnes allerede en bruker med denne identen"
        : undefined,
    email: !/^[^@\s]+@nav\.no$/.test(email) ? "Må være en @nav.no-adresse" : undefined,
    enhetId: enhetId ? undefined : "Velg enhet",
    roles: roles.length ? undefined : "Velg minst én rolle",
  };
  const valid = Object.values(errors).every((e) => !e);
  const show = (e: string | undefined) => (submitted ? e : undefined);

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitted(true);
    if (!valid) return;
    onInvite({ name: name.trim(), ident, email, enhetId, roles });
  };

  const enhet = enheter.find((e) => e.id === enhetId);

  return (
    <>
      <Modal.Body>
        <form id="invite-form" onSubmit={submit} className={styles.inviteForm} noValidate>
          <motion.div className={styles.invitePreview} layout>
            <motion.div
              key={initials(name) || "?"}
              className="avatar"
              style={{ background: name ? avatarGradient(ident || name) : undefined, width: 52, height: 52, fontSize: "1.05rem" }}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
            >
              {initials(name) || "?"}
            </motion.div>
            <div style={{ minWidth: 0 }}>
              <div className={styles.previewName}>{name || "Ny bruker"}</div>
              <div className="muted" style={{ fontSize: "0.88rem" }}>
                {email || "fornavn.etternavn@nav.no"}
                {enhet ? ` · ${enhet.shortName}` : ""}
              </div>
              <div className={styles.tagRow}>
                <AnimatePresence initial={false}>
                  {roles.map((r) => (
                    <motion.span key={r} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}>
                      <span className={styles.rolePill} style={{ "--role": ROLE_META[r].hex } as React.CSSProperties}>
                        {ROLE_LABELS[r]}
                      </span>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </div>
            <Tag size="small" variant="outline" data-color="info" className={styles.previewStatus}>
              Invitert
            </Tag>
          </motion.div>

          <div className={styles.formGrid}>
            <TextField label="Navn" value={name} onChange={(e) => setName(e.target.value)} error={show(errors.name)} autoComplete="off" />
            <TextField
              label="NAV-ident"
              value={ident}
              onChange={(e) => setIdent(e.target.value.toUpperCase().slice(0, 7))}
              error={show(errors.ident)}
              className={styles.identField}
              placeholder="A123456"
              autoComplete="off"
            />
            <TextField
              label="E-post"
              description="Foreslås ut fra navnet"
              value={email}
              onChange={(e) => setEmailOverride(e.target.value)}
              error={show(errors.email)}
              autoComplete="off"
            />
            <Select label="Enhet" description="Hjemmeenhet for brukeren" value={enhetId} onChange={(e) => setEnhetId(e.target.value)} error={show(errors.enhetId)}>
              <option value="">Velg enhet</option>
              {enheter.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id} · {e.name}
                </option>
              ))}
            </Select>
          </div>

          <CheckboxGroup
            legend="Roller"
            description="Saksbehandler gir tilgang til å opprette saker og sende SED-er i nEESSI."
            value={roles}
            onChange={(v: UserRole[]) => setRoles(v)}
            error={show(errors.roles)}
          >
            <div className={styles.roleGrid}>
              {ROLE_ORDER.map((r) => (
                <Checkbox key={r} value={r} description={ROLE_META[r].description}>
                  {ROLE_LABELS[r]}
                </Checkbox>
              ))}
            </div>
          </CheckboxGroup>
          <BodyShort size="small" className="muted">
            Brukeren får en e-post med lenke til nEESSI og vises som «Invitert» til første innlogging.
          </BodyShort>
        </form>
      </Modal.Body>
      <Modal.Footer>
        <Button type="submit" form="invite-form" icon={<PaperplaneIcon aria-hidden />}>
          Send invitasjon
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Avbryt
        </Button>
      </Modal.Footer>
    </>
  );
}

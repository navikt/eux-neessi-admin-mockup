"use client";

import {
  ArrowCirclepathIcon,
  Buildings3Icon,
  ChatIcon,
  CheckmarkIcon,
  EnvelopeClosedIcon,
  FileCheckmarkIcon,
  FolderPlusIcon,
  KeyHorizontalIcon,
  PaperplaneIcon,
  BellIcon,
  ShieldLockIcon,
  WrenchIcon,
} from "@navikt/aksel-icons";
import { BodyShort, Button, Checkbox, CheckboxGroup, CopyButton, Dialog, Switch, Tag, ToggleGroup } from "@navikt/ds-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { Sparkline } from "@/components/ui/Sparkline";
import { fmtDate, fmtInt } from "@/lib/format";
import { ROLE_LABELS, STATUS_LABELS } from "@/lib/mock/users";
import { auditLog, dailyActivity, type AuditKind } from "./activity";
import styles from "./brukere.module.css";
import { avatarGradient, avatarHue, initials, ROLE_META, ROLE_ORDER, sinceText, STATUS_META, type AdminUser, type EnhetOption, type UserRole, type UserStatus } from "./types";

interface Props {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enheter: EnhetOption[];
  onSave: (user: AdminUser) => void;
  onRemind: (user: AdminUser) => void;
}

export function UserDetail({ user, open, onOpenChange, enheter, onSave, onRemind }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Popup position="right" width="600px" className={styles.drawer}>
        {user ? <DetailBody key={user.ident} user={user} enheter={enheter} onSave={onSave} onRemind={onRemind} onClose={() => onOpenChange(false)} /> : null}
      </Dialog.Popup>
    </Dialog>
  );
}

const AUDIT_ICON: Record<AuditKind, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  sed: PaperplaneIcon,
  buc: FolderPlusIcon,
  journal: FileCheckmarkIcon,
  text: ChatIcon,
  login: KeyHorizontalIcon,
  admin: WrenchIcon,
  invite: EnvelopeClosedIcon,
};

const AUDIT_COLOR: Record<AuditKind, string> = {
  sed: "#2a6cb3",
  buc: "#457c9d",
  journal: "#3a8a5f",
  text: "#7d6aa5",
  login: "#9aa1ab",
  admin: "#c0765d",
  invite: "#c98a2b",
};

function DetailBody({
  user,
  enheter,
  onSave,
  onRemind,
  onClose,
}: {
  user: AdminUser;
  enheter: EnhetOption[];
  onSave: (user: AdminUser) => void;
  onRemind: (user: AdminUser) => void;
  onClose: () => void;
}) {
  const [roles, setRoles] = useState<UserRole[]>(user.roles);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [extra, setExtra] = useState<string[]>(user.extraEnheter);

  const activity = useMemo(() => dailyActivity(user), [user]);
  const log = useMemo(() => auditLog(user), [user]);
  const home = enheter.find((e) => e.id === user.enhetId);
  const activeDays = activity.filter((d) => d > 0).length;

  const dirty =
    status !== user.status ||
    roles.slice().sort().join() !== user.roles.slice().sort().join() ||
    extra.slice().sort().join() !== user.extraEnheter.slice().sort().join();

  const toggleRole = (role: UserRole, on: boolean) =>
    setRoles((prev) => (on ? ROLE_ORDER.filter((r) => prev.includes(r) || r === role) : prev.filter((r) => r !== role)));

  const statusOptions: UserStatus[] = user.status === "INVITERT" ? ["INVITERT", "AKTIV", "SPERRET"] : ["AKTIV", "INAKTIV", "SPERRET"];

  return (
    <>
      <Dialog.Header className={styles.drawerHeader}>
        <div className={styles.drawerBanner} style={{ "--hue": avatarHue(user.ident) } as React.CSSProperties} />
        <div className={styles.drawerProfile}>
          <motion.div
            className="avatar"
            style={{ background: avatarGradient(user.ident), width: 72, height: 72, fontSize: "1.5rem" }}
            initial={{ scale: 0.85, opacity: 0, y: 6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.1 }}
          >
            {initials(user.name)}
          </motion.div>
          <div style={{ minWidth: 0 }}>
            <Dialog.Title className={styles.drawerTitle}>{user.name}</Dialog.Title>
            <div className={styles.drawerMeta}>
              <span className="mono">{user.ident}</span>
              <CopyButton size="xsmall" copyText={user.ident} />
              <span className="muted">·</span>
              <span className="muted">{user.email}</span>
            </div>
            <div className={styles.tagRow}>
              <Tag size="small" variant="moderate" data-color={STATUS_META[user.status].color}>
                <span className={`dot ${STATUS_META[user.status].dot}`} style={{ marginRight: 6, background: STATUS_META[user.status].hex }} />
                {STATUS_LABELS[user.status]}
              </Tag>
              <Tag size="small" variant="outline" data-color="neutral" icon={<Buildings3Icon aria-hidden />}>
                {user.enhetId} {home?.shortName}
              </Tag>
            </div>
          </div>
        </div>
      </Dialog.Header>

      <Dialog.Body className={styles.drawerBody}>
        <div className={styles.miniStats}>
          {[
            { label: "Sist aktiv", value: sinceText(user.lastActiveDaysAgo) },
            { label: "Økter 30 d", value: fmtInt(user.sessions30d) },
            { label: "SED-er 30 d", value: fmtInt(user.seds30d) },
            { label: "Bruker siden", value: fmtDate(user.createdIso) },
          ].map((s, i) => (
            <motion.div key={s.label} className={styles.miniStat} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.05 }}>
              <div className={styles.miniStatLabel}>{s.label}</div>
              <div className={styles.miniStatValue}>{s.value}</div>
            </motion.div>
          ))}
        </div>

        <section className={styles.panelSection}>
          <div className={styles.panelHead}>
            <h3>Aktivitet siste 30 dager</h3>
            <span className="muted">{activeDays} aktive dager</span>
          </div>
          <div className={styles.activityBox}>
            <Sparkline data={activity} color={user.status === "AKTIV" ? "#2a6cb3" : "#9aa1ab"} height={80} width={520} />
            <div className={styles.activityBars}>
              {activity.map((v, i) => (
                <motion.span
                  key={i}
                  className={styles.activityCell}
                  title={`${v} økter`}
                  style={{ opacity: v ? 0.25 + Math.min(1, v / 4) * 0.75 : 1, background: v ? "#2a6cb3" : undefined }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.2 + i * 0.012 }}
                />
              ))}
            </div>
            <div className={styles.activityAxis}>
              <span>for 30 dager siden</span>
              <span>i dag</span>
            </div>
          </div>
        </section>

        <section className={styles.panelSection}>
          <div className={styles.panelHead}>
            <h3>Status</h3>
          </div>
          <ToggleGroup size="small" value={status} onChange={(v) => setStatus(v as UserStatus)} fill>
            {statusOptions.map((s) => (
              <ToggleGroup.Item key={s} value={s} label={STATUS_LABELS[s]} />
            ))}
          </ToggleGroup>
          {status === "SPERRET" && user.status !== "SPERRET" ? (
            <BodyShort size="small" className={styles.warnText}>
              <ShieldLockIcon aria-hidden /> Brukeren mister tilgang til nEESSI umiddelbart og logges ut av aktive økter.
            </BodyShort>
          ) : null}
        </section>

        <section className={styles.panelSection}>
          <div className={styles.panelHead}>
            <h3>Roller</h3>
            <span className="muted">{roles.length} valgt</span>
          </div>
          <div className={styles.switchList}>
            {ROLE_ORDER.map((r) => (
              <div key={r} className={`${styles.switchRow} ${roles.includes(r) ? styles.switchRowOn : ""}`} style={{ "--role": ROLE_META[r].hex } as React.CSSProperties}>
                <span className={styles.roleSwatch} />
                <Switch size="small" checked={roles.includes(r)} onChange={(e) => toggleRole(r, e.target.checked)} description={ROLE_META[r].description}>
                  {ROLE_LABELS[r]}
                </Switch>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panelSection}>
          <div className={styles.panelHead}>
            <h3>Enhetstilgang</h3>
            <span className="muted">{extra.length + 1} enheter</span>
          </div>
          <div className={styles.homeEnhet}>
            <Buildings3Icon aria-hidden />
            <div>
              <strong>{home?.name}</strong>
              <div className="muted" style={{ fontSize: "0.82rem" }}>
                Hjemmeenhet {user.enhetId} · alltid tilgang
              </div>
            </div>
            <CheckmarkIcon aria-hidden style={{ marginLeft: "auto", color: "#3a8a5f", fontSize: "1.3rem" }} />
          </div>
          <CheckboxGroup legend="Tilgang til andre enheter" hideLegend value={extra} onChange={(v: string[]) => setExtra(v)} size="small">
            <div className={styles.enhetGrid}>
              {enheter
                .filter((e) => e.id !== user.enhetId)
                .map((e) => (
                  <Checkbox key={e.id} value={e.id}>
                    <span className="mono muted">{e.id}</span> {e.shortName}
                  </Checkbox>
                ))}
            </div>
          </CheckboxGroup>
        </section>

        <section className={styles.panelSection}>
          <div className={styles.panelHead}>
            <h3>Siste handlinger</h3>
            <span className="muted">Revisjonslogg</span>
          </div>
          <ol className={styles.timeline}>
            {log.map((entry, i) => {
              const Icon = AUDIT_ICON[entry.kind];
              return (
                <motion.li
                  key={entry.id}
                  className={styles.timelineItem}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.06 }}
                >
                  <span className={styles.timelineIcon} style={{ backgroundImage: `linear-gradient(color-mix(in srgb, ${AUDIT_COLOR[entry.kind]} 16%, transparent), color-mix(in srgb, ${AUDIT_COLOR[entry.kind]} 16%, transparent))`, color: AUDIT_COLOR[entry.kind] }}>
                    <Icon aria-hidden />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.timelineText}>{entry.text}</div>
                    {entry.detail ? <div className={styles.timelineDetail}>{entry.detail}</div> : null}
                  </div>
                  <span className={styles.timelineWhen}>
                    {sinceText(entry.daysAgo).replace("for ", "")}
                    <br />
                    <span className="mono">{entry.time}</span>
                  </span>
                </motion.li>
              );
            })}
          </ol>
        </section>
      </Dialog.Body>

      <Dialog.Footer className={styles.drawerFooter}>
        <Button
          disabled={!dirty}
          icon={<CheckmarkIcon aria-hidden />}
          onClick={() => onSave({ ...user, roles, status, extraEnheter: extra })}
        >
          Lagre endringer
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Avbryt
        </Button>
        {user.status === "INVITERT" ? (
          <Button variant="tertiary" icon={<ArrowCirclepathIcon aria-hidden />} onClick={() => onRemind(user)} style={{ marginLeft: "auto" }}>
            Send invitasjon på nytt
          </Button>
        ) : (
          <Button variant="tertiary" icon={<BellIcon aria-hidden />} onClick={() => onRemind(user)} style={{ marginLeft: "auto" }}>
            Send påminnelse
          </Button>
        )}
      </Dialog.Footer>
    </>
  );
}

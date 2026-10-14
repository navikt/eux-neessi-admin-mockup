"use client";

import {
  ArrowCirclepathIcon,
  ExclamationmarkTriangleFillIcon,
  InformationSquareFillIcon,
  LaptopIcon,
  PadlockLockedFillIcon,
  MobileSmallIcon,
  XMarkIcon,
  XMarkOctagonFillIcon,
} from "@navikt/aksel-icons";
import { Button, ToggleGroup } from "@navikt/ds-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import styles from "./driftsmeldinger.module.css";
import type { Severity } from "./model";

export const SEVERITY_ICON = {
  info: InformationSquareFillIcon,
  advarsel: ExclamationmarkTriangleFillIcon,
  feil: XMarkOctagonFillIcon,
} satisfies Record<Severity, typeof InformationSquareFillIcon>;

interface BannerProps {
  title: string;
  body: string;
  severity: Severity;
  dismissible: boolean;
  period?: string;
  onClose?: () => void;
  compact?: boolean;
}

/** The banner as nEESSI renders it at the top of every page. */
export function Banner({ title, body, severity, dismissible, period, onClose, compact }: BannerProps) {
  const Icon = SEVERITY_ICON[severity];
  return (
    <div className={`${styles.banner} ${styles[`banner_${severity}`]} ${compact ? styles.bannerCompact : ""}`} role="status">
      <motion.span
        key={severity}
        className={styles.bannerIcon}
        initial={{ scale: 0.4, rotate: -30, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 18 }}
      >
        <Icon aria-hidden />
      </motion.span>
      <div className={styles.bannerText}>
        <strong>{title || "Tittel på driftsmeldingen"}</strong>
        <span>{body || "Her kommer selve meldingen. Skriv kort hva som skjer, hvem som berøres og hva brukeren bør gjøre."}</span>
        {period ? <em>{period}</em> : null}
      </div>
      {dismissible ? (
        <button type="button" className={styles.bannerClose} onClick={onClose} aria-label="Lukk driftsmelding">
          <XMarkIcon aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

interface PreviewProps extends Omit<BannerProps, "onClose" | "compact"> {
  userName: string;
  enhetLabel: string;
}

const NAV = ["Saker", "Oppgaver", "Opprett sak", "Søk"];

/** Mini nEESSI inside a fake browser window, with the banner on top. */
export function BannerPreview({ userName, enhetLabel, ...banner }: PreviewProps) {
  const [device, setDevice] = useState<"desktop" | "mobil">("desktop");
  const [closed, setClosed] = useState(false);
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  const mobile = device === "mobil";

  return (
    <div className={styles.previewWrap}>
      <div className={styles.previewBar}>
        <span className={styles.previewLive}>
          <i /> Forhåndsvisning
        </span>
        <ToggleGroup size="small" value={device} onChange={(v) => setDevice(v as "desktop" | "mobil")} variant="neutral">
          <ToggleGroup.Item value="desktop" icon={<LaptopIcon aria-hidden />} label="Skjerm" />
          <ToggleGroup.Item value="mobil" icon={<MobileSmallIcon aria-hidden />} label="Smal" />
        </ToggleGroup>
      </div>

      <motion.div
        className={styles.browser}
        layout
        animate={{ maxWidth: mobile ? 380 : 2000 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      >
        <div className={styles.browserChrome}>
          <span className={styles.lights}>
            <i />
            <i />
            <i />
          </span>
          <div className={styles.urlBar}>
            <PadlockLockedFillIcon aria-hidden />
            <span>neessi.intern.nav.no</span>
            <span className={styles.urlPath}>/saker</span>
          </div>
        </div>

        <div className={styles.appHeader}>
          <span className={styles.appLogo}>
            <b>n</b>EESSI
          </span>
          {!mobile ? (
            <nav className={styles.appNav}>
              {NAV.map((n, i) => (
                <span key={n} className={i === 0 ? styles.appNavActive : undefined}>
                  {n}
                </span>
              ))}
            </nav>
          ) : null}
          <span className={styles.appUser}>
            {!mobile ? <span>{enhetLabel}</span> : null}
            <b>{initials}</b>
          </span>
        </div>

        <div className={styles.bannerSlot}>
          <AnimatePresence initial={false} mode="popLayout">
            {!closed ? (
              <motion.div
                key="banner"
                layout
                initial={{ opacity: 0, y: -16, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -12, height: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
              >
                <Banner {...banner} compact={mobile} onClose={() => setClosed(true)} />
              </motion.div>
            ) : (
              <motion.div
                key="closed"
                className={styles.closedNote}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Banneret er lukket for denne brukeren.
                <Button size="xsmall" variant="tertiary" icon={<ArrowCirclepathIcon aria-hidden />} onClick={() => setClosed(false)}>
                  Vis igjen
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={styles.appBody}>
          <div className={styles.skelHead}>
            <span className={`${styles.skel} ${styles.skelTitle}`} />
            <span className={`${styles.skel} ${styles.skelBtn}`} />
          </div>
          <div className={styles.skelChips}>
            {[64, 88, 52, 76].map((w, i) => (
              <span key={i} className={`${styles.skel} ${styles.skelChip}`} style={{ width: w }} />
            ))}
          </div>
          <div className={styles.skelTable}>
            {Array.from({ length: mobile ? 4 : 5 }, (_, i) => (
              <div key={i} className={styles.skelRow} style={{ animationDelay: `${i * 0.12}s` }}>
                <span className={`${styles.skel} ${styles.skelDot}`} />
                <span className={styles.skel} style={{ width: `${[38, 52, 44, 30, 48][i]}%` }} />
                {!mobile ? <span className={styles.skel} style={{ width: "14%" }} /> : null}
                <span className={styles.skel} style={{ width: mobile ? "18%" : "10%", marginLeft: "auto" }} />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

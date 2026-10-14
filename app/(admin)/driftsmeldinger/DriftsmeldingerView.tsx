"use client";

import { BellIcon, CalendarIcon, MegaphoneSpeakingIcon } from "@navikt/aksel-icons";
import { Button, ToggleGroup } from "@navikt/ds-react";
import { useMemo, useState } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { HeroStat, PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { Card, Section } from "@/components/ui/Section";
import { useToasts } from "@/components/ui/Toast";
import { fmtInt } from "@/lib/format";
import { Composer, draftFromMessage, emptyDraft, type Draft } from "./Composer";
import styles from "./driftsmeldinger.module.css";
import { MessageList, TAB_OF, type ListedMessage, type ListTab } from "./MessageList";
import { MessageTimeline } from "./MessageTimeline";
import { addMinutes, fmtRelative, fmtWhen, SEVERITY_META, statusOf, type Driftsmelding, type DriftsmeldingerData } from "./model";
import { ReadStats } from "./ReadStats";

type Range = "uker" | "kvartal";
const RANGES: Record<Range, { before: number; after: number }> = {
  uker: { before: 14, after: 28 },
  kvartal: { before: 45, after: 50 },
};

function scrollToId(id: string) {
  window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
}

interface Props {
  data: DriftsmeldingerData;
  userName: string;
}

export function DriftsmeldingerView({ data, userName }: Props) {
  const { now } = data;
  const { toasts, push } = useToasts();
  const [messages, setMessages] = useState<Driftsmelding[]>(data.messages);
  const [tab, setTab] = useState<ListTab>("aktive");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("kvartal");
  const [composer, setComposer] = useState<{ key: number; initial: Draft; prefilled: boolean }>(() => ({
    key: 0,
    initial: emptyDraft(now, data.prefill),
    prefilled: data.prefill !== null,
  }));

  const listed: ListedMessage[] = useMemo(() => messages.map((m) => ({ ...m, status: statusOf(m, now) })), [messages, now]);

  const active = listed.filter((m) => m.status === "aktiv");
  const planned = listed.filter((m) => m.status === "planlagt").sort((a, b) => a.start.localeCompare(b.start));
  const last30 = listed.filter((m) => m.start >= addMinutes(now, -30 * 1440) && m.status !== "planlagt");
  const views30 = last30.reduce((s, m) => s + m.stats.seen, 0);
  const reachedTarget = last30.reduce((s, m) => s + m.stats.target, 0);
  const avgRead = reachedTarget ? (views30 / reachedTarget) * 100 : 0;
  const activeBySev = (["feil", "advarsel", "info"] as const)
    .map((s) => ({ s, n: active.filter((m) => m.severity === s).length }))
    .filter((x) => x.n > 0)
    .map((x) => `${x.n} ${SEVERITY_META[x.s].label.toLowerCase()}`)
    .join(" · ");

  const focus = (msg: { id: string; status: ListedMessage["status"] }) => {
    setTab(TAB_OF[msg.status]);
    setHighlightId(null);
    window.setTimeout(() => setHighlightId(msg.id), 30);
    scrollToId(`msg-${msg.id}`);
  };

  const publish = (msg: Driftsmelding) => {
    setMessages((prev) => [msg, ...prev]);
    const status = statusOf(msg, now);
    focus({ id: msg.id, status });
    push(
      status === "aktiv" ? "Driftsmeldingen er publisert" : "Driftsmeldingen er planlagt",
      status === "aktiv"
        ? `«${msg.title}» vises nå for ca. ${fmtInt(msg.stats.target)} brukere.`
        : `«${msg.title}» vises fra ${fmtWhen(msg.start)}.`,
      "success",
    );
  };

  const deactivate = (msg: ListedMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, deactivatedAt: now } : m)));
    push(
      msg.status === "planlagt" ? "Planlagt melding avbrutt" : "Driftsmeldingen er deaktivert",
      `«${msg.title}» vises ikke lenger for brukerne.`,
      "info",
    );
  };

  const duplicate = (msg: ListedMessage) => {
    setComposer((c) => ({ key: c.key + 1, initial: draftFromMessage(msg, now), prefilled: false }));
    document.getElementById("ny")?.scrollIntoView({ behavior: "smooth", block: "start" });
    push("Kopiert til skjemaet", "Juster tidspunkt og tekst før du publiserer.", "info");
  };

  return (
    <>
      <PageHero
        variant="sunset"
        eyebrow={
          <span className={styles.heroLive}>
            <BellIcon aria-hidden /> Drift · nEESSI
          </span>
        }
        title="Driftsmeldinger"
        lead="Gi saksbehandlerne beskjed når noe ikke virker som det skal, eller før det skjer. Meldingene vises som banner øverst i nEESSI."
        actions={
          <>
            <Button as="a" href="#ny" size="small" variant="primary" icon={<MegaphoneSpeakingIcon aria-hidden />}>
              Ny driftsmelding
            </Button>
            <Button as="a" href="#tidslinje" size="small" variant="secondary" data-color="neutral" icon={<CalendarIcon aria-hidden />}>
              Tidslinje
            </Button>
          </>
        }
      >
        <HeroStat label="Aktive nå" value={<CountUp value={active.length} />} hint={activeBySev || "Ingen aktive meldinger"} />
        <HeroStat
          label="Planlagte"
          value={<CountUp value={planned.length} />}
          hint={planned[0] ? `Neste ${fmtRelative(planned[0].start, now)}` : "Ingen planlagt"}
        />
        <HeroStat label="Visninger siste 30 d" value={<CountUp value={views30} />} hint={`${last30.length} meldinger vist`} />
        <HeroStat label="Andel som har sett" value={<CountUp value={avgRead} suffix=" %" />} hint="Snitt av målgruppen, siste 30 d" />
      </PageHero>

      <Section
        id="ny"
        kicker="Skriv"
        title="Ny driftsmelding"
        lead="Forhåndsvisningen til høyre oppdateres mens du skriver, slik brukerne vil se den."
      >
        <Composer
          key={composer.key}
          now={now}
          initial={composer.initial}
          prefilled={composer.prefilled}
          nextId={`dm-${2046 + messages.length - data.messages.length}`}
          activeUsersByEnhet={data.activeUsersByEnhet}
          totalActiveUsers={data.totalActiveUsers}
          userName={userName}
          onPublish={publish}
        />
      </Section>

      <Section id="meldinger" kicker="Oversikt" title="Meldinger" lead="Aktive, planlagte og tidligere driftsmeldinger med lesestatistikk.">
        <Reveal>
          <Card>
            <MessageList
              messages={listed}
              now={now}
              tab={tab}
              onTabChange={setTab}
              highlightId={highlightId}
              onDeactivate={deactivate}
              onDuplicate={duplicate}
            />
          </Card>
        </Reveal>
      </Section>

      <Section
        id="tidslinje"
        kicker="Tidslinje"
        title="Når vises hva?"
        lead="Klikk på en melding for å finne den i listen."
        actions={
          <ToggleGroup size="small" value={range} onChange={(v) => setRange(v as Range)} variant="neutral">
            <ToggleGroup.Item value="uker" label="6 uker" />
            <ToggleGroup.Item value="kvartal" label="3 måneder" />
          </ToggleGroup>
        }
      >
        <Reveal>
          <Card>
            <MessageTimeline messages={listed} now={now} range={RANGES[range]} onSelect={focus} />
          </Card>
        </Reveal>
      </Section>

      <Section kicker="Lesestatistikk" title="Blir meldingene lest?" lead="Hvor stor del av målgruppen som har sett og lukket hver melding.">
        <Reveal>
          <ReadStats messages={listed} />
        </Reveal>
      </Section>

      {toasts}
    </>
  );
}

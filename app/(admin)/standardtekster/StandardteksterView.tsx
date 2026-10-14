"use client";

import {
  ArrowUndoIcon,
  CheckmarkCircleFillIcon,
  ClockDashedIcon,
  EyeIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from "@navikt/aksel-icons";
import { Button, Modal, Select, Tag, Textarea, TextField, ToggleGroup, Tooltip } from "@navikt/ds-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { Flag } from "@/components/ui/Flag";
import { HeroStat, PageHero } from "@/components/ui/PageHero";
import { Card, Section } from "@/components/ui/Section";
import { useToasts } from "@/components/ui/Toast";
import { fmtDate, fmtDateShort, fmtDaysAgo, fmtInt } from "@/lib/format";
import { addDaysIso, diffDays } from "@/lib/mock/clock";
import { ENHETER, ENHET_BY_ID, SECTOR_BY_CODE, SED_BY_TYPE } from "@/lib/mock/reference";
import {
  LANGS,
  TEMPLATES,
  TEMPLATE_BY_SED,
  VARIABLES,
  emptyValues,
  fillVariables,
  latestPublished,
  type Lang,
  type Scope,
  type TextTemplate,
  type TextValues,
  type TextVersion,
  type VersionStatus,
} from "@/lib/mock/texts";
import styles from "./standardtekster.module.css";
import { useTextStore } from "./useTextStore";

interface Props {
  todayIso: string;
  userName: string;
  initialSed: string;
  initialScope: Scope;
}

const SAMPLE_ENHET: Record<string, string> = { H001: "4489", P8000: "0393", F001: "4862", A003: "4530", U001: "4402", S080: "4489", X009: "0393", X008: "4530", X001: "4402" };

export function StandardteksterView({ todayIso, userName, initialSed, initialScope }: Props) {
  const [store, write, resetStore] = useTextStore(todayIso);
  const [sed, setSed] = useState(initialSed);
  const [scope, setScope] = useState<Scope>(initialScope);
  const [lang, setLang] = useState<Lang>("en");
  const [query, setQuery] = useState("");
  const { toasts, push } = useToasts();

  useEffect(() => {
    const p = new URLSearchParams();
    p.set("sed", sed);
    if (scope !== "ALLE") p.set("enhet", scope);
    window.history.replaceState(null, "", `?${p.toString()}`);
  }, [sed, scope]);

  const template = TEMPLATE_BY_SED[sed];
  const versions = store[sed]?.[scope] ?? [];
  const defaults = store[sed]?.ALLE ?? [];

  const counts = useMemo(() => {
    let overrides = 0;
    let drafts = 0;
    let lastIso = "";
    let lastBy = "";
    for (const t of TEMPLATES) {
      for (const [sc, vs] of Object.entries(store[t.sed] ?? {})) {
        if (sc !== "ALLE" && vs.length) overrides++;
        if (vs[0]?.status === "UTKAST") drafts++;
        const pub = latestPublished(vs);
        if (pub && pub.dateIso > lastIso) {
          lastIso = pub.dateIso;
          lastBy = pub.author;
        }
      }
    }
    const withDefault = TEMPLATES.reduce((a, t) => a + (t.sentLast30 * (t.usage.unchanged + t.usage.edited)) / 100, 0);
    return { overrides, drafts, lastIso, lastBy, withDefault, fields: TEMPLATES.reduce((a, t) => a + t.fields.length, 0) };
  }, [store]);

  const filtered = TEMPLATES.filter((t) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return t.sed.toLowerCase().includes(q) || SED_BY_TYPE[t.sed]?.name.toLowerCase().includes(q) || t.fields.some((fl) => fl.label.toLowerCase().includes(q));
  });

  const save = (values: TextValues, status: VersionStatus, note: string) => {
    const prev = store[sed]?.[scope] ?? [];
    // A new draft replaces an existing unpublished draft instead of stacking up.
    const base = status === "UTKAST" && prev[0]?.status === "UTKAST" ? prev.slice(1) : prev;
    const top = prev[0]?.status === "UTKAST" && status === "PUBLISERT" ? prev.slice(1) : base;
    const version = (top[0]?.version ?? 0) + 1;
    const v: TextVersion = { id: `${sed}-${scope}-${version}-${top.length}`, version, author: userName, dateIso: todayIso, status, note, values };
    write({ ...store, [sed]: { ...store[sed], [scope]: [v, ...top] } });
    const where = scope === "ALLE" ? "alle enheter" : ENHET_BY_ID[scope]?.name;
    push(status === "PUBLISERT" ? `${sed} publisert` : "Utkast lagret", status === "PUBLISERT" ? `Versjon ${version} brukes nå av ${where} i nEESSI.` : `Utkastet for ${where} er lagret, men ikke tatt i bruk.`, status === "PUBLISERT" ? "success" : "info");
  };

  const removeOverride = () => {
    const next = { ...store[sed] };
    delete next[scope];
    write({ ...store, [sed]: next });
    push("Egen tekst fjernet", `${ENHET_BY_ID[scope]?.name} bruker nå standardteksten for ${sed}.`, "warning");
  };

  const select = (s: string, sc: Scope = "ALLE") => {
    setSed(s);
    setScope(sc);
  };

  const overridesFor = (s: string) => Object.entries(store[s] ?? {}).filter(([sc, vs]) => sc !== "ALLE" && vs.length);

  return (
    <>
      <PageHero
        variant="violet"
        eyebrow="Standardtekster"
        title="Gode svar starter med gode maler"
        lead="Forhåndsutfylte tekster i fritekstfeltene i nEESSI – som «Vennligst send oss følgende dokumenter» i H001. Sett en standard for alle, og la enhetene tilpasse der det trengs."
        actions={
          <Button
            size="small"
            variant="secondary"
            data-color="neutral"
            icon={<ArrowUndoIcon aria-hidden />}
            onClick={() => {
              resetStore();
              push("Demo nullstilt", "Alle lokale endringer i standardtekstene er fjernet.", "info");
            }}
          >
            Nullstill demo
          </Button>
        }
      >
        <HeroStat label="SED-maler" value={<CountUp value={TEMPLATES.length} />} hint={`${counts.fields} fritekstfelt`} />
        <HeroStat label="Enhetstilpasninger" value={<CountUp value={counts.overrides} />} hint={`på tvers av ${ENHETER.length} enheter`} />
        <HeroStat label="Utkast" value={<CountUp value={counts.drafts} />} hint={counts.drafts ? "venter på publisering" : "alt er publisert"} />
        <HeroStat label="SED-er med standardtekst" value={<CountUp value={counts.withDefault} />} hint="siste 30 dager" />
        <HeroStat label="Sist publisert" value={fmtDateShort(counts.lastIso)} hint={`${fmtDaysAgo(diffDays(counts.lastIso, todayIso)).toLowerCase()} av ${counts.lastBy}`} />
      </PageHero>

      <div className={styles.layout}>
        <aside className={styles.list}>
          <div className={styles.searchWrap}>
            <MagnifyingGlassIcon aria-hidden />
            <input className={styles.search} placeholder="Søk i SED-er og felt…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Søk i maler" />
          </div>
          <div className={styles.listItems}>
            {filtered.map((t) => {
              const ov = overridesFor(t.sed);
              const draft = Object.values(store[t.sed] ?? {}).some((vs) => vs[0]?.status === "UTKAST");
              return (
                <button key={t.sed} className={`${styles.item} ${t.sed === sed ? styles.itemActive : ""}`} onClick={() => t.sed !== sed && select(t.sed)}>
                  {t.sed === sed && <motion.span layoutId="std-active" className={styles.itemBg} transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                  <span className="sed-code">{t.sed}</span>
                  <span className={styles.itemText}>
                    <span className={styles.itemName}>{SED_BY_TYPE[t.sed]?.name}</span>
                    <span className={styles.itemMeta}>
                      {t.fields.length} felt{ov.length ? ` · ${ov.length} enhet${ov.length > 1 ? "er" : ""} tilpasset` : ""}
                    </span>
                  </span>
                  {draft && (
                    <Tooltip content="Har upublisert utkast">
                      <span className={styles.draftDot} />
                    </Tooltip>
                  )}
                </button>
              );
            })}
            {!filtered.length && <p className="muted" style={{ padding: 12 }}>Ingen treff på «{query}».</p>}
          </div>
        </aside>

        <div className={styles.main}>
          <div className={styles.editorHead}>
            <div style={{ minWidth: 0 }}>
              <div className="section__kicker">
                {template.sed} · {SED_BY_TYPE[sed]?.buc} · {SECTOR_BY_CODE[SED_BY_TYPE[sed]?.sector]?.name}
              </div>
              <h2 className={styles.editorTitle}>{SED_BY_TYPE[sed]?.name}</h2>
            </div>
            <div className={styles.scopeBar}>
              <Select label="Gjelder for" size="small" value={scope} onChange={(e) => setScope(e.target.value)} className={styles.scopeSelect}>
                <option value="ALLE">Standard – alle enheter</option>
                {ENHETER.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.id} {e.shortName}
                    {store[sed]?.[e.id]?.length ? " ✎" : ""}
                  </option>
                ))}
              </Select>
              <ToggleGroup size="small" value={lang} onChange={(v) => setLang(v as Lang)} label="Språk">
                {LANGS.map((l) => (
                  <ToggleGroup.Item key={l.code} value={l.code} label={l.label} />
                ))}
              </ToggleGroup>
            </div>
          </div>

          <Editor
            key={`${sed}:${scope}:${versions[0]?.id ?? "none"}`}
            template={template}
            scope={scope}
            versions={versions}
            inherited={latestPublished(defaults)}
            lang={lang}
            todayIso={todayIso}
            userName={userName}
            onSave={save}
            onRemoveOverride={removeOverride}
            overrideCount={overridesFor(sed).length}
          />
        </div>
      </div>

      <Section
        kicker="Oversikt"
        title="Hvem bruker hva?"
        lead="Hver rad er en SED-mal, hver kolonne en enhet. Fylte felt betyr at enheten har sin egen tekst; tomme arver standarden. Klikk for å redigere."
      >
        <Card className={styles.matrixCard}>
          <div className={styles.matrix} style={{ gridTemplateColumns: `minmax(220px, 1.4fr) 90px repeat(${ENHETER.length}, minmax(64px, 1fr))` }}>
            <span className={styles.mHead}>SED</span>
            <span className={styles.mHead}>Standard</span>
            {ENHETER.map((e) => (
              <Tooltip key={e.id} content={e.name}>
                <span className={`${styles.mHead} ${styles.mHeadEnhet}`}>
                  <span className="mono">{e.id}</span>
                  <span className={styles.mHeadName}>{e.shortName}</span>
                </span>
              </Tooltip>
            ))}
            {TEMPLATES.map((t, ri) => {
              const def = store[t.sed]?.ALLE ?? [];
              const pub = latestPublished(def);
              return (
                <div key={t.sed} className={styles.mRow} style={{ display: "contents" }}>
                  <button className={styles.mSed} onClick={() => select(t.sed)}>
                    <span className="sed-code">{t.sed}</span>
                    <span className={styles.itemName}>{SED_BY_TYPE[t.sed]?.name}</span>
                  </button>
                  <button className={`${styles.mCell} ${styles.mDefault}`} onClick={() => select(t.sed)} data-active={t.sed === sed && scope === "ALLE"}>
                    {pub ? `v${pub.version}` : "–"}
                    {def[0]?.status === "UTKAST" && <span className={styles.draftDot} />}
                  </button>
                  {ENHETER.map((e, ci) => {
                    const vs = store[t.sed]?.[e.id] ?? [];
                    const has = vs.length > 0;
                    const draft = vs[0]?.status === "UTKAST";
                    return (
                      <motion.button
                        key={e.id}
                        className={`${styles.mCell} ${has ? styles.mOverride : ""}`}
                        data-active={t.sed === sed && scope === e.id}
                        onClick={() => select(t.sed, e.id)}
                        initial={{ opacity: 0, scale: 0.85 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: ri * 0.03 + ci * 0.015 }}
                        title={has ? `${e.shortName}: egen tekst (v${vs[0].version})` : `${e.shortName}: bruker standard`}
                      >
                        {has ? <PencilIcon aria-hidden /> : <span className={styles.mInherit} />}
                        {draft && <span className={styles.draftDot} />}
                      </motion.button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="legend" style={{ marginTop: 14 }}>
            <span className="legend__item">
              <span className={`${styles.mCell} ${styles.mOverride} ${styles.mLegend}`}>
                <PencilIcon aria-hidden />
              </span>
              Egen tekst
            </span>
            <span className="legend__item">
              <span className={`${styles.mCell} ${styles.mLegend}`}>
                <span className={styles.mInherit} />
              </span>
              Arver standard
            </span>
            <span className="legend__item">
              <span className={styles.draftDot} style={{ position: "static" }} /> Upublisert utkast
            </span>
          </div>
        </Card>
      </Section>
      {toasts}
    </>
  );
}

interface EditorProps {
  template: TextTemplate;
  scope: Scope;
  versions: TextVersion[];
  inherited: TextVersion | undefined;
  lang: Lang;
  todayIso: string;
  userName: string;
  onSave: (values: TextValues, status: VersionStatus, note: string) => void;
  onRemoveOverride: () => void;
  overrideCount: number;
}

function Editor({ template, scope, versions, inherited, lang, todayIso, userName, onSave, onRemoveOverride, overrideCount }: EditorProps) {
  const isOverride = scope !== "ALLE";
  const current = versions[0];
  const published = latestPublished(versions);
  const startValues = current?.values ?? inherited?.values ?? emptyValues(template);
  const [values, setValues] = useState<TextValues>(() => normalize(template, startValues));
  const [customizing, setCustomizing] = useState(!isOverride || versions.length > 0);
  const [focus, setFocus] = useState<string>(template.fields[0].key);
  const [publishOpen, setPublishOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loadedFrom, setLoadedFrom] = useState<number | null>(null);
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const baseline = normalize(template, current?.values ?? inherited?.values ?? emptyValues(template));
  const dirtyFields = template.fields.filter((fl) => LANGS.some((l) => values[fl.key][l.code] !== baseline[fl.key][l.code]));
  const changedFromPublished = template.fields.filter((fl) => {
    const ref = normalize(template, published?.values ?? inherited?.values ?? emptyValues(template));
    return LANGS.some((l) => values[fl.key][l.code] !== ref[fl.key][l.code]);
  });
  const dirty = dirtyFields.length > 0;
  const hasDraft = current?.status === "UTKAST";
  const enhet = isOverride ? ENHET_BY_ID[scope] : ENHET_BY_ID[SAMPLE_ENHET[template.sed] ?? "4530"];
  const sed = SED_BY_TYPE[template.sed];

  const ctx: Record<string, string> = {
    "saksbehandler.navn": userName,
    "enhet.navn": enhet?.name ?? "Nav",
    "mottaker.land": lang === "en" ? "Sweden" : "Sverige",
    "mottaker.institusjon": "Försäkringskassan",
    "rinasak.id": "1452290",
    "person.navn": "Kari Nordmann",
    dato: lang === "en" ? new Date(`${todayIso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : fmtDate(todayIso),
    frist: lang === "en" ? fmtEnDate(addDaysIso(todayIso, sed?.fristDager ?? 30)) : fmtDate(addDaysIso(todayIso, sed?.fristDager ?? 30)),
  };

  const setField = (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: { ...v[key], [lang]: value } }));
  };

  const insertVar = (variable: string) => {
    const el = refs.current[focus];
    const token = `{{${variable}}}`;
    const text = values[focus][lang];
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + token + text.slice(end);
    setField(focus, next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  if (!customizing) {
    return (
      <div className={styles.editorGrid}>
        <Card className={styles.inheritCard}>
          <div className={styles.inheritIcon}>
            <FileTextIcon aria-hidden />
          </div>
          <h3 className="card__title" style={{ fontSize: "1.2rem" }}>
            {enhet?.name} bruker standardteksten
          </h3>
          <p className="muted" style={{ maxWidth: 460, margin: "6px auto 18px" }}>
            Saksbehandlere i {enhet?.shortName.toLowerCase()} får standardteksten for {template.sed} (versjon {inherited?.version ?? "–"}). Lag en egen tekst hvis enheten trenger noe mer spesifikt.
          </p>
          <Button size="small" icon={<PlusIcon aria-hidden />} onClick={() => setCustomizing(true)}>
            Lag egen tekst for {enhet?.shortName}
          </Button>
        </Card>
        <Preview template={template} values={values} lang={lang} ctx={ctx} enhetName={enhet?.name ?? ""} inheritedBadge />
      </div>
    );
  }

  return (
    <>
      <div className={styles.editorGrid}>
        <Card className={styles.editorCard}>
          <div className={styles.statusRow}>
            {current ? (
              <Tag size="small" variant="moderate" data-color={hasDraft ? "warning" : "success"} icon={hasDraft ? <ClockDashedIcon aria-hidden /> : <CheckmarkCircleFillIcon aria-hidden />}>
                {hasDraft ? `Utkast v${current.version}` : `Publisert v${current.version}`}
              </Tag>
            ) : (
              <Tag size="small" variant="moderate" data-color="info" icon={<SparklesIcon aria-hidden />}>
                Ny tekst – basert på standard
              </Tag>
            )}
            {isOverride && (
              <Tag size="small" variant="outline" data-color="meta-purple">
                Egen tekst for {ENHET_BY_ID[scope]?.shortName}
              </Tag>
            )}
            {loadedFrom != null && (
              <Tag size="small" variant="outline" data-color="neutral">
                Lastet inn fra v{loadedFrom}
              </Tag>
            )}
            <AnimatePresence>
              {dirty && (
                <motion.span className={styles.dirty} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                  ● {dirtyFields.length} felt endret
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className={styles.vars}>
            <span className="muted" style={{ fontSize: "0.8rem" }}>
              Sett inn i «{template.fields.find((fl) => fl.key === focus)?.label}»:
            </span>
            {VARIABLES.map((v) => (
              <button key={v.key} type="button" className={styles.varChip} onMouseDown={(e) => e.preventDefault()} onClick={() => insertVar(v.key)} title={`{{${v.key}}}`}>
                {v.label}
              </button>
            ))}
          </div>

          <div className={styles.fields}>
            <div className={styles.sectionLabel}>{lang === "en" ? template.sectionEn : template.section}</div>
            {template.fields.map((fl) => (
              <div key={fl.key} className={`${styles.field} ${focus === fl.key ? styles.fieldFocus : ""}`}>
                <Textarea
                  ref={(el) => {
                    refs.current[fl.key] = el;
                  }}
                  label={lang === "en" ? fl.labelEn : fl.label}
                  description={fl.hint}
                  size="small"
                  minRows={fl.rows}
                  maxRows={10}
                  maxLength={fl.maxLength}
                  value={values[fl.key][lang]}
                  onChange={(e) => setField(fl.key, e.target.value)}
                  onFocus={() => setFocus(fl.key)}
                  resize="vertical"
                />
                {values[fl.key][lang === "en" ? "nb" : "en"] === "" && values[fl.key][lang] !== "" && (
                  <div className={styles.missingLang}>Mangler {lang === "en" ? "norsk" : "engelsk"} versjon</div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.actions}>
            {isOverride && current && (
              <Button size="small" variant="tertiary-neutral" icon={<TrashIcon aria-hidden />} onClick={onRemoveOverride}>
                Bruk standard
              </Button>
            )}
            {isOverride && !current && (
              <Button size="small" variant="tertiary-neutral" onClick={() => setCustomizing(false)}>
                Avbryt
              </Button>
            )}
            <span style={{ flex: 1 }} />
            {dirty && (
              <Button size="small" variant="tertiary" onClick={() => setValues(baseline)}>
                Forkast endringer
              </Button>
            )}
            <Button size="small" variant="secondary" disabled={!dirty && !!current} onClick={() => onSave(values, "UTKAST", "Utkast")}>
              Lagre utkast
            </Button>
            <Button size="small" disabled={!changedFromPublished.length && !!published} onClick={() => setPublishOpen(true)}>
              Publiser…
            </Button>
          </div>
        </Card>

        <div className={styles.side}>
          <Preview template={template} values={values} lang={lang} ctx={ctx} enhetName={enhet?.name ?? ""} />
          <UsageCard template={template} />
          <History
            versions={versions}
            todayIso={todayIso}
            onLoad={(v) => {
              setValues(normalize(template, v.values));
              setLoadedFrom(v.version);
            }}
          />
        </div>
      </div>

      <Modal open={publishOpen} onClose={() => setPublishOpen(false)} header={{ heading: `Publiser ${template.sed}`, label: isOverride ? ENHET_BY_ID[scope]?.name : "Standard for alle enheter" }} width="medium">
        <Modal.Body>
          <p style={{ marginTop: 0 }}>
            Teksten tas i bruk umiddelbart for nye {template.sed}-er i nEESSI
            {isOverride ? ` for ${ENHET_BY_ID[scope]?.name}` : ` for alle enheter uten egen tekst (${ENHETER.length - overrideCount} enheter)`}.
          </p>
          <div className={styles.diffList}>
            {changedFromPublished.map((fl) => {
              const ref = normalize(template, published?.values ?? inherited?.values ?? emptyValues(template));
              return (
                <div key={fl.key} className={styles.diff}>
                  <div className={styles.diffLabel}>{fl.label}</div>
                  {LANGS.filter((l) => values[fl.key][l.code] !== ref[fl.key][l.code]).map((l) => (
                    <div key={l.code} className={styles.diffPair}>
                      <span className={styles.diffLang}>{l.code.toUpperCase()}</span>
                      <div>
                        {ref[fl.key][l.code] && <del>{ref[fl.key][l.code]}</del>}
                        <ins>{values[fl.key][l.code] || "(tomt)"}</ins>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <TextField label="Endringsnotat" description="Vises i versjonshistorikken" size="small" value={note} onChange={(e) => setNote(e.target.value)} style={{ marginTop: 16 }} />
        </Modal.Body>
        <Modal.Footer>
          <Button
            size="small"
            onClick={() => {
              setPublishOpen(false);
              onSave(values, "PUBLISERT", note.trim() || "Oppdatert tekst");
            }}
          >
            Publiser versjon {(published?.version ?? current?.version ?? 0) + 1 + (hasDraft ? -1 : 0)}
          </Button>
          <Button size="small" variant="secondary" onClick={() => setPublishOpen(false)}>
            Avbryt
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

function normalize(t: TextTemplate, v: TextValues): TextValues {
  return Object.fromEntries(t.fields.map((fl) => [fl.key, { en: v[fl.key]?.en ?? "", nb: v[fl.key]?.nb ?? "" }]));
}

function fmtEnDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function Preview({ template, values, lang, ctx, enhetName, inheritedBadge }: { template: TextTemplate; values: TextValues; lang: Lang; ctx: Record<string, string>; enhetName: string; inheritedBadge?: boolean }) {
  const sed = SED_BY_TYPE[template.sed];
  return (
    <div className={styles.preview}>
      <div className={styles.previewTop}>
        <span>
          <EyeIcon aria-hidden /> Forhåndsvisning i nEESSI
        </span>
        {inheritedBadge && <span className={styles.previewBadge}>Standard</span>}
      </div>
      <div className={styles.sedDoc}>
        <div className={styles.sedHead}>
          <span className={styles.sedType}>{template.sed}</span>
          <span>{lang === "en" ? sedNameEn(template.sed) : sed?.name}</span>
        </div>
        <div className={styles.sedMeta}>
          <span>
            <Flag code="SE" /> Försäkringskassan
          </span>
          <span className="mono">{sed?.buc} · 1452290</span>
        </div>
        <div className={styles.sedMeta}>
          <span className="muted">{lang === "en" ? "From" : "Fra"}</span>
          <span>{enhetName}</span>
        </div>
        <div className={styles.sedSection}>{lang === "en" ? template.sectionEn : template.section}</div>
        {template.fields.map((fl) => {
          const text = values[fl.key]?.[lang] ?? "";
          return (
            <div key={fl.key} className={styles.sedField}>
              <div className={styles.sedLabel}>{lang === "en" ? fl.labelEn : fl.label}</div>
              <div className={styles.sedValue}>
                {text ? (
                  fillVariables(text, ctx).map((p, i) =>
                    p.isVar ? (
                      <mark key={i} className={styles.varMark}>
                        {p.text}
                      </mark>
                    ) : (
                      <span key={i}>{p.text}</span>
                    ),
                  )
                ) : (
                  <span className="muted">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function sedNameEn(sed: string) {
  return (
    {
      H001: "Notification/request for information",
      P8000: "Request for information",
      F001: "Request for determination of priority",
      A003: "Decision on applicable legislation",
      U001: "Request for periods for unemployment",
      S080: "Request for cash benefits",
      X009: "Reminder",
      X008: "Invalidate SED",
      X001: "Request for closure",
    }[sed] ?? sed
  );
}

function UsageCard({ template }: { template: TextTemplate }) {
  const u = template.usage;
  const parts = [
    { k: "Sendt uendret", v: u.unchanged, c: "#3a8a5f" },
    { k: "Redigert", v: u.edited, c: "#2a6cb3" },
    { k: "Tømt", v: u.cleared, c: "#c4505c" },
  ];
  return (
    <Card title="Hvordan brukes teksten?" subtitle={`${fmtInt(template.sentLast30)} ${template.sed} sendt siste 30 dager`}>
      <div className={styles.usageBar}>
        {parts.map((p) => (
          <motion.span key={p.k} initial={{ flexGrow: 0 }} animate={{ flexGrow: p.v }} transition={{ duration: 0.8 }} style={{ background: p.c }} title={`${p.k}: ${p.v} %`} />
        ))}
      </div>
      <div className={styles.usageLegend}>
        {parts.map((p) => (
          <div key={p.k}>
            <span className="legend__swatch" style={{ background: p.c }} />
            <strong>{p.v} %</strong> <span className="muted">{p.k.toLowerCase()}</span>
          </div>
        ))}
      </div>
      {u.edited > 40 && (
        <p className={styles.tip}>
          <SparklesIcon aria-hidden /> Over 40 % av saksbehandlerne redigerer denne teksten. Kanskje standarden bør justeres – eller tilpasses per enhet?
        </p>
      )}
    </Card>
  );
}

function History({ versions, todayIso, onLoad }: { versions: TextVersion[]; todayIso: string; onLoad: (v: TextVersion) => void }) {
  if (!versions.length) return null;
  return (
    <Card title="Versjonshistorikk" subtitle={`${versions.length} versjon${versions.length > 1 ? "er" : ""}`}>
      <ol className={styles.history}>
        {versions.map((v, i) => (
          <li key={v.id} className={styles.histItem}>
            <span className={styles.histDot} data-status={v.status} data-first={i === 0} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.histTitle}>
                v{v.version} · {v.note}
              </div>
              <div className="muted" style={{ fontSize: "0.78rem" }}>
                {v.author} · {fmtDaysAgo(diffDays(v.dateIso, todayIso))} · {v.status === "UTKAST" ? "utkast" : "publisert"}
              </div>
            </div>
            {i > 0 && (
              <Button size="xsmall" variant="tertiary" onClick={() => onLoad(v)}>
                Last inn
              </Button>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

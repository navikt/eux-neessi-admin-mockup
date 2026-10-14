import type { ComponentType, SVGProps } from "react";

export type ToolCategory = "Kafka" | "RINA" | "Journalføring" | "Opprydding" | "Cache" | "Katalog";
export type RiskLevel = "lav" | "middels" | "høy";
export type RunStatus = "SUCCESS" | "PARTIAL_SUCCESS" | "FAILURE" | "DRY_RUN";

export type AkselIcon = ComponentType<SVGProps<SVGSVGElement> & { title?: string; titleId?: string }>;

/** What every tool component receives from the workspace. */
export interface ToolComponentProps {
  tool: ToolDefinition;
  onRunComplete: (record: RunRecord) => void;
}

/** One entry in the tool registry (`tools.ts`). Add an entry + a component to ship a new tool. */
export interface ToolDefinition {
  id: string;
  name: string;
  /** One-liner shown on the gallery card. */
  description: string;
  /** Longer explanation shown in the workspace header. */
  details: string;
  category: ToolCategory;
  risk: RiskLevel;
  icon: AkselIcon;
  /** Accent color (hex) used for the icon tile and highlights. */
  color: string;
  /** Extra search words. */
  keywords: string[];
  component: ComponentType<ToolComponentProps>;
}

/** What a finished run reports back for the audit log. */
export interface RunRecord {
  toolId: string;
  status: RunStatus;
  params: string;
  summary: string;
  durationMs: number;
}

export interface AuditEntry extends RunRecord {
  id: string;
  atMs: number;
  who: string;
}

export const CATEGORIES: ToolCategory[] = ["Kafka", "RINA", "Journalføring", "Opprydding", "Cache", "Katalog"];

export const CATEGORY_COLOR: Record<ToolCategory, string> = {
  Kafka: "#6e5a9e",
  RINA: "#2a6cb3",
  Journalføring: "#35787a",
  Opprydding: "#b23a48",
  Cache: "#b07320",
  Katalog: "#2f7a52",
};

export const RISK_META: Record<RiskLevel, { label: string; color: "success" | "warning" | "danger"; hint: string }> = {
  lav: { label: "Lav risiko", color: "success", hint: "Kan kjøres uten bekreftelse" },
  middels: { label: "Middels risiko", color: "warning", hint: "Krever bekreftelse" },
  høy: { label: "Høy risiko", color: "danger", hint: "Krever skriftlig bekreftelse" },
};

export const STATUS_META: Record<RunStatus, { label: string; color: "success" | "warning" | "danger" | "info" }> = {
  SUCCESS: { label: "Suksess", color: "success" },
  PARTIAL_SUCCESS: { label: "Delvis suksess", color: "warning" },
  FAILURE: { label: "Feilet", color: "danger" },
  DRY_RUN: { label: "Tørrkjøring", color: "info" },
};

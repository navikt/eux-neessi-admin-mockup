import { ArrowDownRightIcon, ArrowUpIcon } from "@navikt/aksel-icons";
import type { ComponentType, SVGProps } from "react";
import { CountUp } from "./CountUp";
import { Sparkline } from "./Sparkline";

interface Props {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  color?: string;
  delta?: number;
  /** When true, a negative delta is good (e.g. response times). */
  invertDelta?: boolean;
  deltaLabel?: string;
  spark?: number[];
  foot?: React.ReactNode;
}

export function KpiCard({ label, value, decimals = 0, suffix, icon: Icon, color = "#2f6fb5", delta, invertDelta, deltaLabel, spark, foot }: Props) {
  const good = delta === undefined ? true : invertDelta ? delta <= 0 : delta >= 0;
  return (
    <div className="card card--interactive kpi">
      {Icon ? (
        <div className="kpi__icon" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
          <Icon aria-hidden />
        </div>
      ) : null}
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">
        <CountUp value={value} decimals={decimals} suffix={suffix} />
      </div>
      <div className="kpi__foot">
        {delta !== undefined ? (
          <span className={`delta ${good ? "delta--up" : "delta--down"}`}>
            {delta >= 0 ? <ArrowUpIcon aria-hidden /> : <ArrowDownRightIcon aria-hidden />}
            {Math.abs(delta).toLocaleString("nb-NO", { maximumFractionDigits: 1 })} %
          </span>
        ) : null}
        {deltaLabel ? <span>{deltaLabel}</span> : null}
        {foot}
      </div>
      {spark ? <Sparkline className="kpi__spark" data={spark} color={color} /> : null}
    </div>
  );
}

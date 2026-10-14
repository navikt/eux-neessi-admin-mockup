"use client";

import { fmtInt } from "@/lib/format";

interface Payload {
  name?: string | number;
  value?: number | string | (number | string)[];
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

interface Props {
  active?: boolean;
  payload?: readonly Payload[];
  label?: string | number;
  formatter?: (value: number, name: string) => string;
  labelFormatter?: (label: string | number) => React.ReactNode;
}

export function ChartTooltip({ active, payload, label, formatter, labelFormatter }: Props) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__title">{labelFormatter ? labelFormatter(label ?? "") : label}</div>
      {payload.map((p) => (
        <div className="chart-tooltip__row" key={String(p.dataKey ?? p.name)}>
          <span>
            <span className="legend__swatch" style={{ background: p.color }} />
            {p.name}
          </span>
          <strong className="tabular">
            {formatter ? formatter(Number(p.value), String(p.name)) : fmtInt(Number(p.value))}
          </strong>
        </div>
      ))}
    </div>
  );
}

"use client";

/**
 * Lightweight, dependency-free SVG chart primitives for the admin BI dashboard.
 * All charts are responsive (viewBox based), theme-aware (brand CSS variables +
 * white/opacity), animated with framer-motion, and expose hover tooltips.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Shared brand-friendly palette (kept in sync with globals.css tokens). */
export const CHART_COLORS = [
  "rgb(212 175 55)", // gold / secondary
  "rgb(31 122 77)", // green / primary-light
  "rgb(56 189 248)", // sky
  "rgb(167 139 250)", // violet
  "rgb(251 146 60)", // orange
  "rgb(52 211 153)", // emerald
  "rgb(244 114 182)", // pink
  "rgb(248 113 113)", // red
  "rgb(45 212 191)", // teal
  "rgb(250 204 21)", // yellow
];

const AXIS = "rgb(255 255 255 / 0.10)";
const TICK = "rgb(255 255 255 / 0.45)";

function niceNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

/* -------------------------------------------------------------------------- */
/*  Line chart (multi-series)                                                  */
/* -------------------------------------------------------------------------- */

export type LineSeries = { name: string; color: string; points: number[] };

export function LineChart({
  labels,
  series,
  height = 240,
  formatValue = niceNumber,
  area = true,
}: {
  labels: string[];
  series: LineSeries[];
  height?: number;
  formatValue?: (n: number) => string;
  area?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const W = 820;
  const H = height;
  const padL = 52;
  const padR = 16;
  const padT = 16;
  const padB = 34;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const n = labels.length;
  const allValues = series.flatMap((s) => s.points);
  const rawMax = Math.max(1, ...allValues);
  const max = rawMax * 1.1;
  const min = 0;

  const x = (i: number) => (n <= 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - ((v - min) / (max - min)) * innerH;

  const yTicks = 4;
  const gridVals = Array.from({ length: yTicks + 1 }, (_, i) => min + ((max - min) * i) / yTicks);

  // Reduce x-axis label clutter for dense series.
  const labelStep = Math.ceil(n / 8);

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" preserveAspectRatio="xMidYMid meet">
        {/* horizontal grid + y ticks */}
        {gridVals.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={AXIS} strokeWidth={1} />
            <text x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill={TICK}>
              {formatValue(v)}
            </text>
          </g>
        ))}

        {/* x labels */}
        {labels.map((lab, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <text key={i} x={x(i)} y={H - 12} textAnchor="middle" fontSize={11} fill={TICK}>
              {lab}
            </text>
          ) : null
        )}

        {series.map((s, si) => {
          const line = s.points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p)}`).join(" ");
          const areaPath =
            `M${x(0)},${y(0)} ` +
            s.points.map((p, i) => `L${x(i)},${y(p)}`).join(" ") +
            ` L${x(n - 1)},${y(0)} Z`;
          return (
            <g key={si}>
              {area && (
                <path d={areaPath} fill={s.color} opacity={0.08} />
              )}
              <motion.path
                d={line}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
              />
              {s.points.map((p, i) => (
                <circle
                  key={i}
                  cx={x(i)}
                  cy={y(p)}
                  r={active === i ? 4.5 : 0}
                  fill={s.color}
                  stroke="rgb(0 0 0 / 0.4)"
                  strokeWidth={1.5}
                />
              ))}
            </g>
          );
        })}

        {/* hover crosshair */}
        {active !== null && (
          <line x1={x(active)} x2={x(active)} y1={padT} y2={padT + innerH} stroke="rgb(255 255 255 / 0.25)" strokeDasharray="3 3" />
        )}

        {/* invisible hover regions */}
        {labels.map((_, i) => (
          <rect
            key={i}
            x={i === 0 ? padL : (x(i - 1) + x(i)) / 2}
            width={Math.max(1, i === 0 ? (x(1) - x(0)) / 2 || innerW : ((x(Math.min(i + 1, n - 1)) - x(i - 1)) / 2))}
            y={padT}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          />
        ))}
      </svg>

      {active !== null && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-lg border border-white/10 bg-black/85 px-3 py-2 text-xs shadow-xl backdrop-blur"
          style={{ left: `${(x(active) / W) * 100}%` }}
        >
          <p className="mb-1 font-medium text-white/90">{labels[active]}</p>
          {series.map((s) => (
            <p key={s.name} className="flex items-center gap-1.5 text-white/70">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.name}: <span className="font-semibold text-white">{formatValue(s.points[active] ?? 0)}</span>
            </p>
          ))}
        </div>
      )}

      {series.length > 1 && (
        <div className="mt-2 flex flex-wrap justify-center gap-4">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5 text-xs text-white/60">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bar chart                                                                  */
/* -------------------------------------------------------------------------- */

export type BarDatum = { label: string; value: number; color?: string };

export function BarChart({
  data,
  height = 240,
  formatValue = niceNumber,
}: {
  data: BarDatum[];
  height?: number;
  formatValue?: (n: number) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const W = 820;
  const H = height;
  const padL = 52;
  const padR = 16;
  const padT = 16;
  const padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const max = Math.max(1, ...data.map((d) => d.value)) * 1.1;
  const bandW = innerW / Math.max(1, data.length);
  const barW = Math.min(56, bandW * 0.6);

  const yTicks = 4;
  const gridVals = Array.from({ length: yTicks + 1 }, (_, i) => (max * i) / yTicks);
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" preserveAspectRatio="xMidYMid meet">
        {gridVals.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={AXIS} strokeWidth={1} />
            <text x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill={TICK}>
              {formatValue(v)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const cx = padL + bandW * i + bandW / 2;
          const h = (d.value / max) * innerH;
          const color = d.color ?? CHART_COLORS[i % CHART_COLORS.length];
          return (
            <g
              key={i}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <rect x={padL + bandW * i} y={padT} width={bandW} height={innerH} fill="transparent" />
              <motion.rect
                x={cx - barW / 2}
                width={barW}
                rx={6}
                fill={color}
                opacity={active === null || active === i ? 1 : 0.5}
                initial={{ y: padT + innerH, height: 0 }}
                animate={{ y: padT + innerH - h, height: h }}
                transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.03 }}
              />
              <text x={cx} y={H - 22} textAnchor="middle" fontSize={11} fill={TICK}>
                {d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {active !== null && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-lg border border-white/10 bg-black/85 px-3 py-2 text-xs shadow-xl backdrop-blur"
          style={{ left: `${((padL + bandW * active + bandW / 2) / W) * 100}%` }}
        >
          <p className="font-medium text-white/90">{data[active].label}</p>
          <p className="font-semibold text-white">{formatValue(data[active].value)}</p>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Doughnut chart                                                             */
/* -------------------------------------------------------------------------- */

export type PieDatum = { label: string; value: number; color?: string };

export function DoughnutChart({
  data,
  formatValue = niceNumber,
  centerLabel,
}: {
  data: PieDatum[];
  formatValue?: (n: number) => string;
  centerLabel?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const stroke = 26;
  const circ = 2 * Math.PI * r;

  let offsetAcc = 0;
  const segments = data.map((d, i) => {
    const frac = total > 0 ? d.value / total : 0;
    const seg = {
      d,
      i,
      color: d.color ?? CHART_COLORS[i % CHART_COLORS.length],
      dash: frac * circ,
      offset: offsetAcc,
      pct: frac * 100,
    };
    offsetAcc += frac * circ;
    return seg;
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="max-w-[220px]">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgb(255 255 255 / 0.06)" strokeWidth={stroke} />
          {total > 0 &&
            segments.map((s) => (
              <motion.circle
                key={s.i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={active === s.i ? stroke + 4 : stroke}
                strokeDasharray={`${s.dash} ${circ - s.dash}`}
                strokeDashoffset={-s.offset}
                transform={`rotate(-90 ${cx} ${cy})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                onMouseEnter={() => setActive(s.i)}
                onMouseLeave={() => setActive(null)}
                style={{ cursor: "pointer" }}
              />
            ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {active !== null ? (
            <>
              <span className="text-lg font-bold text-white">{segments[active].pct.toFixed(0)}%</span>
              <span className="max-w-[110px] text-[11px] text-white/60">{data[active].label}</span>
            </>
          ) : (
            <>
              <span className="text-lg font-bold text-white">{formatValue(total)}</span>
              <span className="text-[11px] text-white/60">{centerLabel ?? "Total"}</span>
            </>
          )}
        </div>
      </div>

      <div className="w-full space-y-1.5">
        {data.map((d, i) => (
          <button
            key={d.label}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-2 py-1 text-sm transition",
              active === i ? "bg-white/5" : ""
            )}
          >
            <span className="flex items-center gap-2 text-white/70">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.color ?? CHART_COLORS[i % CHART_COLORS.length] }} />
              {d.label}
            </span>
            <span className="font-medium text-white">
              {formatValue(d.value)}
              <span className="ml-1 text-xs text-white/40">
                {total > 0 ? `${((d.value / total) * 100).toFixed(0)}%` : "0%"}
              </span>
            </span>
          </button>
        ))}
        {total === 0 && <p className="text-sm text-white/50">No data yet.</p>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Heatmap (day-of-week × hour)                                               */
/* -------------------------------------------------------------------------- */

export function Heatmap({
  rows,
  cols,
  values,
  formatCell,
}: {
  rows: string[];
  cols: string[];
  values: number[][];
  formatCell?: (r: string, c: string, v: number) => string;
}) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const max = Math.max(1, ...values.flat());

  return (
    <div className="relative w-full overflow-x-auto">
      <div className="min-w-[560px]">
        {/* header */}
        <div className="flex">
          <div className="w-12 shrink-0" />
          {cols.map((c) => (
            <div key={c} className="flex-1 text-center text-[10px] text-white/40">
              {c}
            </div>
          ))}
        </div>
        {rows.map((rLabel, r) => (
          <div key={rLabel} className="flex items-center">
            <div className="w-12 shrink-0 pr-2 text-right text-[11px] text-white/50">{rLabel}</div>
            {cols.map((cLabel, c) => {
              const v = values[r]?.[c] ?? 0;
              const intensity = v / max;
              return (
                <div key={c} className="flex-1 p-[2px]">
                  <div
                    onMouseEnter={() => setHover({ r, c })}
                    onMouseLeave={() => setHover(null)}
                    className="aspect-square rounded-[3px] transition"
                    style={{
                      background:
                        v === 0
                          ? "rgb(255 255 255 / 0.04)"
                          : `rgb(212 175 55 / ${0.15 + intensity * 0.85})`,
                      outline: hover?.r === r && hover?.c === c ? "1px solid rgba(255,255,255,0.6)" : "none",
                    }}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {hover && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
          {formatCell
            ? formatCell(rows[hover.r], cols[hover.c], values[hover.r]?.[hover.c] ?? 0)
            : `${rows[hover.r]} ${cols[hover.c]}: ${values[hover.r]?.[hover.c] ?? 0}`}
        </div>
      )}
    </div>
  );
}

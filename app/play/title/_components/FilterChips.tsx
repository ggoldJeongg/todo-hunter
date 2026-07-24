"use client";

import { STAT_META, STAT_ORDER, type StatKey } from "./statMeta";

export type FilterValue = "all" | StatKey;

type Props = {
  value: FilterValue;
  onChange: (next: FilterValue) => void;
  totalAll: number;
  totalByStat: Record<StatKey, number>;
  unlockedByStat: Record<StatKey, number>;
};

function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-galmuri11-bold cursor-pointer"
      style={{
        flexShrink: 0,
        padding: "3px 9px",
        fontSize: 10,
        background: active ? color : "rgba(233,227,215,0.9)",
        color: active ? (color === "#151413" ? "#E9E3D7" : "#fff") : "#151413",
        border: "1.5px solid #151413",
        boxShadow: active ? "0 2px 0 #151413" : "0 1px 0 rgba(21,20,19,0.35)",
        transform: active ? "translateY(-1px)" : "none",
      }}
    >
      {children}
    </button>
  );
}

export default function FilterChips({
  value, onChange, totalAll, totalByStat, unlockedByStat,
}: Props) {
  return (
    <div
      className="flex"
      style={{
        gap: 4,
        margin: "0 auto 8px",
        maxWidth: "calc(100% - 24px)",
        width: "fit-content",
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <Chip active={value === "all"} color="#151413" onClick={() => onChange("all")}>
        전체 {totalAll}
      </Chip>
      {STAT_ORDER.map(key => {
        const meta = STAT_META[key];
        return (
          <Chip
            key={key}
            active={value === key}
            color={meta.color}
            onClick={() => onChange(key)}
          >
            {meta.label} {unlockedByStat[key]}/{totalByStat[key]}
          </Chip>
        );
      })}
    </div>
  );
}

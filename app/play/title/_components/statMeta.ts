export type StatKey = "str" | "int" | "emo" | "fin" | "liv";

export interface StatMeta {
  label: string;
  short: string;
  color: string;
  icon: string;
}

export const STAT_META: Record<StatKey, StatMeta> = {
  str: { label: "체력",   short: "STR", color: "#C84B3A", icon: "/icons/heart.png" },
  int: { label: "지력",   short: "INT", color: "#3D6FB6", icon: "/icons/brain.png" },
  emo: { label: "감성",   short: "EMO", color: "#B5538C", icon: "/icons/smile.png" },
  fin: { label: "경제력", short: "FIN", color: "#C9A234", icon: "/icons/coin.png"  },
  liv: { label: "생활력", short: "LIV", color: "#3E8B75", icon: "/icons/star.png"  },
};

export const STAT_ORDER: StatKey[] = ["str", "int", "emo", "fin", "liv"];

export const isStatKey = (s: string): s is StatKey =>
  s === "str" || s === "int" || s === "emo" || s === "fin" || s === "liv";

export const TIER_BY_REQ_VALUE: Record<number, number> = { 1: 1, 5: 2, 10: 3 };

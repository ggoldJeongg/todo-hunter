import Image from "next/image";

// 6 스탯 바 매핑 — 기존 게임 스탯 라벨 + PNG 아이콘 사용
//   체력=STR, 지력=INT, 감성=EMO, 경제력=FIN, 생활력=LIV
//   스트레스 = willpower (사용자 정의: willpower 컬럼이 곧 스트레스)

interface StatusProps {
  str: number;
  int: number;
  emo: number;
  fin: number;
  liv: number;
  stress: number; // 0-100, willpower 그대로 전달됨
}

interface StatDef {
  key: string;
  icon: string | null; // PNG 경로 (없으면 null → emoji 사용)
  emoji?: string; // PNG 없는 스탯의 fallback
  color: string;
}

const STATS: StatDef[] = [
  { key: "체력",   icon: "/icons/heart.png", color: "#E07A82" },
  { key: "지력",   icon: "/icons/brain.png", color: "#6B8FB8" },
  { key: "감성",   icon: "/icons/smile.png", color: "#E89BB5" },
  { key: "경제력", icon: "/icons/coin.png",  color: "#6AAF6A" },
  { key: "생활력", icon: "/icons/star.png",  color: "#E0A04E" },
  { key: "스트레스", icon: null, emoji: "😈", color: "#9E7AC0" },
];

const MAX = 100;

const Status = ({ str, int, emo, fin, liv, stress }: StatusProps) => {
  // STATS 배열 순서대로 값 매핑: str, int, emo, fin, liv, stress
  const values = [str, int, emo, fin, liv, stress];

  return (
    <div className="stat-list">
      {STATS.map(({ key, icon, emoji, color }, i) => {
        const value = Math.max(0, Math.min(MAX, values[i] ?? 0));
        const pct = (value / MAX) * 100;
        return (
          <div key={key} className="stat-row">
            <div className="stat-icon-box">
              {icon ? (
                <Image
                  src={icon}
                  alt={key}
                  width={20}
                  height={20}
                  unoptimized
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <span style={{ fontSize: 16 }}>{emoji}</span>
              )}
            </div>
            <span className="stat-label">{key}</span>
            <div className="stat-bar-track">
              <div
                className="stat-bar-fill"
                style={{
                  width: `${pct}%`,
                  background: color,
                }}
              />
              <span className="stat-bar-value-overlay">
                {value}/{MAX}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Status;

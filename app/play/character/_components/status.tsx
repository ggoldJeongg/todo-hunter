import Image from "next/image";

// 6 스탯 바 — 다크 패널 위. 아이콘 · 라벨 · 게이지 · 수치 · 설명 한 줄.
//   체력=STR, 지력=INT, 매력=EMO, 경제력=FIN, 생활력=LIV
//   스트레스 = willpower 의 역계산값 (page.tsx 에서 계산해 전달)

interface StatusProps {
  str: number;
  int: number;
  emo: number;
  fin: number;
  liv: number;
  stress: number;
}

interface StatDef {
  key: string;
  icon: string | null;
  emoji?: string;
  color: string;
  desc: string;
}

// 아이콘은 배경 벗겨낸 사본 (npm run icons:strip).
const STATS: StatDef[] = [
  { key: "체력", icon: "/icons/stats/heart.png", color: "#E07A82", desc: "건강과 관련된 활동" },
  { key: "지력", icon: "/icons/stats/brain.png", color: "#6B8FB8", desc: "지식 습득, 학습" },
  { key: "매력", icon: "/icons/stats/smile.png", color: "#E89BB5", desc: "외면/내면을 가꾸는 활동" },
  { key: "경제력", icon: "/icons/stats/coin.png", color: "#6AAF6A", desc: "자산과 관련된 활동" },
  { key: "생활력", icon: "/icons/stats/star.png", color: "#E0A04E", desc: "일상을 꾸려가는 능력" },
  { key: "스트레스", icon: "/icons/stress.svg", color: "#9E7AC0", desc: "높을수록 위험합니다." },
];

const MAX = 100;

const Status = ({ str, int, emo, fin, liv, stress }: StatusProps) => {
  const values = [str, int, emo, fin, liv, stress];

  return (
    <ul className="flex flex-col gap-[10px]">
      {STATS.map(({ key, icon, emoji, color, desc }, i) => {
        const value = Math.max(0, Math.min(MAX, values[i] ?? 0));
        const pct = (value / MAX) * 100;
        return (
          <li key={key} className="flex items-center gap-[8px]">
            {/* 아이콘 배지 — 어두운 ink 배지 위에 컬러 아이콘 */}
            <span className="grid h-[22px] w-[22px] shrink-0 place-items-center bg-ink">
              {icon ? (
                <Image
                  src={icon}
                  alt=""
                  width={20}
                  height={20}
                  className="[image-rendering:pixelated]"
                  unoptimized
                />
              ) : (
                <span className="text-[11px] leading-none">{emoji}</span>
              )}
            </span>

            <span className="w-[52px] shrink-0 whitespace-nowrap text-[12px] font-bold leading-none text-ink">
              {key}
            </span>

            {/* 게이지 — 어두운 트랙 + 지표색 채움 (라운드 필) */}
            <div
              className="relative h-[12px] w-[92px] shrink-0 overflow-hidden bg-ink"
              role="meter"
              aria-label={key}
              aria-valuenow={value}
              aria-valuemin={0}
              aria-valuemax={MAX}
            >
              <div className="h-full" style={{ width: `${pct}%`, background: color }} />
            </div>

            <span className="w-[26px] shrink-0 text-right text-[12px] font-bold leading-none tabular-nums text-ink">
              {value}
            </span>

            {/* 설명 — 남는 폭에서 말줄임 */}
            <span className="hidden min-w-0 flex-1 truncate text-[10px] leading-none text-stone min-[380px]:block">
              {desc}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export default Status;

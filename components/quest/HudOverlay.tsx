"use client";

import { useQuestStore } from "@/utils/stores/questStore";
import { useUserStore } from "@/utils/stores/userStore";

const HudBox = ({
  name,
  current,
  max,
  color,
}: {
  name: string;
  current: number;
  max: number;
  color: string;
}) => {
  const ratio = max > 0 ? Math.min(current / max, 1) : 0;
  return (
    <div className="min-w-[110px] bg-[rgba(0,0,0,0.55)] rounded px-2 py-1.5">
      <div className="text-[9px] font-bold mb-0.5 text-white text-center drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
        {name}
      </div>
      <div className="flex items-center gap-1">
        <div className="flex-1 h-[5px] bg-[rgba(255,255,255,0.15)] rounded-sm overflow-hidden">
          <div
            className="h-full transition-all duration-500 rounded-sm"
            style={{ width: `${ratio * 100}%`, background: color }}
          />
        </div>
        <span className="text-[7px] text-white/70 min-w-[24px] text-right">
          {current}/{max}
        </span>
      </div>
    </div>
  );
};

interface HudOverlayProps {
  mapName: string;
  monsterName: string;
}

const HudOverlay = ({ mapName, monsterName }: HudOverlayProps) => {
  const { isDefeated, killCount, monsterHp, monsterMaxHp } = useQuestStore();
  const { nickname, level, willpower, maxWillpower } = useUserStore();

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* 맵 이름 + 처치 카운트 — 상단 중앙 */}
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <span className="text-[10px] font-bold tracking-widest text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] uppercase">
          ⚔ {mapName} ⚔
        </span>
        {killCount > 0 && (
          <span className="text-[9px] font-bold text-yellow-300/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            💀 {killCount}
          </span>
        )}
      </div>

      {/* HP 바 — 상단 좌우 */}
      <div className="absolute top-5 left-0 right-0 flex justify-between px-3">
        <HudBox
          name={`Lv.${level ?? 1} ${nickname ?? "플레이어"}`}
          current={willpower ?? 100}
          max={maxWillpower ?? 100}
          color="#4ade80"
        />
        <HudBox
          name={isDefeated ? "DEFEATED" : monsterName}
          current={monsterHp}
          max={monsterMaxHp}
          color="#f87171"
        />
      </div>
    </div>
  );
};

export default HudOverlay;

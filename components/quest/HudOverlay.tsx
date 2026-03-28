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
    <div className="two-step-border min-w-[130px] bg-[#2D3748] !p-1.5 !m-0.5">
      <div className="text-[10px] font-bold mb-1 text-white">{name}</div>
      <div className="flex items-center gap-1">
        <span className="text-[8px] font-bold" style={{ color }}>
          HP
        </span>
        <div className="flex-1 h-[7px] is-rounded-progress !m-0 !border-2 bg-[#e0e0e0]">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${ratio * 100}%`, background: color }}
          />
        </div>
        <span className="text-[8px] text-[#aaa] min-w-[30px] text-right">
          {current}/{max}
        </span>
      </div>
    </div>
  );
};

const HudOverlay = () => {
  const { quests, isDefeated } = useQuestStore();
  const { nickname, level, willpower, maxWillpower } = useUserStore();

  const totalQuests = quests.length;
  const completedQuests = quests.filter((q) => q.completed).length;
  const monsterHp = totalQuests - completedQuests;

  return (
    <div className="absolute top-0 w-full flex justify-between px-3 py-2 z-10">
      <HudBox
        name={`Lv.${level ?? 1} ${nickname ?? "플레이어"}`}
        current={willpower ?? 100}
        max={maxWillpower ?? 100}
        color="#4ade80"
      />
      <HudBox
        name={isDefeated ? "DEFEATED" : "Werewolf"}
        current={monsterHp}
        max={totalQuests}
        color="#f87171"
      />
    </div>
  );
};

export default HudOverlay;

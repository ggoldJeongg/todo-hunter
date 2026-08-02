"use client";

import { useQuestStore } from "@/utils/stores/questStore";
import { useUserStore } from "@/utils/stores/userStore";
import StatBar from "@/components/common/StatBar";

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
  return (
    <div
      className="min-w-[120px] max-w-[150px] bg-black px-2 py-1"
      style={{
        // 둥근 프레임 + 흰 테두리. 안쪽에 매끈한 pill 프로그레스 바.
        border: "3px solid #ffffff",
        borderRadius: "10px",
        boxShadow:
          "inset 0 0 0 1px rgba(0,0,0,1), 2px 2px 0 rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="text-[9px] font-bold mb-1 text-white text-center break-words"
        style={{
          fontFamily: "Galmuri11Bold, monospace",
          letterSpacing: "0.5px",
          textShadow: "1px 1px 0 #000",
          wordBreak: "keep-all",
          whiteSpace: "normal",
          lineHeight: "1.2",
        }}
      >
        {name}
      </div>
      <div className="flex items-center gap-1.5">
        <StatBar
          value={current}
          max={max}
          color={color}
          height={9}
          className="flex-1"
          ariaLabel={name}
        />
        <span
          className="text-[7px] text-white/85 min-w-[30px] text-right tabular-nums"
          style={{ fontFamily: "Galmuri11Bold, monospace" }}
        >
          {current}/{max}
        </span>
      </div>
    </div>
  );
};

interface HudOverlayProps {
  /** 맵 이름 — 두루마리 배너 제거로 현재 미표시 (FightField 가 계속 전달) */
  mapName?: string;
  monsterName: string;
}

const HudOverlay = ({ monsterName }: HudOverlayProps) => {
  const { isDefeated, killCount, monsterHp, monsterMaxHp } = useQuestStore();
  const { nickname, level, willpower, maxWillpower } = useUserStore();

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* 처치 카운트 — 상단 중앙 (맵 이름 두루마리는 프레임과 겹쳐 제거) */}
      {killCount > 0 && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2">
          <span className="text-[9px] font-bold text-yellow-300/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            💀 {killCount}
          </span>
        </div>
      )}

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

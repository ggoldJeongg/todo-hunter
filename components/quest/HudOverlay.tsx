"use client";

import { useQuestStore } from "@/utils/stores/questStore";
import { useUserStore } from "@/utils/stores/userStore";

const SEGMENTS = 10;

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
  const filled = Math.ceil(ratio * SEGMENTS);
  return (
    <div
      className="min-w-[120px] max-w-[140px] bg-black px-2 py-0.5"
      style={{
        // 픽셀 게임 스타일: 단단한 흰 테두리 + inner shadow로 두께감
        border: "2px solid #ffffff",
        boxShadow:
          "inset 0 0 0 1px rgba(0,0,0,1), inset 2px 2px 0 rgba(255,255,255,0.12), 2px 2px 0 rgba(0,0,0,0.6)",
        imageRendering: "pixelated",
      }}
    >
      <div
        className="text-[9px] font-bold mb-0.5 text-white text-center break-words"
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
      <div className="flex items-center gap-1">
        <div className="flex gap-[1px] flex-1">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <div
              key={i}
              className="flex-1 h-[7px] transition-colors duration-200"
              style={{
                background: i < filled ? color : "#1a1a1a",
                boxShadow:
                  i < filled
                    ? "inset 0 -2px 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)"
                    : "inset 0 0 0 1px rgba(255,255,255,0.05)",
              }}
            />
          ))}
        </div>
        <span
          className="text-[7px] text-white/80 min-w-[28px] text-right tabular-nums"
          style={{ fontFamily: "Galmuri11Bold, monospace" }}
        >
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
      {/* 맵 이름 + 처치 카운트 — 상단 중앙 (네임태그 이미지 배경) */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div
          className="flex items-center justify-center"
          style={{
            backgroundImage: "url('/images/backgrounds/map_title.png')",
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            width: "120px",
            height: "42px",
            paddingTop: "4px",
          }}
        >
          <span
            className="text-[10px] font-bold tracking-widest text-black uppercase"
            style={{ fontFamily: "Galmuri11Bold, monospace" }}
          >
            {mapName}
          </span>
        </div>
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

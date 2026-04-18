"use client";

import React, { useMemo } from "react";
import CharacterMotion from "./CharactersMotion";
import { useQuestStore } from "@/utils/stores/questStore";
import useProgressStore from "@/utils/stores/useProgressStore";
import type { LayerConfig } from "@/utils/sprite/SpriteLayerRenderer";

const IDLE_PATH = "/images/asprites/char_a_p1";
const ATTACK_PATH = "/images/asprites/char_a_pONE1";

const RetroBox = ({ children }: { children: React.ReactNode }) => (
  <div
    className="relative min-w-[130px]"
    style={{
      background: "#101040",
      border: "3px solid #e8e8e8",
      outline: "3px solid #484888",
      boxShadow: "inset 2px 2px 0 #2828a0, inset -2px -2px 0 #080830",
      padding: "6px 10px",
      imageRendering: "pixelated",
    }}
  >
    {children}
  </div>
);

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
  const ratio = max > 0 ? current / max : 0;
  return (
    <RetroBox>
      <div className="text-[10px] font-bold mb-1 text-white" style={{ textShadow: "1px 1px 0 #000" }}>
        {name}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[8px] font-bold text-[#ffd700]">HP</span>
        <div
          className="flex-1 h-[7px]"
          style={{
            background: "#080830",
            border: "1px solid #484888",
          }}
        >
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${ratio * 100}%`,
              background: color,
              imageRendering: "pixelated",
            }}
          />
        </div>
        <span className="text-[8px] text-[#aaa] min-w-[30px] text-right">
          {current}/{max}
        </span>
      </div>
    </RetroBox>
  );
};

const FightField = () => {
  const {
    quests,
    isMoving,
    isMovingForward,
    isAttacking,
    isDefeated,
    setDefeated,
  } = useQuestStore();
  const { progress } = useProgressStore();

  const totalQuests = quests.length;
  const completedQuests = quests.filter((q) => q.completed).length;
  const monsterHp = totalQuests - completedQuests;

  React.useEffect(() => {
    if (progress >= 100) {
      setDefeated(true);
    }
  }, [progress, setDefeated]);

  const playerSpriteLayers: LayerConfig[] = useMemo(
    () => [
      { src: `${IDLE_PATH}/char_a_p1_0bas_humn_v00.png` },
      { src: `${IDLE_PATH}/1out/char_a_p1_1out_fstr_v01.png` },
      { src: `${IDLE_PATH}/4har/char_a_p1_4har_bob1_v01.png` },
    ],
    []
  );

  const playerAttackSpriteLayers: LayerConfig[] = useMemo(
    () => [
      { src: `${ATTACK_PATH}/char_a_pONE1_0bas_humn_v00.png` },
      { src: `${ATTACK_PATH}/1out/char_a_pONE1_1out_fstr_v01.png` },
      { src: `${ATTACK_PATH}/4har/char_a_pONE1_4har_bob1_v01.png` },
      { src: `${ATTACK_PATH}/6tla/char_a_pONE1_6tla_sw01_v01.png` },
    ],
    []
  );

  const playerIdleFrames = [
    "/images/characters/player/idle01.png",
    "/images/characters/player/idle02.png",
    "/images/characters/player/idle03.png",
    "/images/characters/player/idle04.png",
  ];

  const playerAttackFrames = [
    "/images/characters/player/attack1.png",
    "/images/characters/player/attack2.png",
    "/images/characters/player/attack3.png",
    "/images/characters/player/attack4.png",
  ];

  const werewolfIdleFrames = [
    "/images/characters/werewolf/werewolf-idle1.png",
    "/images/characters/werewolf/werewolf-idle2.png",
    "/images/characters/werewolf/werewolf-idle3.png",
  ];

  return (
    <div className="relative w-full overflow-hidden">
      {/* 상단 도트 체크 테두리 */}
      <div
        className="w-full h-[8px]"
        style={{
          background: "repeating-conic-gradient(rgba(0,0,0,0.15) 0% 25%, rgba(255,255,255,0.15) 0% 50%) 0 0 / 8px 8px",
          imageRendering: "pixelated",
        }}
      />
      {/* 전투 영역 */}
      <div className="relative h-[192px] overflow-hidden">
      {/* 밤하늘 */}
      <div
        className="absolute top-0 w-full h-[120px]"
        style={{
          background: "linear-gradient(180deg, #0f0c29, #302b63, #24243e)",
        }}
      />

      {/* 별 */}
      <div
        className="absolute top-2 w-full h-[40px]"
        style={{
          background: `
            radial-gradient(1px 1px at 20px 15px, #fff, transparent),
            radial-gradient(1px 1px at 80px 25px, #fff, transparent),
            radial-gradient(1px 1px at 150px 10px, #fff, transparent),
            radial-gradient(1px 1px at 220px 30px, #fff, transparent),
            radial-gradient(1px 1px at 300px 18px, #fff, transparent),
            radial-gradient(1px 1px at 350px 8px, #fff, transparent)
          `,
        }}
      />

      {/* 타일 바닥 */}
      <div
        className="absolute bottom-0 w-full h-[80px] border-t-2 border-[#3a3a5a]"
        style={{
          background:
            "repeating-linear-gradient(90deg, #2a2a4a 0px, #2a2a4a 16px, #252545 16px, #252545 32px)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent 0px, transparent 16px, rgba(255,255,255,0.03) 16px, rgba(255,255,255,0.03) 17px)",
          }}
        />
      </div>

      {/* HUD — 좌상단 플레이어 / 우상단 몬스터 */}
      <div className="absolute top-0 w-full flex justify-between px-3 py-2 z-10">
        <HudBox
          name="Lv.5 운영자"
          current={80}
          max={100}
          color="#4ade80"
        />
        <HudBox
          name={isDefeated ? "DEFEATED" : "Werewolf"}
          current={monsterHp}
          max={totalQuests}
          color="#f87171"
        />
      </div>

      {/* 플레이어 */}
      <CharacterMotion
        idleFrames={playerIdleFrames}
        attackFrames={playerAttackFrames}
        alt="Player"
        top="55%"
        left="25%"
        isMoving={isMoving}
        isMovingForward={isMovingForward}
        isAttacking={isAttacking}
        useCanvas={true}
        spriteLayers={playerSpriteLayers}
        spriteIdleFrame={48}
        attackSpriteLayers={playerAttackSpriteLayers}
        attackSpriteFrames={[0, 1, 2, 3, 4, 5, 6, 7]}
      />

      {/* 몬스터 */}
      <CharacterMotion
        idleFrames={werewolfIdleFrames}
        alt="Werewolf"
        top="50%"
        left="72%"
        flip={true}
        isShaking={isAttacking}
        isDefeated={isDefeated}
        attackFrames={[]}
      />
      </div>
      {/* 하단 도트 체크 테두리 */}
      <div
        className="w-full h-[8px]"
        style={{
          background: "repeating-conic-gradient(rgba(0,0,0,0.15) 0% 25%, rgba(255,255,255,0.15) 0% 50%) 0 0 / 8px 8px",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
};

export default FightField;

"use client";

import React, { useRef, useEffect } from "react";
import HudOverlay from "./HudOverlay";
import { useQuestStore } from "@/utils/stores/questStore";
import { BATTLE_THEMES, type BattleThemeId } from "@/utils/pixi/BattleThemes";
import { getMonsterByKillCount } from "@/utils/pixi/MonsterRegistry";

interface FightFieldProps {
  theme?: BattleThemeId;
}

const FightField = ({ theme = "night" }: FightFieldProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    destroy: () => void;
    setTheme: (id: BattleThemeId) => void;
    swapMonster: (killCount: number) => Promise<void>;
  } | null>(null);

  const { killCount, isAttacking } = useQuestStore();

  // 몬스터 교체는 PixiBattleScene이 "부활(다음 젠)" 시점에 직접 처리한다.
  // killCount는 처치 즉시 증가하므로 여기서 swap하면 die 애니메이션이 다음 몬스터 걸로 나옴.

  // 런타임 테마 변경
  useEffect(() => {
    sceneRef.current?.setTheme(theme);
  }, [theme]);

  // PixiJS 씬 초기화 — 마운트 시 1회 (swordsman 단일 스프라이트라 외형 의존 없음)
  useEffect(() => {
    let destroyed = false;

    (async () => {
      const { PixiBattleScene } = await import(
        "@/utils/pixi/PixiBattleScene"
      );
      if (destroyed) return;

      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const width = container.clientWidth;
      const height = 192;

      const scene = new PixiBattleScene();
      await scene.init(canvas, width, height, theme);
      if (destroyed) {
        scene.destroy();
        return;
      }
      sceneRef.current = scene;

      // 반응형 리사이즈
      const ro = new ResizeObserver((entries) => {
        const w = entries[0].contentRect.width;
        scene.resize(w, 192);
      });
      ro.observe(container);

      // cleanup에 ResizeObserver 해제 추가
      const originalDestroy = scene.destroy.bind(scene);
      scene.destroy = () => {
        ro.disconnect();
        originalDestroy();
      };
    })();

    return () => {
      destroyed = true;
      sceneRef.current?.destroy();
      sceneRef.current = null;
    };
    // 마운트 시 1회만 init. theme 변경은 별도 useEffect의 setTheme 으로 처리.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentMonster = getMonsterByKillCount(killCount);

  return (
    <div className="relative w-full overflow-hidden">
      {/* 전투 영역 */}
      <div ref={containerRef} className="relative h-[192px] overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: "pixelated" }}
        />

        {/* B: 비네트(가장자리 어둡게) — 캐릭터/몬스터에 시선 집중 */}
        <div
          className="absolute inset-0 pointer-events-none z-[5]"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.6) 100%)",
          }}
        />

        <HudOverlay
          mapName={BATTLE_THEMES[theme].name}
          monsterName={currentMonster.name}
        />
      </div>

      {/* A: 집중선 — 공격 순간에만 번쩍 표시 (평소엔 깨끗한 들판) */}
      <div
        className={`absolute inset-0 pointer-events-none z-30 transition-opacity duration-100 ${
          isAttacking ? "opacity-100" : "opacity-0"
        }`}
        style={{
          backgroundImage: "url('/images/backgrounds/cartoon_style_bg.png')",
          backgroundSize: "130% 130%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          filter: "invert(1)",
        }}
      />
    </div>
  );
};

export default FightField;

"use client";

import React, { useRef, useEffect } from "react";
import HudOverlay from "./HudOverlay";
import { useQuestStore } from "@/utils/stores/questStore";
import useProgressStore from "@/utils/stores/useProgressStore";
import type { BattleThemeId } from "@/utils/pixi/BattleThemes";

const PIXELATED_BORDER = {
  background:
    "repeating-conic-gradient(rgba(0,0,0,0.15) 0% 25%, rgba(255,255,255,0.15) 0% 50%) 0 0 / 8px 8px",
  imageRendering: "pixelated" as const,
};

interface FightFieldProps {
  theme?: BattleThemeId;
}

const FightField = ({ theme = "night" }: FightFieldProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ destroy: () => void; setTheme: (id: BattleThemeId) => void } | null>(null);

  const { progress } = useProgressStore();
  const { setDefeated } = useQuestStore();

  // progress >= 100 시 defeat 처리
  useEffect(() => {
    if (progress >= 100) {
      setDefeated(true);
    }
  }, [progress, setDefeated]);

  // 런타임 테마 변경
  useEffect(() => {
    sceneRef.current?.setTheme(theme);
  }, [theme]);

  // PixiJS 씬 초기화
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
  }, []);

  return (
    <div className="relative w-full overflow-hidden">
      {/* 상단 도트 체크 테두리 */}
      <div className="w-full h-[8px]" style={PIXELATED_BORDER} />

      {/* 전투 영역 */}
      <div ref={containerRef} className="relative h-[192px] overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: "pixelated" }}
        />
        <HudOverlay />
      </div>

      {/* 하단 도트 체크 테두리 */}
      <div className="w-full h-[8px]" style={PIXELATED_BORDER} />
    </div>
  );
};

export default FightField;

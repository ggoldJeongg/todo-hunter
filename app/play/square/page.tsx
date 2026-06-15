"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/utils/stores/userStore";
import { useQuestStore } from "@/utils/stores/questStore";
import { FEATURES } from "@/constants/features";
import { NPC_USERS } from "./_components/NpcData";
import FocusTimer from "./_components/FocusTimer";
import SharedQuestSelector from "./_components/SharedQuestSelector";
import ChatArea from "./_components/ChatArea";
import RestActivityModal from "./_components/RestActivityModal";
import RouletteModal from "./_components/RouletteModal";
import type { PixiSquareScene } from "@/utils/pixi/PixiSquareScene";

// NPC 기준 위치 (맵 % 기준) — 마스크 로드 후 scene이 걸어갈 수 있는 점으로 보정
const NPC_POSITIONS = [
  { x: 15, y: 55 }, // 왼쪽 노점
  { x: 82, y: 50 }, // 오른쪽 노점
  { x: 40, y: 48 }, // 분수 왼쪽
  { x: 60, y: 58 }, // 분수 오른쪽
];

// 피처 플래그 OFF 시 직접 URL 접근 방어 — 캐릭터 페이지로 리다이렉트
function PlazaDisabledRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/play/character");
  }, [router]);
  return null;
}

export default function SquarePage() {
  if (!FEATURES.PLAZA) return <PlazaDisabledRedirect />;
  return <SquarePageContent />;
}

function SquarePageContent() {
  const { fetchUser } = useUserStore();
  const { fetchQuests } = useQuestStore();

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [restModalOpen, setRestModalOpen] = useState(false);
  const [rouletteModalOpen, setRouletteModalOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PixiSquareScene | null>(null);

  useEffect(() => {
    fetchUser();
    fetchQuests();
  }, [fetchUser, fetchQuests]);

  // PixiJS 광장 씬 초기화 — 마운트 시 1회 (전투 화면과 동일한 Pixi 렌더링 스택)
  useEffect(() => {
    let destroyed = false;

    (async () => {
      const { PixiSquareScene } = await import("@/utils/pixi/PixiSquareScene");
      if (destroyed) return;

      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      const scene = new PixiSquareScene();
      await scene.init(canvas, width, height, {
        npcs: NPC_USERS,
        npcBasePositions: NPC_POSITIONS,
        onPlayerClick: () => setSelectorOpen(true),
        onNpcClick: (action) => {
          if (action === "roulette") setRouletteModalOpen(true);
          else if (action === "rest") setRestModalOpen(true);
        },
      });
      if (destroyed) {
        scene.destroy();
        return;
      }
      sceneRef.current = scene;

      const ro = new ResizeObserver((entries) => {
        const { width: w, height: h } = entries[0].contentRect;
        if (w > 0 && h > 0) scene.resize(w, h);
      });
      ro.observe(container);

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
    // 마운트 시 1회만 init.
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#3A2814]">
      {/* 게임 월드 (배경 + 캐릭터 + 카메라) = Pixi 캔버스 */}
      <div ref={containerRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ imageRendering: "pixelated" }}
        />
      </div>

      {/* 고정 HUD — 화면 기준 (전투 화면의 HudOverlay와 동일하게 DOM 유지) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
        <FocusTimer />
      </div>

      <div className="absolute bottom-16 left-4 right-4 z-30">
        <ChatArea />
      </div>

      {/* 모달 */}
      <SharedQuestSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
      />
      <RestActivityModal
        open={restModalOpen}
        onClose={() => setRestModalOpen(false)}
      />
      <RouletteModal
        open={rouletteModalOpen}
        onClose={() => setRouletteModalOpen(false)}
      />
    </div>
  );
}

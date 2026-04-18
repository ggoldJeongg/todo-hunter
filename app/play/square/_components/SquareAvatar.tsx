"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  loadLayers,
  renderLayers,
  type LayerConfig,
  type SpriteSheet,
} from "@/utils/sprite/SpriteLayerRenderer";
import type { SquareUser } from "./NpcData";
import { STATUS } from "@/constants";

const BASE_PATH = "/images/asprites/char_a_p1";

const DEFAULT_LAYERS: LayerConfig[] = [
  { src: `${BASE_PATH}/char_a_p1_0bas_humn_v00.png` },
  { src: `${BASE_PATH}/1out/char_a_p1_1out_fstr_v01.png` },
  { src: `${BASE_PATH}/4har/char_a_p1_4har_bob1_v01.png` },
];

const AVATAR_SIZE = 120;

// 걷기 애니메이션 프레임 (스프라이트 시트 1행: 0~7)
const WALK_FRAMES = [0, 1, 2, 3, 4, 5, 6, 7];
const WALK_FRAME_INTERVAL = 150; // ms

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface SquareAvatarProps {
  user: SquareUser;
  isWalking?: boolean;
  facingLeft?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export default function SquareAvatar({
  user,
  isWalking = false,
  facingLeft = false,
  onClick,
}: SquareAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sheetsRef = useRef<SpriteSheet[]>([]);
  const frameRef = useRef(0);
  const animRef = useRef<number | null>(null);
  const lastFrameTime = useRef(0);

  const renderFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || sheetsRef.current.length === 0) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (facingLeft) {
      ctx.translate(AVATAR_SIZE, 0);
      ctx.scale(-1, 1);
    }

    renderLayers(ctx, sheetsRef.current, frameIndex, AVATAR_SIZE, AVATAR_SIZE);
    ctx.restore();
  }, [facingLeft]);

  // 스프라이트 로드
  useEffect(() => {
    loadLayers(DEFAULT_LAYERS).then((sheets) => {
      sheetsRef.current = sheets;
      renderFrame(0);
    });
  }, [renderFrame]);

  // 걷기 애니메이션 루프
  useEffect(() => {
    if (!isWalking) {
      // 정지 시 idle 프레임으로 복귀
      frameRef.current = 0;
      renderFrame(0);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const animate = (timestamp: number) => {
      if (timestamp - lastFrameTime.current >= WALK_FRAME_INTERVAL) {
        lastFrameTime.current = timestamp;
        frameRef.current =
          (frameRef.current + 1) % WALK_FRAMES.length;
        renderFrame(WALK_FRAMES[frameRef.current]);
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isWalking, renderFrame]);

  return (
    <div
      className="flex flex-col items-center gap-0.5 cursor-pointer select-none"
      onClick={onClick}
    >
      {/* 정보 오버레이 (아바타 머리 위) */}
      <div className="flex flex-col items-center gap-0.5 min-w-[100px]">
        {/* 공유 퀘스트 */}
        {user.sharedQuest && (
          <div className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full truncate max-w-[130px] text-center">
            {user.sharedQuest.name}
            <span className="ml-1 text-yellow-300">
              {STATUS[user.sharedQuest.tagged as keyof typeof STATUS] ?? ""}
            </span>
          </div>
        )}

        {/* 집중시간 */}
        <div
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
            user.isRunning
              ? "bg-green-500/80 text-white"
              : "bg-gray-500/60 text-gray-200"
          }`}
        >
          {user.isRunning ? "🟢" : "⏸"} {formatTime(user.focusSeconds)}
        </div>

        {/* 레벨 + 닉네임 */}
        <div className="flex items-center gap-1">
          <span className="bg-[#C84B3A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            Lv.{user.level}
          </span>
          <span className="text-white text-xs font-semibold drop-shadow-md">
            {user.nickname}
          </span>
        </div>
      </div>

      {/* 캐릭터 아바타 */}
      <canvas
        ref={canvasRef}
        width={AVATAR_SIZE}
        height={AVATAR_SIZE}
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}

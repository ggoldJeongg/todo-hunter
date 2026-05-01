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
import type { Direction } from "@/utils/stores/squareStore";

const BASE_PATH = "/images/asprites/char_a_p1";

const DEFAULT_BODY_SRC = `${BASE_PATH}/char_a_p1_0bas_humn_v00.png`;
const DEFAULT_OUTFIT_SRC = `${BASE_PATH}/1out/char_a_p1_1out_fstr_v01.png`;
const DEFAULT_HAIR_SRC = `${BASE_PATH}/4har/char_a_p1_4har_bob1_v01.png`;

// NPC가 outfitSrc를 따로 지정하지 않으면 id 해시로 자동 분배 (안정적 랜덤)
const NPC_RANDOM_OUTFITS = [
  `${BASE_PATH}/1out/char_a_p1_1out_boxr_v01.png`,
  `${BASE_PATH}/1out/char_a_p1_1out_fstr_v01.png`,
  `${BASE_PATH}/1out/char_a_p1_1out_fstr_v02.png`,
  `${BASE_PATH}/1out/char_a_p1_1out_fstr_v03.png`,
  `${BASE_PATH}/1out/char_a_p1_1out_fstr_v04.png`,
  `${BASE_PATH}/1out/char_a_p1_1out_fstr_v05.png`,
  `${BASE_PATH}/1out/char_a_p1_1out_pfpn_v01.png`,
  `${BASE_PATH}/1out/char_a_p1_1out_pfpn_v02.png`,
  `${BASE_PATH}/1out/char_a_p1_1out_pfpn_v04.png`,
  `${BASE_PATH}/1out/char_a_p1_1out_pfpn_v05.png`,
  `${BASE_PATH}/1out/char_a_p1_1out_undi_v01.png`,
];

// NPC가 hairSrc를 따로 지정하지 않으면 id 해시로 자동 분배
const NPC_RANDOM_HAIRS = [
  `${BASE_PATH}/4har/char_a_p1_4har_bob1_v00.png`,
  `${BASE_PATH}/4har/char_a_p1_4har_bob1_v01.png`,
  `${BASE_PATH}/4har/char_a_p1_4har_bob1_v02.png`,
  `${BASE_PATH}/4har/char_a_p1_4har_bob1_v03.png`,
  `${BASE_PATH}/4har/char_a_p1_4har_bob1_v04.png`,
  `${BASE_PATH}/4har/char_a_p1_4har_bob1_v05.png`,
  `${BASE_PATH}/4har/char_a_p1_4har_dap1_v13.png`,
];

// 안정적 해시 (같은 id → 같은 옷)
function hashId(id: string | number): number {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function buildLayersForUser(user: SquareUser): LayerConfig[] {
  // outfitSrc 우선, 없으면 NPC는 id 해시 기반 랜덤, 플레이어는 기본
  const idHash = hashId(user.id);
  const outfit =
    user.outfitSrc ??
    (user.isNpc
      ? NPC_RANDOM_OUTFITS[idHash % NPC_RANDOM_OUTFITS.length]
      : DEFAULT_OUTFIT_SRC);

  // 헤어도 동일 패턴 — outfit 해시와 다른 시드 쓰려고 hash + 31 적용
  const hair =
    user.hairSrc ??
    (user.isNpc
      ? NPC_RANDOM_HAIRS[(idHash * 31 + 7) % NPC_RANDOM_HAIRS.length]
      : DEFAULT_HAIR_SRC);

  // 그려지는 순서: 몸 → 옷 → 머리 → 모자 (위로 갈수록 앞에 표시됨)
  const layers: LayerConfig[] = [
    { src: DEFAULT_BODY_SRC },
    { src: outfit },
    { src: hair },
  ];
  if (user.hatSrc) layers.push({ src: user.hatSrc });
  return layers;
}

const AVATAR_SIZE = 120;
const FRAMES_PER_ROW = 8;
const WALK_FRAME_INTERVAL = 150; // ms

// 스프라이트 시트 행 매핑
// 5행(idx 4) 앞으로 전진 = 아래 방향 (앞모습)
// 6행(idx 5) 뒤로 걷기 = 위 방향 (뒷모습)
// 7행(idx 6) 오른쪽 걷기
// 8행(idx 7) 왼쪽 걷기
const ROW_BY_DIRECTION: Record<Direction, number> = {
  down: 4,
  up: 5,
  right: 6,
  left: 7,
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface SquareAvatarProps {
  user: SquareUser;
  isWalking?: boolean;
  direction?: Direction;
  onClick?: (e: React.MouseEvent) => void;
}

export default function SquareAvatar({
  user,
  isWalking = false,
  direction = "down",
  onClick,
}: SquareAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sheetsRef = useRef<SpriteSheet[]>([]);
  const frameRef = useRef(0);
  const animRef = useRef<number | null>(null);
  const lastFrameTime = useRef(0);

  // 절대 프레임 인덱스로 렌더 (idle 용)
  const renderAbsoluteFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || sheetsRef.current.length === 0) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    renderLayers(
      ctx,
      sheetsRef.current,
      frameIndex,
      AVATAR_SIZE,
      AVATAR_SIZE
    );
    ctx.restore();
  }, []);

  // 방향에 따른 행의 col 프레임을 렌더 (걷기 애니메이션 용)
  const renderWalkFrame = useCallback(
    (col: number) => {
      const row = ROW_BY_DIRECTION[direction];
      renderAbsoluteFrame(row * FRAMES_PER_ROW + col);
    },
    [direction, renderAbsoluteFrame]
  );

  // 스프라이트 로드 — outfit/hair/hat 경로 변경 시에만 재로드
  // (user 객체 전체를 deps로 쓰면 focusSeconds 1초마다 재로드되어 애니메이션 깨짐)
  useEffect(() => {
    const layers = buildLayersForUser(user);
    let cancelled = false;
    loadLayers(layers).then((sheets) => {
      if (cancelled) return;
      sheetsRef.current = sheets;
      renderAbsoluteFrame(0);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderAbsoluteFrame, user.outfitSrc, user.hairSrc, user.hatSrc]);

  // 걸어가는 중이면 방향이 바뀔 때 즉시 재렌더 (정지 중엔 idle 유지)
  useEffect(() => {
    if (isWalking) {
      renderWalkFrame(frameRef.current);
    }
  }, [direction, isWalking, renderWalkFrame]);

  // 걷기 애니메이션 루프
  useEffect(() => {
    if (!isWalking) {
      // 정지 시 idle = 스프라이트 시트 [0][0]
      frameRef.current = 0;
      renderAbsoluteFrame(0);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const animate = (timestamp: number) => {
      if (timestamp - lastFrameTime.current >= WALK_FRAME_INTERVAL) {
        lastFrameTime.current = timestamp;
        frameRef.current = (frameRef.current + 1) % FRAMES_PER_ROW;
        renderWalkFrame(frameRef.current);
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isWalking, renderAbsoluteFrame, renderWalkFrame]);

  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      {/* 정보 오버레이 — 클릭 통과 (캐릭터 본체만 hitbox) */}
      <div className="flex flex-col items-center gap-0.5 min-w-[100px] pointer-events-none">
        {/* 공유 퀘스트 — interactive NPC는 표시 안 함 */}
        {!user.interactive && user.sharedQuest && (
          <div className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full truncate max-w-[130px] text-center">
            {user.sharedQuest.name}
            <span className="ml-1 text-yellow-300">
              {STATUS[user.sharedQuest.tagged as keyof typeof STATUS] ?? ""}
            </span>
          </div>
        )}

        {/* 집중시간 — interactive NPC는 표시 안 함 */}
        {!user.interactive && (
          <div
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
              user.isRunning
                ? "bg-green-500/80 text-white"
                : "bg-gray-500/60 text-gray-200"
            }`}
          >
            {user.isRunning ? "🟢" : "⏸"} {formatTime(user.focusSeconds)}
          </div>
        )}

        {/* 레벨 + 닉네임 — NPC는 레벨 안 보임, 이름은 초록색으로 */}
        <div className="flex items-center gap-1">
          {!user.isNpc && (
            <span className="bg-[#C84B3A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              Lv.{user.level}
            </span>
          )}
          <span
            className={`bg-black/70 text-xs font-semibold px-2 py-0.5 rounded-full ${
              user.isNpc ? "text-green-400" : "text-white"
            }`}
          >
            {user.nickname}
          </span>
        </div>
      </div>

      {/* 캐릭터 아바타 — 클릭은 본체에만 받음 */}
      <canvas
        ref={canvasRef}
        width={AVATAR_SIZE}
        height={AVATAR_SIZE}
        onClick={onClick}
        className={onClick ? "cursor-pointer" : undefined}
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}

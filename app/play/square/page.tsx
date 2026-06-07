"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/utils/stores/userStore";
import { useQuestStore } from "@/utils/stores/questStore";
import { useSquareStore } from "@/utils/stores/squareStore";
import { FEATURES } from "@/constants/features";
import { NPC_USERS, type SquareUser } from "./_components/NpcData";
import SquareAvatar from "./_components/SquareAvatar";
import FocusTimer from "./_components/FocusTimer";
import SharedQuestSelector from "./_components/SharedQuestSelector";
import ChatArea from "./_components/ChatArea";
import RestActivityModal from "./_components/RestActivityModal";
import {
  loadCollisionMask,
  findReachablePoint,
  findNearestWalkable,
} from "@/utils/sprite/CollisionMask";
import {
  getOutfitSrc,
  getHairSrc,
  getHatSrc,
} from "@/constants/appearance";

const COLLISION_MASK_SRC = "/images/backgrounds/square_mask.png";

// 맵 크기 (뷰포트 대비 배율)
const MAP_SCALE = 2.5; // 맵이 뷰포트의 2.5배 너비
const MAP_ASPECT = 1536 / 1024; // 원본 이미지 비율

// NPC 위치 (맵 % 기준)
const NPC_POSITIONS = [
  { x: 15, y: 55 }, // 왼쪽 노점
  { x: 82, y: 50 }, // 오른쪽 노점
  { x: 40, y: 48 }, // 분수 왼쪽
  { x: 60, y: 58 }, // 분수 오른쪽
];

const MOVE_SPEED = 25; // %/초

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
  const { nickname, level, outfitId, hairId, hatId, fetchUser } = useUserStore();
  const { fetchQuests } = useQuestStore();
  const {
    isRunning,
    sharedQuest,
    getElapsed,
    position,
    targetPosition,
    isWalking,
    facing,
    moveTo,
    arriveAtTarget,
  } = useSquareStore();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [restModalOpen, setRestModalOpen] = useState(false);

  // 뷰포트 크기
  const viewportRef = useRef<HTMLDivElement>(null);
  const [vpSize, setVpSize] = useState({ w: 0, h: 0 });

  // 이동 애니메이션
  const animPosRef = useRef(position);
  const [renderPos, setRenderPos] = useState(position);
  const moveAnimRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  // 카메라 오프셋
  const [camera, setCamera] = useState({ x: 0, y: 0 });

  // NPC 위치를 마스크 안쪽으로 스냅 — 마스크 로드 후 한 번만 계산
  const [npcPositions, setNpcPositions] = useState(NPC_POSITIONS);

  useEffect(() => {
    fetchUser();
    fetchQuests();
    // 충돌 마스크 로드 후 NPC 위치를 가장 가까운 걸어갈 수 있는 점으로 보정
    loadCollisionMask(COLLISION_MASK_SRC)
      .then(() => {
        setNpcPositions(
          NPC_POSITIONS.map((p) => findNearestWalkable(p.x, p.y))
        );
      })
      .catch((err) =>
        console.error("[Square] 충돌 마스크 로드 실패:", err)
      );
  }, [fetchUser, fetchQuests]);

  // 뷰포트 크기 감지
  useEffect(() => {
    const updateSize = () => {
      if (viewportRef.current) {
        setVpSize({
          w: viewportRef.current.clientWidth,
          h: viewportRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // 맵 크기 계산 — 뷰포트가 세로형이어도 맵이 항상 화면을 덮도록
  // (mapWidth/MAP_ASPECT가 vpSize.h보다 작으면 세로 부족분 발생 → 맵 폭 확대)
  const mapWidth = Math.max(
    vpSize.w * MAP_SCALE,
    vpSize.h * MAP_ASPECT
  );
  const mapHeight = mapWidth / MAP_ASPECT;

  // 카메라 팔로우 계산
  const updateCamera = useCallback(
    (playerX: number, playerY: number) => {
      if (vpSize.w === 0 || vpSize.h === 0) return;

      // 플레이어 위치를 맵 픽셀 좌표로 변환
      const playerPxX = (playerX / 100) * mapWidth;
      const playerPxY = (playerY / 100) * mapHeight;

      // 카메라 중앙을 플레이어에 맞춤
      let camX = playerPxX - vpSize.w / 2;
      let camY = playerPxY - vpSize.h / 2;

      // 카메라 범위 제한 (맵 밖으로 나가지 않도록)
      camX = Math.max(0, Math.min(camX, mapWidth - vpSize.w));
      camY = Math.max(0, Math.min(camY, mapHeight - vpSize.h));

      setCamera({ x: camX, y: camY });
    },
    [vpSize.w, vpSize.h, mapWidth, mapHeight]
  );

  // 이동 애니메이션 루프
  const animateMove = useCallback(
    (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const target = useSquareStore.getState().targetPosition;
      if (!target) return;

      const cur = animPosRef.current;
      const dx = target.x - cur.x;
      const dy = target.y - cur.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.5) {
        animPosRef.current = { x: target.x, y: target.y };
        setRenderPos({ x: target.x, y: target.y });
        updateCamera(target.x, target.y);
        arriveAtTarget();
        moveAnimRef.current = null;
        lastTimeRef.current = 0;
        return;
      }

      const step = MOVE_SPEED * delta;
      const ratio = Math.min(step / dist, 1);
      const newX = cur.x + dx * ratio;
      const newY = cur.y + dy * ratio;

      animPosRef.current = { x: newX, y: newY };
      setRenderPos({ x: newX, y: newY });
      updateCamera(newX, newY);

      moveAnimRef.current = requestAnimationFrame(animateMove);
    },
    [arriveAtTarget, updateCamera]
  );

  // 타겟 변경 시 애니메이션 시작 (방향은 store에서 moveTo가 이미 설정함)
  useEffect(() => {
    if (targetPosition && isWalking) {
      lastTimeRef.current = 0;
      moveAnimRef.current = requestAnimationFrame(animateMove);
    }
    return () => {
      if (moveAnimRef.current) cancelAnimationFrame(moveAnimRef.current);
    };
  }, [targetPosition, isWalking, animateMove]);

  // 초기 위치 동기화 + 카메라
  useEffect(() => {
    animPosRef.current = position;
    setRenderPos(position);
    updateCamera(position.x, position.y);
  }, [position, updateCamera]);

  // 맵 클릭 → 이동 (클릭 좌표를 맵 % 좌표로 변환)
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-no-move]")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 맵 좌표 (%)
    const mapX = (clickX / mapWidth) * 100;
    const mapY = (clickY / mapHeight) * 100;

    // 맵 경계 안으로만 클램프 (안전 가드)
    const clampedX = Math.max(0, Math.min(100, mapX));
    const clampedY = Math.max(0, Math.min(100, mapY));

    // 충돌 마스크 검사 — 막힌 곳을 클릭했으면 가는 길까지만 이동 (벽에서 멈춤)
    const cur = animPosRef.current;
    const reachable = findReachablePoint(cur.x, cur.y, clampedX, clampedY);

    // 현재 위치와 거의 같으면 이동 무시 (벽 바로 옆에서 벽 클릭)
    if (
      Math.abs(reachable.x - cur.x) < 0.3 &&
      Math.abs(reachable.y - cur.y) < 0.3
    ) {
      return;
    }

    moveTo(reachable.x, reachable.y);
  };

  // 내 캐릭터
  const myUser: SquareUser = {
    id: "me",
    nickname: nickname ?? "모험가",
    level: level ?? 1,
    focusSeconds: Math.floor(getElapsed() / 1000),
    isRunning,
    sharedQuest: sharedQuest
      ? { name: sharedQuest.name, tagged: sharedQuest.tagged }
      : null,
    isNpc: false,
    // 사용자 외형 — store ID 를 src 경로로 변환
    outfitSrc: getOutfitSrc(outfitId) ?? undefined,
    hairSrc: getHairSrc(hairId) ?? undefined,
    hatSrc: getHatSrc(hatId) ?? undefined,
  };

  // focusSeconds 실시간 갱신
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div
      ref={viewportRef}
      className="relative w-full h-screen overflow-hidden bg-[#3A2814]"
    >
      {/* 타이머 — 상단 가운데 */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30" data-no-move>
        <FocusTimer />
      </div>

      {/* 고정 UI: 대화창 (뷰포트 기준) */}
      <div className="absolute bottom-16 left-4 right-4 z-30" data-no-move>
        <ChatArea />
      </div>

      {/* 맵 컨테이너 (카메라 팔로우) */}
      <div
        className="absolute"
        style={{
          width: mapWidth,
          height: mapHeight,
          transform: `translate(${-camera.x}px, ${-camera.y}px)`,
        }}
        onClick={handleMapClick}
      >
        {/* 배경 이미지 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/endings/square.png"
          alt="광장 배경"
          className="w-full h-full object-cover"
          draggable={false}
        />

        {/* NPC 캐릭터들 — 위치는 마스크 안쪽으로 스냅된 좌표 사용 */}
        {NPC_USERS.map((npc, idx) => (
          <div
            key={npc.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${npcPositions[idx].x}%`,
              top: `${npcPositions[idx].y}%`,
            }}
            data-no-move
          >
            <SquareAvatar
              user={npc}
              onClick={
                npc.interactive
                  ? (e) => {
                      e.stopPropagation();
                      setRestModalOpen(true);
                    }
                  : undefined
              }
            />
          </div>
        ))}

        {/* 내 캐릭터 */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${renderPos.x}%`,
            top: `${renderPos.y}%`,
          }}
          data-no-move
        >
          <SquareAvatar
            user={myUser}
            isWalking={isWalking}
            direction={facing}
            onClick={(e) => {
              e.stopPropagation();
              setSelectorOpen(true);
            }}
          />
        </div>
      </div>

      {/* 퀘스트 선택 모달 */}
      <SharedQuestSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
      />

      {/* 의문의 마법사 휴식 처방 모달 */}
      <RestActivityModal
        open={restModalOpen}
        onClose={() => setRestModalOpen(false)}
      />
    </div>
  );
}

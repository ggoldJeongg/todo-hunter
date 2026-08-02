"use client";

import Image from "next/image";
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/common/Dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { RenderTitleDTO } from "@/application/usecases/title/dtos/RenderTitleDTO";
import { STAT_META, TIER_BY_REQ_VALUE, isStatKey, type StatKey } from "./statMeta";

type Props = {
  title: RenderTitleDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userStats: Record<StatKey, number>;
  onToggleEquip: (id: number) => void;
};

export default function TitleDetailModal({
  title, open, onOpenChange, userStats, onToggleEquip,
}: Props) {
  // 트리 구조를 항상 동일하게 유지 — title 이 null 일 때 Content 자식이 빠진 다른 트리를
  // 렌더하면, 첫 클릭에서 open=true 와 Content 추가가 한 사이클에 함께 일어나 Radix Portal
  // 마운트가 한 박자 늦어 두 번 눌러야 모달이 뜨는 현상이 발생한다.
  const safeOpen = open && title !== null;
  const stat = title && isStatKey(title.reqStat) ? STAT_META[title.reqStat] : STAT_META.str;
  const userValue = title && isStatKey(title.reqStat) ? (userStats[title.reqStat] ?? 0) : 0;
  const unlocked = title?.unlocked ?? false;
  const equipped = title?.equipped ?? false;
  const tierIdx = title ? (TIER_BY_REQ_VALUE[title.reqValue] ?? 1) : 1;
  const progressPct = title ? Math.min(100, (userValue / title.reqValue) * 100) : 0;

  return (
    <Dialog open={safeOpen} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay style={{ background: "rgba(26,16,8,0.72)" }} />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="font-galmuri9 fixed left-1/2 top-1/2 z-50 w-[calc(100%-36px)] -translate-x-1/2 -translate-y-1/2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          style={{
            maxWidth: 320,
            aspectRatio: "1151 / 1437",
            background: "url('/images/backgrounds/titlebook-background_02.png') center/100% 100% no-repeat",
            padding: "32px 36px 28px",
          }}
        >
          <DialogTitle className="sr-only">{unlocked ? (title?.name ?? "") : "미해금 칭호"}</DialogTitle>

          <DialogPrimitive.Close
            aria-label="닫기"
            className="font-galmuri11-bold absolute cursor-pointer"
            style={{ top: 36, right: 42, fontSize: 14, color: "#3a2a18", background: "none", border: 0 }}
          >
            ✕
          </DialogPrimitive.Close>

          {/* 일러스트 */}
          <div
            className="relative flex items-center justify-center mx-auto"
            style={{
              width: 116, height: 116, margin: "4px auto 8px",
              background: unlocked
                ? `radial-gradient(circle, ${stat.color}33 0%, transparent 70%), rgba(255,247,224,0.6)`
                : "rgba(40,28,18,0.18)",
              border: `2px solid ${unlocked ? stat.color : "#7a6850"}`,
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)",
            }}
          >
            {unlocked ? (
              <Image
                src={title?.img ?? "/titles/title_df.png"}
                alt={title?.name ?? ""}
                width={108}
                height={108}
                style={{ width: "92%", height: "auto", imageRendering: "pixelated" }}
                unoptimized
              />
            ) : (
              <>
                <Image
                  src={title?.img ?? "/titles/title_df.png"}
                  alt=""
                  width={88}
                  height={88}
                  style={{ width: "76%", height: "auto", filter: "brightness(0) opacity(0.32)", imageRendering: "pixelated" }}
                  unoptimized
                />
                <Image
                  src="/icons/lock.png"
                  alt=""
                  width={30}
                  height={30}
                  className="absolute"
                  style={{ imageRendering: "pixelated" }}
                  unoptimized
                />
              </>
            )}
          </div>

          {/* 칭호명 */}
          <div
            className="font-galmuri11-bold text-center"
            style={{ fontSize: 16, color: "#2a1d10", marginBottom: 4 }}
          >
            {unlocked ? (title?.name ?? "") : "??? 미해금 칭호"}
          </div>

          {/* 뱃지 줄 */}
          <div className="flex justify-center" style={{ gap: 4, marginBottom: 10 }}>
            <span
              className="font-galmuri11-bold"
              style={{
                fontSize: 9, background: stat.color, color: "#fff",
                padding: "2px 7px", letterSpacing: 1, border: "1.5px solid #2a1d10",
              }}
            >
              {stat.short}
            </span>
            <span
              className="font-galmuri11-bold"
              style={{ fontSize: 9, background: "#2a1d10", color: "#ffd96b", padding: "2px 7px" }}
            >
              티어 {tierIdx}
            </span>
            {(title?.count ?? 0) > 0 && (
              <span
                className="font-galmuri11-bold"
                style={{
                  fontSize: 9, background: "#fff7e0", color: "#3a2a18",
                  padding: "2px 7px", border: "1.5px solid #3a2a18",
                }}
              >
                ×{title?.count}
              </span>
            )}
          </div>

          {/* 설명 */}
          <div
            className="text-center"
            style={{
              fontSize: 11, color: "#3a2a18",
              background: "rgba(255,255,255,0.5)",
              border: "1.5px dashed #b59a6a",
              padding: "8px 10px", marginBottom: 10, lineHeight: 1.5,
            }}
          >
            {title?.description ?? ""}
          </div>

          {/* 진행도 */}
          <div style={{ marginBottom: 12 }}>
            <div
              className="font-galmuri11-bold flex justify-between"
              style={{ fontSize: 10, color: "#5a4a38", marginBottom: 3 }}
            >
              <span>{stat.label} 진행도</span>
              <span style={{ color: stat.color }}>
                {userValue} / {title?.reqValue ?? 0}
              </span>
            </div>
            <div
              className="relative"
              style={{ height: 9, background: "rgba(58,42,24,0.18)", border: "1.5px solid #3a2a18" }}
            >
              <div
                style={{
                  width: `${progressPct}%`,
                  height: "100%",
                  background: unlocked
                    ? `repeating-linear-gradient(90deg, ${stat.color} 0 4px, ${stat.color}cc 4px 8px)`
                    : "#b59a6a",
                }}
              />
            </div>
          </div>

          {/* 액션 버튼 */}
          <button
            type="button"
            disabled={!unlocked}
            onClick={() => { if (unlocked && title) onToggleEquip(title.titleId); }}
            className="font-galmuri11-bold block w-full text-center"
            style={{
              padding: "10px 0",
              fontSize: 12,
              cursor: unlocked ? "pointer" : "not-allowed",
              background: !unlocked
                ? "rgba(58,42,24,0.18)"
                : equipped
                  ? "#fff7e0"
                  : stat.color,
              color: !unlocked ? "#7a6850" : equipped ? "#3a2a18" : "#fff",
              border: `2px solid ${!unlocked ? "#7a6850" : "#3a2a18"}`,
              boxShadow: unlocked ? "0 3px 0 #3a2a18" : "none",
              letterSpacing: 1,
            }}
          >
            {!unlocked
              ? `🔒 ${stat.label} ${title?.reqValue ?? 0} 필요`
              : equipped
                ? "장착 해제"
                : "장착하기"}
          </button>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

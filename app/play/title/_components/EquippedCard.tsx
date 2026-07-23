"use client";

import Image from "next/image";
import type { RenderTitleDTO } from "@/application/usecases/title/dtos/RenderTitleDTO";
import { STAT_META, isStatKey } from "./statMeta";

type Props = {
  equipped: RenderTitleDTO | null;
  onClick?: () => void;
};

export default function EquippedCard({ equipped, onClick }: Props) {
  const stat = equipped && isStatKey(equipped.reqStat) ? STAT_META[equipped.reqStat] : null;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`relative flex items-center justify-center ${onClick ? "cursor-pointer" : ""}`}
      style={{
        margin: "0 12px 8px",
        padding: "16px 18px",
        background: "url('/images/backgrounds/title-set-bg.png') center/110% 140% no-repeat",
        gap: 10,
      }}
    >
      <span
        className="font-galmuri11-bold absolute"
        style={{
          top: -10, left: "50%", transform: "translateX(-50%)",
          background: "#151413", color: "#ffd96b",
          fontSize: 12, padding: "2px 10px",
          letterSpacing: 1.5,
          whiteSpace: "nowrap",
        }}
      >
        ━ 장착중 ━
      </span>

      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 52, height: 52,
          background: equipped && stat
            ? `radial-gradient(circle, ${stat.color}55 0%, rgba(233,227,215,0.4) 70%)`
            : "rgba(21,20,19,0.14)",
          border: `2px solid ${equipped && stat ? stat.color : "#B0AAA1"}`,
        }}
      >
        {equipped ? (
          <Image
            src={equipped.img}
            alt=""
            width={44}
            height={44}
            style={{ imageRendering: "pixelated" }}
            unoptimized
          />
        ) : (
          <span style={{ fontSize: 22, color: "#B0AAA1" }}>?</span>
        )}
      </div>

      <div className="min-w-0 text-center">
        <div
          className="font-galmuri11-bold"
          style={{ fontSize: 14, color: "#151413", lineHeight: 1.1 }}
        >
          {equipped ? equipped.name : "칭호 없음"}
        </div>
        <div style={{ fontSize: 9.5, color: "#B0AAA1", marginTop: 3, lineHeight: 1.35 }}>
          {equipped ? equipped.description : "원하는 칭호를 선택하세요"}
        </div>
      </div>
    </div>
  );
}

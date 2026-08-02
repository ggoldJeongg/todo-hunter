"use client";

import Image from "next/image";
import type { RenderTitleDTO } from "@/application/usecases/title/dtos/RenderTitleDTO";
import { STAT_META, isStatKey } from "./statMeta";

type Props = {
  title: RenderTitleDTO;
  onClick: () => void;
};

export default function TitleCell({ title, onClick }: Props) {
  const stat = isStatKey(title.reqStat) ? STAT_META[title.reqStat] : STAT_META.str;
  const locked = !title.unlocked;
  const equipped = title.equipped;

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col cursor-pointer text-left"
      style={{
        minWidth: 0,
        padding: 5,
        background: equipped
          ? "linear-gradient(180deg, #fff7d6 0%, #f3e3a5 100%)"
          : locked
            ? "rgba(58,42,24,0.08)"
            : "rgba(255,250,235,0.7)",
        border: equipped
          ? "2px solid #b8862c"
          : `1.5px solid ${locked ? "#9a8870" : `${stat.color}aa`}`,
        boxShadow: equipped
          ? "inset 0 0 0 1px #ffe680, 0 2px 0 #8b6a2c"
          : "0 2px 0 rgba(58,42,24,0.2)",
      }}
    >
      {equipped && (
        <span
          className="font-galmuri11-bold absolute whitespace-nowrap"
          style={{
            top: -7, left: "50%", transform: "translateX(-50%)",
            background: "#b8862c", color: "#fff",
            fontSize: 8, padding: "1px 6px",
            border: "1.5px solid #3a2a18",
            letterSpacing: 0.5, zIndex: 2,
          }}
        >
          장착중
        </span>
      )}

      <span
        aria-hidden
        className="absolute"
        style={{ top: 3, left: 3, width: 4, height: 14, background: stat.color }}
      />

      <div
        className="relative flex items-center justify-center w-full"
        style={{
          aspectRatio: "1 / 1",
          background: locked
            ? "rgba(40,28,18,0.18)"
            : `radial-gradient(circle, ${stat.color}1a 0%, rgba(232,223,200,0.55) 80%)`,
        }}
      >
        {locked ? (
          <>
            <Image
              src={title.img}
              alt=""
              width={64}
              height={64}
              className="pointer-events-none"
              style={{ width: "62%", height: "auto", filter: "brightness(0) opacity(0.32)", imageRendering: "pixelated" }}
              unoptimized
            />
            <Image
              src="/icons/lock.png"
              alt=""
              width={16}
              height={16}
              className="absolute"
              style={{ imageRendering: "pixelated" }}
              unoptimized
            />
          </>
        ) : (
          <Image
            src={title.img}
            alt={title.name}
            width={88}
            height={88}
            style={{ width: "78%", height: "auto", imageRendering: "pixelated" }}
            unoptimized
          />
        )}

        {title.count > 0 && !locked && (
          <span
            className="font-galmuri11-bold absolute"
            style={{
              bottom: 2, right: 2,
              background: "#3a2a18", color: "#ffd96b",
              fontSize: 7.5, padding: "1px 4px",
            }}
          >
            ×{title.count}
          </span>
        )}
      </div>

      <p
        className="font-galmuri11-bold text-center w-full"
        style={{
          fontSize: 9, lineHeight: 1.2, margin: "3px 0 0",
          color: locked ? "#7a6850" : "#3a2a18",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          wordBreak: "keep-all",
          minHeight: "calc(9px * 1.2 * 2)",
        }}
      >
        {locked ? "???" : title.name}
      </p>

      <div
        className="font-galmuri9 flex items-center justify-center"
        style={{ gap: 3, fontSize: 8, marginTop: 1, color: locked ? stat.color : "#7a6850" }}
      >
        <span style={{ display: "inline-block", width: 5, height: 5, background: stat.color }} />
        <span>{stat.short} {title.reqValue}+</span>
      </div>
    </button>
  );
}

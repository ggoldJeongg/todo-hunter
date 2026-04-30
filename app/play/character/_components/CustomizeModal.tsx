"use client";

import { useEffect, useRef, useState } from "react";
import { useUserStore } from "@/utils/stores/userStore";
import {
  loadLayers,
  renderLayers,
  type LayerConfig,
  type SpriteSheet,
} from "@/utils/sprite/SpriteLayerRenderer";
import {
  OUTFITS,
  HAIRS,
  HATS,
  DEFAULT_OUTFIT_ID,
  DEFAULT_HAIR_ID,
  getOutfitSrc,
  getHairSrc,
  getHatSrc,
  type AppearanceCategory,
} from "@/constants/appearance";
import { toast } from "sonner";

// ===== 픽셀 보더 (캐릭터 페이지와 동일 톤) =====
const PIXEL_BORDER_DARK = `url('data:image/svg+xml;utf8,<?xml version="1.0" encoding="UTF-8" ?><svg version="1.1" width="8" height="8" xmlns="http://www.w3.org/2000/svg"><path d="M3 1 h1 v1 h-1 z M4 1 h1 v1 h-1 z M2 2 h1 v1 h-1 z M5 2 h1 v1 h-1 z M1 3 h1 v1 h-1 z M6 3 h1 v1 h-1 z M1 4 h1 v1 h-1 z M6 4 h1 v1 h-1 z M2 5 h1 v1 h-1 z M5 5 h1 v1 h-1 z M3 6 h1 v1 h-1 z M4 6 h1 v1 h-1 z" fill="rgb(74,63,47)" /></svg>')`;

const pixelPanel = {
  borderStyle: "solid" as const,
  borderWidth: "4px",
  borderImageSlice: 3,
  borderImageWidth: 3,
  borderImageSource: PIXEL_BORDER_DARK,
  borderImageRepeat: "stretch" as const,
  borderImageOutset: 2,
  imageRendering: "pixelated" as const,
};

const pixelChip = {
  borderStyle: "solid" as const,
  borderWidth: "3px",
  borderImageSlice: 3,
  borderImageWidth: 3,
  borderImageSource: PIXEL_BORDER_DARK,
  borderImageRepeat: "stretch" as const,
  borderImageOutset: 1,
  imageRendering: "pixelated" as const,
};

const BASE_PATH = "/images/asprites/char_a_p1";
const BODY_SRC = `${BASE_PATH}/char_a_p1_0bas_humn_v00.png`;

interface CustomizeModalProps {
  open: boolean;
  onClose: () => void;
}

// ==================== 미리보기 캔버스 ====================
function PreviewCanvas({
  outfitId,
  hairId,
  hatId,
  size = 160,
}: {
  outfitId: string;
  hairId: string;
  hatId: string | null;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sheetsRef = useRef<SpriteSheet[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.imageSmoothingEnabled = false;

    const layers: LayerConfig[] = [
      { src: BODY_SRC },
      { src: getOutfitSrc(outfitId)! },
      { src: getHairSrc(hairId)! },
    ];
    const hatSrc = getHatSrc(hatId);
    if (hatSrc) layers.push({ src: hatSrc });

    let cancelled = false;
    loadLayers(layers).then((sheets) => {
      if (cancelled) return;
      sheetsRef.current = sheets;
      ctx.clearRect(0, 0, size, size);
      // 앞모습 idle 프레임 (row 4 col 0 = frame 32)
      renderLayers(ctx, sheets, 32, size, size);
    });

    return () => {
      cancelled = true;
    };
  }, [outfitId, hairId, hatId, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
    />
  );
}

// ==================== 옵션 썸네일 ====================
function OptionThumb({
  category,
  optionId,
  size = 56,
}: {
  category: AppearanceCategory;
  optionId: string | null;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);

    const layers: LayerConfig[] = [{ src: BODY_SRC }];

    if (category === "outfit") {
      layers.push({ src: getOutfitSrc(optionId)! });
      layers.push({ src: getHairSrc(DEFAULT_HAIR_ID)! });
    } else if (category === "hair") {
      layers.push({ src: getOutfitSrc(DEFAULT_OUTFIT_ID)! });
      layers.push({ src: getHairSrc(optionId)! });
    } else if (category === "hat") {
      layers.push({ src: getOutfitSrc(DEFAULT_OUTFIT_ID)! });
      layers.push({ src: getHairSrc(DEFAULT_HAIR_ID)! });
      const hatSrc = getHatSrc(optionId);
      if (hatSrc) layers.push({ src: hatSrc });
    }

    let cancelled = false;
    loadLayers(layers).then((sheets) => {
      if (cancelled) return;
      ctx.clearRect(0, 0, size, size);
      renderLayers(ctx, sheets, 32, size, size); // 앞모습
    });

    return () => {
      cancelled = true;
    };
  }, [category, optionId, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
    />
  );
}

// ==================== 메인 모달 ====================
export default function CustomizeModal({ open, onClose }: CustomizeModalProps) {
  const storeOutfit = useUserStore((s) => s.outfitId);
  const storeHair = useUserStore((s) => s.hairId);
  const storeHat = useUserStore((s) => s.hatId);
  const updateAppearance = useUserStore((s) => s.updateAppearance);

  const [tab, setTab] = useState<AppearanceCategory>("outfit");
  const [selectedOutfit, setSelectedOutfit] = useState<string>(
    storeOutfit ?? DEFAULT_OUTFIT_ID
  );
  const [selectedHair, setSelectedHair] = useState<string>(
    storeHair ?? DEFAULT_HAIR_ID
  );
  const [selectedHat, setSelectedHat] = useState<string | null>(
    storeHat ?? null
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedOutfit(storeOutfit ?? DEFAULT_OUTFIT_ID);
      setSelectedHair(storeHair ?? DEFAULT_HAIR_ID);
      setSelectedHat(storeHat ?? null);
      setTab("outfit");
    }
  }, [open, storeOutfit, storeHair, storeHat]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const isDirty =
    selectedOutfit !== storeOutfit ||
    selectedHair !== storeHair ||
    selectedHat !== (storeHat ?? null);

  const handleConfirm = async () => {
    if (!isDirty) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await updateAppearance({
        outfitId: selectedOutfit,
        hairId: selectedHair,
        hatId: selectedHat,
      });
      toast.success("외형을 변경했어요");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "외형 변경에 실패했어요"
      );
    } finally {
      setSaving(false);
    }
  };

  const TABS: { id: AppearanceCategory; label: string }[] = [
    { id: "outfit", label: "옷" },
    { id: "hair", label: "머리" },
    { id: "hat", label: "모자" },
  ];

  const options =
    tab === "outfit" ? OUTFITS : tab === "hair" ? HAIRS : HATS;
  const selectedId =
    tab === "outfit"
      ? selectedOutfit
      : tab === "hair"
      ? selectedHair
      : selectedHat;

  const handleSelect = (id: string | null) => {
    if (tab === "outfit" && id) setSelectedOutfit(id);
    else if (tab === "hair" && id) setSelectedHair(id);
    else if (tab === "hat") setSelectedHat(id);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", imageRendering: "pixelated" }}
      onClick={() => !saving && onClose()}
    >
      <div
        className="relative w-full max-w-[400px] p-5"
        style={{
          background: "linear-gradient(180deg, #FAF4E6 0%, #F2E9D0 100%)",
          boxShadow: "0 6px 0 #B49A68, 0 10px 16px rgba(0,0,0,0.25)",
          ...pixelPanel,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 점선 골드 inner trim */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "4px",
            border: "2px dashed #C8A04E",
            opacity: 0.5,
            pointerEvents: "none",
          }}
        />

        {/* 헤더 */}
        <div className="relative flex flex-col items-center gap-1 mb-3">
          <h2
            className="text-base font-extrabold tracking-wider"
            style={{ color: "#4A3F2F" }}
          >
            ━━ 외형 변경 ━━
          </h2>
          <p
            className="text-[11px] font-semibold"
            style={{ color: "#8A7D6B" }}
          >
            원하는 외형을 골라보세요
          </p>
        </div>

        {/* 미리보기 영역 */}
        <div
          className="relative flex flex-col items-center justify-center mb-3 p-3"
          style={{
            background: "linear-gradient(180deg, #BFE0EF 0%, #DCEDC8 65%, #98C56B 100%)",
            ...pixelPanel,
            boxShadow: "0 3px 0 #B49A68, inset 0 -4px 0 rgba(0,0,0,0.12)",
          }}
        >
          <PreviewCanvas
            outfitId={selectedOutfit}
            hairId={selectedHair}
            hatId={selectedHat}
            size={140}
          />
        </div>

        {/* 탭 */}
        <div className="relative flex gap-2 mb-3">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                disabled={saving}
                className="flex-1 py-2 text-xs font-extrabold tracking-wider"
                style={{
                  color: active ? "#fff" : "#4A3F2F",
                  background: active
                    ? "linear-gradient(180deg, #6BA86A 0%, #4A8048 100%)"
                    : "linear-gradient(180deg, #FAF4E6 0%, #F2E9D0 100%)",
                  boxShadow: `0 3px 0 ${active ? "#2D4A2C" : "#B49A68"}`,
                  ...pixelChip,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* 옵션 그리드 */}
        <div
          className="relative p-2 mb-3 overflow-y-auto"
          style={{
            background: "linear-gradient(180deg, #F2E9D0 0%, #E8DFC0 100%)",
            boxShadow: "0 3px 0 #B49A68",
            maxHeight: "220px",
            ...pixelPanel,
          }}
        >
          <div className="grid grid-cols-3 gap-2">
            {tab === "hat" && (
              <button
                onClick={() => handleSelect(null)}
                disabled={saving}
                className="flex flex-col items-center gap-1 p-1.5"
                style={{
                  background: selectedHat === null
                    ? "linear-gradient(180deg, #5D4A33 0%, #4A3F2F 100%)"
                    : "linear-gradient(180deg, #FAF4E6 0%, #F2E9D0 100%)",
                  color: selectedHat === null ? "#fff" : "#4A3F2F",
                  boxShadow: `0 3px 0 ${
                    selectedHat === null ? "#1F1408" : "#B49A68"
                  }`,
                  ...pixelChip,
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{ width: 56, height: 56, fontSize: 24 }}
                >
                  ✕
                </div>
                <span className="text-[10px] font-extrabold">없음</span>
              </button>
            )}

            {options.map((opt) => {
              const active = selectedId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  disabled={saving}
                  className="flex flex-col items-center gap-1 p-1.5"
                  style={{
                    background: active
                      ? "linear-gradient(180deg, #5D4A33 0%, #4A3F2F 100%)"
                      : "linear-gradient(180deg, #FAF4E6 0%, #F2E9D0 100%)",
                    color: active ? "#fff" : "#4A3F2F",
                    boxShadow: `0 3px 0 ${active ? "#1F1408" : "#B49A68"}`,
                    ...pixelChip,
                  }}
                >
                  <OptionThumb
                    category={tab}
                    optionId={opt.id}
                    size={56}
                  />
                  <span className="text-[9px] font-extrabold text-center leading-tight truncate w-full">
                    {opt.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="relative flex gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 text-xs font-extrabold tracking-wider disabled:opacity-50"
            style={{
              color: "#4A3F2F",
              background: "linear-gradient(180deg, #FAF4E6 0%, #F2E9D0 100%)",
              boxShadow: "0 4px 0 #B49A68",
              ...pixelChip,
            }}
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !isDirty}
            className="flex-1 py-3 text-xs font-extrabold tracking-wider disabled:opacity-50"
            style={{
              color: "#fff",
              background: isDirty
                ? "linear-gradient(180deg, #6BA86A 0%, #4A8048 100%)"
                : "linear-gradient(180deg, #C0AC8C 0%, #A89570 100%)",
              boxShadow: `0 4px 0 ${isDirty ? "#2D4A2C" : "#7E6E50"}`,
              ...pixelChip,
            }}
          >
            {saving ? "저장중..." : "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}

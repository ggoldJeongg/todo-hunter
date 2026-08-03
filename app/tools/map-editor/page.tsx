"use client";

// 광장 맵 에디터
// ─────────────────────────────────────────────────────────────
// 배경 위에 NPC/오브젝트를 드래그로 배치하고 속성을 편집한 뒤,
// 게임과 동일한 스키마(SquareMapData)로 square.json 을 내보낸다.
//   - 게임(PixiSquareScene) ←→ 에디터가 같은 스키마 공유
//   - 내보낸 JSON 을 /public/maps/square.json 에 덮어쓰면 리빌드 없이 배치 반영
//
// 좌표계: 모든 위치는 맵 % (0~100). 오브젝트는 "발 기준"(bottom-center) 정렬 —
// 게임의 anchor(0.5, 1.0)와 동일하게 그린다.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FALLBACK_SQUARE_MAP,
  loadSquareMap,
  loadSquareAtlas,
  normalizeSquareMap,
  SQUARE_MAP_VERSION,
  type AtlasFrame,
  type AtlasGroup,
  type SquareAtlas,
  type SquareMapData,
  type SquareObject,
  type SquareObjectKind,
} from "@/utils/square/squareMap";

// 게임이 반응형(고정 월드 + 카메라 줌)으로 렌더하므로, 오브젝트 스케일 기준은
// 뷰포트와 무관한 "고정 월드폭"이다. 게임(PixiSquareScene)의 WORLD_H 와 짝을 맞춘다.
const WORLD_H = 960; // 고정 월드 높이 (게임과 동일)
const GAME_MAP_ASPECT = 1.5;
const PREVIEW_MAP_WIDTH = WORLD_H * GAME_MAP_ASPECT; // 고정 월드폭 1440 — 게임과 정확히 일치
const REF_VIEW = { w: 540, h: 960 }; // 시야 박스용 대표 폰 뷰포트(≈9:16)
const DEFAULT_OBJECT_SIZE = 96; // 씬의 NPC_DEFAULT_SIZE 와 동일
// 충돌 마스크에서 "흰색(=걸을 수 있음)" 판정 임계 (CollisionMask.WHITE_MIN 과 동일)
const WHITE_MIN = 200;

// 마스크 편집 캔버스 크기 (배경과 동일 비율). 내보낼 때 흰색/투명 PNG로 변환.
const MASK_W = 1536;
const MASK_H = 1024;
// 편집 중에는 초록으로 칠하고(가시성), 내보낼 때 흰색 불투명으로 바꾼다.
const MASK_PAINT = "rgba(74,222,128,1)";

// 빠른 배치용 에셋 팔레트 (기존 NPC 스프라이트). 새 스프라이트는 경로 입력으로 추가.
const ASSET_PALETTE: { label: string; src: string }[] = [
  { label: "할일돌림판", src: "/images/characters/npcs/todo_wheel.png" },
  { label: "마법사", src: "/images/characters/npcs/witch_idle_on_a_broom-Sheet.png" },
  { label: "나나", src: "/images/characters/npcs/girl2_butterfly-Sheet.png" },
  { label: "강아지", src: "/images/characters/npcs/dog_tail-Sheet.png" },
  { label: "대장장이", src: "/images/characters/npcs/smith_anvil-Sheet.png" },
];

interface LoadedImage {
  img: HTMLImageElement;
  isStrip: boolean;
  frameSize: number;
  loaded: boolean;
}

interface DisplayBox {
  w: number;
  h: number;
}

// 오브젝트가 캔버스에 그려지는 사각형(px). 발 기준(bottom-center).
interface ObjRect {
  left: number;
  top: number;
  w: number;
  h: number;
  cx: number; // 발 x
  footY: number; // 발 y
}

let idCounter = 0;
function makeId(kind: SquareObjectKind): string {
  idCounter += 1;
  return `${kind}-${Date.now().toString(36)}-${idCounter}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(v, max));
}

export default function MapEditorPage() {
  const [map, setMap] = useState<SquareMapData>(FALLBACK_SQUARE_MAP);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMask, setShowMask] = useState(false);
  const [showWalkable, setShowWalkable] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showCamera, setShowCamera] = useState(true);
  const [spawnMode, setSpawnMode] = useState(false);
  const [display, setDisplay] = useState<DisplayBox>({ w: 0, h: 0 });
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [status, setStatus] = useState<string>("");
  const [atlas, setAtlas] = useState<SquareAtlas | null>(null);
  const [paletteGroup, setPaletteGroup] = useState<AtlasGroup>("npc");
  const [maskMode, setMaskMode] = useState(false);
  const [maskErase, setMaskErase] = useState(false);
  const [maskBrush, setMaskBrush] = useState(48);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imagesRef = useRef<Map<string, LoadedImage>>(new Map());
  const bgRef = useRef<HTMLImageElement | null>(null);
  const maskRef = useRef<HTMLImageElement | null>(null);
  const walkableOverlayRef = useRef<HTMLCanvasElement | null>(null);
  // 편집 중인 충돌 마스크 (초록=걸을 수 있음). 내보낼 때 흰색/투명 PNG로 변환.
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskLastRef = useRef<{ x: number; y: number } | null>(null);

  // 드래그 상태 + 최신 스냅샷(핸들러에서 stale closure 피하려고 ref 로 접근)
  const dragRef = useRef<{ id: string | null; spawn: boolean; grabDX: number; grabDY: number } | null>(null);
  const snapRef = useRef({ map, display, selectedId, spawnMode, maskMode, maskErase, maskBrush });
  snapRef.current = { map, display, selectedId, spawnMode, maskMode, maskErase, maskBrush };

  const selected = useMemo(
    () => map.objects.find((o) => o.id === selectedId) ?? null,
    [map, selectedId]
  );

  // ── 이미지 로딩 ─────────────────────────────────────────────

  const ensureImage = useCallback((src: string, onReady: () => void) => {
    const cache = imagesRef.current;
    if (cache.has(src)) return;
    const entry: LoadedImage = {
      img: new Image(),
      isStrip: false,
      frameSize: 0,
      loaded: false,
    };
    cache.set(src, entry);
    entry.img.onload = () => {
      const w = entry.img.naturalWidth;
      const h = entry.img.naturalHeight;
      entry.isStrip = w > h && w % h === 0;
      entry.frameSize = entry.isStrip ? h : Math.min(w, h);
      entry.loaded = true;
      onReady();
    };
    entry.img.onerror = () => {
      cache.delete(src);
    };
    entry.img.src = src;
  }, []);

  // 배경 로드
  useEffect(() => {
    const src = map.config.background;
    const img = new Image();
    img.onload = () => {
      bgRef.current = img;
      setStatus("");
      redrawRef.current?.();
    };
    img.onerror = () => setStatus(`배경 로드 실패: ${src}`);
    img.src = src;
  }, [map.config.background]);

  // 마스크 로드 + walkable 오버레이(흰색 → 초록) 사전 계산
  useEffect(() => {
    const src = map.config.collisionMask;
    const img = new Image();
    img.onload = () => {
      maskRef.current = img;
      // 걷는 영역 강조용 오버레이 생성 (흰색 픽셀만 초록 반투명)
      try {
        const oc = document.createElement("canvas");
        oc.width = img.width;
        oc.height = img.height;
        const octx = oc.getContext("2d", { willReadFrequently: true });
        if (octx) {
          octx.drawImage(img, 0, 0);
          const id = octx.getImageData(0, 0, img.width, img.height);
          const d = id.data;
          for (let i = 0; i < d.length; i += 4) {
            const walkable =
              d[i] > WHITE_MIN && d[i + 1] > WHITE_MIN && d[i + 2] > WHITE_MIN && d[i + 3] > 128;
            if (walkable) {
              d[i] = 74;
              d[i + 1] = 222;
              d[i + 2] = 128;
              d[i + 3] = 120;
            } else {
              d[i + 3] = 0;
            }
          }
          octx.putImageData(id, 0, 0);
          walkableOverlayRef.current = oc;
        }
      } catch {
        walkableOverlayRef.current = null;
      }
      redrawRef.current?.();
    };
    img.onerror = () => {
      maskRef.current = null;
      walkableOverlayRef.current = null;
    };
    img.src = src;
  }, [map.config.collisionMask]);

  // 오브젝트 이미지 프리로드
  useEffect(() => {
    for (const o of map.objects) ensureImage(o.imageSrc, () => redrawRef.current?.());
  }, [map.objects, ensureImage]);

  // 아틀라스 로드 + 시트 이미지 프리로드
  useEffect(() => {
    loadSquareAtlas().then((a) => {
      if (!a) {
        setStatus("아틀라스 로드 실패 — square_atlas.json 을 확인하세요.");
        return;
      }
      setAtlas(a);
      ensureImage(a.sheet, () => redrawRef.current?.());
    });
  }, [ensureImage]);

  // 마스크 편집 캔버스 준비 (마운트 시 1회)
  useEffect(() => {
    const cv = document.createElement("canvas");
    cv.width = MASK_W;
    cv.height = MASK_H;
    maskCanvasRef.current = cv;
  }, []);

  // ── 표시 크기 계산 (컨테이너에 맞춰 배경 종횡비 유지) ─────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const aspect = map.config.aspect || 1.5;
      let w = cw;
      let h = w / aspect;
      if (h > ch) {
        h = ch;
        w = h * aspect;
      }
      setDisplay({ w: Math.floor(w), h: Math.floor(h) });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [map.config.aspect]);

  // ── 지오메트리 ──────────────────────────────────────────────

  const objRect = useCallback(
    (o: SquareObject, disp: DisplayBox): ObjRect => {
      const k = disp.w / PREVIEW_MAP_WIDTH;
      // size = 표시 높이. 가로는 frame 종횡비(없으면 정사각).
      const h = (o.size ?? DEFAULT_OBJECT_SIZE) * k;
      const aspect = o.frame ? o.frame.w / o.frame.h : 1;
      const w = h * aspect;
      const cx = (o.x / 100) * disp.w + (o.offsetX ?? 0) * k;
      const footY = (o.y / 100) * disp.h + (o.offsetY ?? 0) * k;
      return { left: cx - w / 2, top: footY - h, w, h, cx, footY };
    },
    []
  );

  // 위에서(앞에서) 클릭 우선 = footY 큰 것부터 검사
  const hitTest = useCallback(
    (px: number, py: number): SquareObject | null => {
      const { map: m, display: d } = snapRef.current;
      const sorted = [...m.objects].sort((a, b) => b.y - a.y);
      for (const o of sorted) {
        const r = objRect(o, d);
        if (px >= r.left && px <= r.left + r.w && py >= r.top && py <= r.top + r.h) {
          return o;
        }
      }
      return null;
    },
    [objRect]
  );

  // ── 렌더링 ──────────────────────────────────────────────────

  const redrawRef = useRef<(() => void) | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || display.w === 0) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== display.w * dpr || canvas.height !== display.h * dpr) {
      canvas.width = display.w * dpr;
      canvas.height = display.h * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, display.w, display.h);

    // 배경
    if (bgRef.current) {
      ctx.drawImage(bgRef.current, 0, 0, display.w, display.h);
    } else {
      ctx.fillStyle = "#3A2814";
      ctx.fillRect(0, 0, display.w, display.h);
    }

    // 마스크 그리기 모드: 편집 중인 마스크(초록)를 오버레이 — 파일 오버레이는 숨김
    if (maskMode && maskCanvasRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(maskCanvasRef.current, 0, 0, display.w, display.h);
      ctx.restore();
    } else {
      // 충돌 마스크 원본 오버레이
      if (showMask && maskRef.current) {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(maskRef.current, 0, 0, display.w, display.h);
        ctx.globalAlpha = 1;
      }
      // 걷는 영역 강조 (초록)
      if (showWalkable && walkableOverlayRef.current) {
        ctx.drawImage(walkableOverlayRef.current, 0, 0, display.w, display.h);
      }
    }

    // 격자 (5% 간격)
    if (showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      for (let p = 0; p <= 100; p += 5) {
        const gx = (p / 100) * display.w;
        const gy = (p / 100) * display.h;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, display.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(display.w, gy);
        ctx.stroke();
      }
    }

    // 오브젝트 (뒤 → 앞: y 작은 것 먼저)
    const ordered = [...map.objects].sort((a, b) => a.y - b.y);
    for (const o of ordered) {
      const r = objRect(o, display);
      const entry = imagesRef.current.get(o.imageSrc);
      ctx.save();
      if (o.flip) {
        ctx.translate(r.cx, 0);
        ctx.scale(-1, 1);
        ctx.translate(-r.cx, 0);
      }
      if (entry?.loaded) {
        if (o.frame) {
          // 아틀라스: 시트에서 프레임만 잘라 그림
          ctx.drawImage(
            entry.img,
            o.frame.x,
            o.frame.y,
            o.frame.w,
            o.frame.h,
            r.left,
            r.top,
            r.w,
            r.h
          );
        } else if (entry.isStrip) {
          ctx.drawImage(
            entry.img,
            0,
            0,
            entry.frameSize,
            entry.frameSize,
            r.left,
            r.top,
            r.w,
            r.h
          );
        } else {
          ctx.drawImage(entry.img, r.left, r.top, r.w, r.h);
        }
      } else {
        // 로딩 전/실패: 자리표시 박스
        ctx.fillStyle = o.kind === "npc" ? "rgba(96,165,250,0.5)" : "rgba(251,191,36,0.5)";
        ctx.fillRect(r.left, r.top, r.w, r.h);
      }
      ctx.restore();

      // 발 지점 점
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      ctx.arc(r.cx, r.footY, 3, 0, Math.PI * 2);
      ctx.fill();

      // 선택 강조
      if (o.id === selectedId) {
        ctx.strokeStyle = "#f472b6";
        ctx.lineWidth = 2;
        ctx.strokeRect(r.left, r.top, r.w, r.h);
      }

      // 라벨
      const label = o.kind === "npc" ? o.nickname : "prop";
      ctx.font = "11px system-ui, sans-serif";
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(r.cx - tw / 2 - 3, r.top - 16, tw + 6, 14);
      ctx.fillStyle = o.kind === "npc" ? "#4ade80" : "#fbbf24";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(label, r.cx, r.top - 14);
      ctx.textAlign = "left";
    }

    // 플레이어 스폰 마커
    const sx = (map.player.spawn.x / 100) * display.w;
    const sy = (map.player.spawn.y / 100) * display.h;
    ctx.fillStyle = spawnMode ? "#22d3ee" : "rgba(34,211,238,0.8)";
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - 7, sy - 12);
    ctx.lineTo(sx + 7, sy - 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = "10px system-ui";
    ctx.fillStyle = "#22d3ee";
    ctx.textAlign = "center";
    ctx.fillText("스폰", sx, sy - 26);
    ctx.textAlign = "left";

    // 게임 카메라 시야(대략) — 타깃 폰에서 한 번에 보이는 범위 (스폰 기준, 맵 경계로 클램프)
    if (showCamera) {
      const aspect = map.config.aspect || GAME_MAP_ASPECT;
      const mapH = PREVIEW_MAP_WIDTH / aspect;
      const boxW = display.w * Math.min(1, REF_VIEW.w / PREVIEW_MAP_WIDTH);
      const boxH = display.h * Math.min(1, REF_VIEW.h / mapH);
      let cx = (map.player.spawn.x / 100) * display.w - boxW / 2;
      let cy = (map.player.spawn.y / 100) * display.h - boxH / 2;
      cx = Math.max(0, Math.min(cx, display.w - boxW));
      cy = Math.max(0, Math.min(cy, display.h - boxH));
      ctx.save();
      ctx.setLineDash([7, 5]);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, boxW, boxH);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(cx, cy, 120, 16);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = "11px system-ui";
      ctx.fillText("게임 시야(스폰 기준)", cx + 4, cy + 12);
      ctx.restore();
    }

    // 마스크 브러시 커서
    if (maskMode && hover) {
      const hx = (hover.x / 100) * display.w;
      const hy = (hover.y / 100) * display.h;
      const rDisp = maskBrush * (display.w / MASK_W);
      ctx.beginPath();
      ctx.arc(hx, hy, rDisp, 0, Math.PI * 2);
      ctx.strokeStyle = maskErase ? "#f87171" : "#4ade80";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [map, display, selectedId, showMask, showWalkable, showGrid, showCamera, spawnMode, objRect, maskMode, hover, maskBrush, maskErase]);

  redrawRef.current = redraw;
  useEffect(() => {
    redraw();
  }, [redraw]);

  // ── 마우스 입력 ─────────────────────────────────────────────

  const toPct = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const { display: d } = snapRef.current;
    return {
      px,
      py,
      xPct: clamp((px / d.w) * 100, 0, 100),
      yPct: clamp((py / d.h) * 100, 0, 100),
    };
  }, []);

  // ── 충돌 마스크 그리기 ──────────────────────────────────────

  const toggleMaskMode = useCallback(() => {
    setMaskMode((on) => {
      const next = !on;
      if (next) {
        setSpawnMode(false);
        setSelectedId(null);
      }
      return next;
    });
  }, []);

  // 마스크 캔버스에 선 긋기 (mask px 좌표). erase면 지우기(destination-out).
  const maskStroke = useCallback(
    (fromX: number, fromY: number, toX: number, toY: number, erase: boolean, radius: number) => {
      const cv = maskCanvasRef.current;
      const m = cv?.getContext("2d");
      if (!m) return;
      m.save();
      m.lineCap = "round";
      m.lineJoin = "round";
      m.lineWidth = radius * 2;
      if (erase) {
        m.globalCompositeOperation = "destination-out";
        m.strokeStyle = "rgba(0,0,0,1)";
      } else {
        m.strokeStyle = MASK_PAINT;
      }
      m.beginPath();
      m.moveTo(fromX, fromY);
      m.lineTo(toX, toY);
      m.stroke();
      m.restore();
    },
    []
  );

  const maskFillAll = useCallback((walkable: boolean) => {
    const cv = maskCanvasRef.current;
    const m = cv?.getContext("2d");
    if (!m) return;
    m.clearRect(0, 0, MASK_W, MASK_H);
    if (walkable) {
      m.fillStyle = MASK_PAINT;
      m.fillRect(0, 0, MASK_W, MASK_H);
    }
    redrawRef.current?.();
  }, []);

  // 기존 충돌 마스크(config.collisionMask) 불러오기 — 흰색(걷기)→초록으로 변환해 편집 시작
  const importMask = useCallback(() => {
    const src = snapRef.current.map.config.collisionMask;
    if (!src) {
      setStatus("충돌 마스크 경로가 비어 있습니다.");
      return;
    }
    const img = new Image();
    img.onload = () => {
      const cv = maskCanvasRef.current;
      const m = cv?.getContext("2d");
      if (!m) return;
      const tmp = document.createElement("canvas");
      tmp.width = MASK_W;
      tmp.height = MASK_H;
      const tc = tmp.getContext("2d", { willReadFrequently: true });
      if (!tc) return;
      tc.imageSmoothingEnabled = false;
      tc.drawImage(img, 0, 0, MASK_W, MASK_H);
      const id = tc.getImageData(0, 0, MASK_W, MASK_H);
      const d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const walk =
          d[i] > WHITE_MIN && d[i + 1] > WHITE_MIN && d[i + 2] > WHITE_MIN && d[i + 3] > 128;
        if (walk) {
          d[i] = 74;
          d[i + 1] = 222;
          d[i + 2] = 128;
          d[i + 3] = 255;
        } else {
          d[i + 3] = 0;
        }
      }
      tc.putImageData(id, 0, 0);
      m.clearRect(0, 0, MASK_W, MASK_H);
      m.drawImage(tmp, 0, 0);
      redrawRef.current?.();
      setStatus("기존 마스크를 불러왔습니다. 브러시로 수정하세요.");
    };
    img.onerror = () => setStatus(`마스크 로드 실패: ${src}`);
    img.src = src;
  }, []);

  // 편집 마스크를 흰색/투명 PNG로 변환해 다운로드 (CollisionMask 판정과 호환)
  const exportMask = useCallback(() => {
    const cv = maskCanvasRef.current;
    if (!cv) return;
    const out = document.createElement("canvas");
    out.width = MASK_W;
    out.height = MASK_H;
    const oc = out.getContext("2d", { willReadFrequently: true });
    if (!oc) return;
    oc.drawImage(cv, 0, 0);
    const id = oc.getImageData(0, 0, MASK_W, MASK_H);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 0) {
        d[i] = 255;
        d[i + 1] = 255;
        d[i + 2] = 255;
        d[i + 3] = 255; // 걸을 수 있음 → 흰색 불투명
      } else {
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        d[i + 3] = 0; // 벽 → 투명
      }
    }
    oc.putImageData(id, 0, 0);
    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "square_mask.png";
      a.click();
      URL.revokeObjectURL(url);
      setStatus("square_mask.png 내보냄 → public/images/square/ 등에 저장 후 '충돌 마스크 경로'에 지정하세요.");
    }, "image/png");
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const { px, py, xPct, yPct } = toPct(e.clientX, e.clientY);
      const { display: d, spawnMode: sm, maskMode: mm, maskErase: me, maskBrush: mb } = snapRef.current;

      // 마스크 그리기 모드 — 걸을 수 있는 영역을 칠한다
      if (mm) {
        canvasRef.current?.setPointerCapture(e.pointerId);
        const mx = (px / d.w) * MASK_W;
        const my = (py / d.h) * MASK_H;
        maskLastRef.current = { x: mx, y: my };
        maskStroke(mx, my, mx, my, me, mb);
        redrawRef.current?.();
        return;
      }

      if (sm) {
        dragRef.current = { id: null, spawn: true, grabDX: 0, grabDY: 0 };
        setMap((prev) => ({ ...prev, player: { spawn: { x: round1(xPct), y: round1(yPct) } } }));
        canvasRef.current?.setPointerCapture(e.pointerId);
        return;
      }

      const hit = hitTest(px, py);
      if (hit) {
        const r = objRect(hit, d);
        dragRef.current = {
          id: hit.id,
          spawn: false,
          grabDX: px - r.cx,
          grabDY: py - r.footY,
        };
        setSelectedId(hit.id);
        canvasRef.current?.setPointerCapture(e.pointerId);
      } else {
        setSelectedId(null);
      }
    },
    [toPct, hitTest, objRect, maskStroke]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const { px, py, xPct, yPct } = toPct(e.clientX, e.clientY);
      setHover({ x: round1(xPct), y: round1(yPct) });

      // 마스크 그리기: 이전 지점에서 현재 지점까지 이어 칠한다
      const s = snapRef.current;
      if (s.maskMode) {
        if (maskLastRef.current) {
          const mx = (px / s.display.w) * MASK_W;
          const my = (py / s.display.h) * MASK_H;
          maskStroke(maskLastRef.current.x, maskLastRef.current.y, mx, my, s.maskErase, s.maskBrush);
          maskLastRef.current = { x: mx, y: my };
          redrawRef.current?.();
        } else {
          redrawRef.current?.(); // 브러시 커서만 갱신
        }
        return;
      }

      const drag = dragRef.current;
      if (!drag) return;
      const { display: d } = snapRef.current;

      if (drag.spawn) {
        setMap((prev) => ({ ...prev, player: { spawn: { x: round1(xPct), y: round1(yPct) } } }));
        return;
      }
      if (drag.id) {
        const nx = clamp(((px - drag.grabDX) / d.w) * 100, 0, 100);
        const ny = clamp(((py - drag.grabDY) / d.h) * 100, 0, 100);
        setMap((prev) => ({
          ...prev,
          objects: prev.objects.map((o) =>
            o.id === drag.id ? { ...o, x: round1(nx), y: round1(ny) } : o
          ),
        }));
      }
    },
    [toPct, maskStroke]
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    maskLastRef.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  }, []);

  // 키보드: Delete 삭제, 방향키 미세 이동
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const id = snapRef.current.selectedId;
      if (!id) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      } else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 1 : 0.2;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        setMap((prev) => ({
          ...prev,
          objects: prev.objects.map((o) =>
            o.id === id
              ? { ...o, x: round1(clamp(o.x + dx, 0, 100)), y: round1(clamp(o.y + dy, 0, 100)) }
              : o
          ),
        }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 오브젝트 조작 ───────────────────────────────────────────

  const addObject = useCallback((kind: SquareObjectKind, imageSrc: string) => {
    const id = makeId(kind);
    const base = {
      id,
      x: 50,
      y: 65,
      imageSrc,
      size: DEFAULT_OBJECT_SIZE,
    };
    const obj: SquareObject =
      kind === "npc"
        ? { ...base, kind: "npc", nickname: "새 NPC", interactive: false }
        : { ...base, kind: "prop" };
    setMap((prev) => ({ ...prev, objects: [...prev.objects, obj] }));
    setSelectedId(id);
    ensureImage(imageSrc, () => redrawRef.current?.());
  }, [ensureImage]);

  const addFromAtlas = useCallback(
    (name: string, frame: AtlasFrame) => {
      if (!atlas) return;
      const kind: SquareObjectKind = frame.group === "npc" ? "npc" : "prop";
      const id = makeId(kind);
      const base = {
        id,
        x: 50,
        y: 65,
        imageSrc: atlas.sheet,
        size: frame.h, // 시트 원본 높이를 게임 px 높이로
        frame: { x: frame.x, y: frame.y, w: frame.w, h: frame.h },
      };
      const obj: SquareObject =
        kind === "npc"
          ? { ...base, kind: "npc", nickname: name, interactive: false }
          : { ...base, kind: "prop" };
      setMap((prev) => ({ ...prev, objects: [...prev.objects, obj] }));
      setSelectedId(id);
      ensureImage(atlas.sheet, () => redrawRef.current?.());
    },
    [atlas, ensureImage]
  );

  const deleteSelected = useCallback(() => {
    const id = snapRef.current.selectedId;
    if (!id) return;
    setMap((prev) => ({ ...prev, objects: prev.objects.filter((o) => o.id !== id) }));
    setSelectedId(null);
  }, []);

  const updateSelected = useCallback(
    (patch: Partial<SquareObject>) => {
      setMap((prev) => ({
        ...prev,
        objects: prev.objects.map((o) =>
          o.id === selectedId ? ({ ...o, ...patch } as SquareObject) : o
        ),
      }));
    },
    [selectedId]
  );

  // ── 불러오기 / 내보내기 ─────────────────────────────────────

  const loadCurrent = useCallback(async () => {
    const m = await loadSquareMap();
    setMap(m);
    setSelectedId(null);
    setStatus("현재 square.json 을 불러왔습니다.");
  }, []);

  // 최초 진입 시 현재 맵 로드
  useEffect(() => {
    loadCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportJson = useCallback(() => {
    const clean: SquareMapData = {
      version: SQUARE_MAP_VERSION,
      config: map.config,
      player: map.player,
      objects: map.objects,
    };
    const text = JSON.stringify(clean, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "square.json";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("square.json 내보냄 → /public/maps/square.json 에 덮어쓰세요.");
  }, [map]);

  const copyJson = useCallback(async () => {
    const text = JSON.stringify(
      { version: SQUARE_MAP_VERSION, config: map.config, player: map.player, objects: map.objects },
      null,
      2
    );
    try {
      await navigator.clipboard.writeText(text);
      setStatus("JSON 클립보드에 복사됨.");
    } catch {
      setStatus("복사 실패 — 내보내기(다운로드)를 사용하세요.");
    }
  }, [map]);

  const importJson = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = normalizeSquareMap(JSON.parse(String(reader.result)));
        setMap(parsed);
        setSelectedId(null);
        setStatus(`${file.name} 불러옴 (오브젝트 ${parsed.objects.length}개).`);
      } catch {
        setStatus("JSON 파싱 실패 — 파일을 확인하세요.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  // ── UI ──────────────────────────────────────────────────────

  return (
    <div className="flex h-screen w-full flex-col bg-neutral-900 text-neutral-100">
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-700 bg-neutral-800 px-3 py-2 text-sm">
        <span className="font-bold text-pink-400">광장 맵 에디터</span>
        <div className="mx-1 h-5 w-px bg-neutral-600" />
        <button onClick={loadCurrent} className={btn}>현재 불러오기</button>
        <button onClick={() => fileInputRef.current?.click()} className={btn}>JSON 가져오기</button>
        <button onClick={exportJson} className={btnPrimary}>JSON 내보내기</button>
        <button onClick={copyJson} className={btn}>복사</button>
        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={importJson} className="hidden" />
        <div className="mx-1 h-5 w-px bg-neutral-600" />
        <label className={chk}><input type="checkbox" checked={showWalkable} onChange={(e) => setShowWalkable(e.target.checked)} /> 걷는영역</label>
        <label className={chk}><input type="checkbox" checked={showMask} onChange={(e) => setShowMask(e.target.checked)} /> 마스크</label>
        <label className={chk}><input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} /> 격자</label>
        <label className={chk}><input type="checkbox" checked={showCamera} onChange={(e) => setShowCamera(e.target.checked)} /> 시야</label>
        <label className={`${chk} ${spawnMode ? "bg-cyan-700" : ""}`}><input type="checkbox" checked={spawnMode} onChange={(e) => { setSpawnMode(e.target.checked); if (e.target.checked) setMaskMode(false); }} /> 스폰 이동</label>
        <label className={`${chk} ${maskMode ? "bg-emerald-700" : ""}`}><input type="checkbox" checked={maskMode} onChange={toggleMaskMode} /> 마스크 그리기</label>
        {maskMode && (
          <>
            <span className="text-xs text-neutral-400">브러시</span>
            <input type="range" min={8} max={200} value={maskBrush} onChange={(e) => setMaskBrush(parseInt(e.target.value) || 8)} className="w-24" />
            <span className="w-6 text-xs text-neutral-500">{maskBrush}</span>
            <button onClick={() => setMaskErase((v) => !v)} className={`${btn} ${maskErase ? "bg-red-700" : ""}`}>{maskErase ? "지우개 ON" : "지우개"}</button>
            <button onClick={() => maskFillAll(true)} className={btn}>전체 걷기</button>
            <button onClick={() => maskFillAll(false)} className={btn}>전체 벽</button>
            <button onClick={importMask} className={btn}>기존 불러오기</button>
            <button onClick={exportMask} className={btnPrimary}>마스크 PNG 내보내기</button>
          </>
        )}
        <div className="ml-auto text-xs text-neutral-400">
          {hover ? `x ${hover.x} · y ${hover.y}` : " "}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* 캔버스 */}
        <div ref={containerRef} className="relative flex flex-1 items-center justify-center overflow-hidden bg-neutral-950 p-2">
          <canvas
            ref={canvasRef}
            style={{ width: display.w, height: display.h, imageRendering: "pixelated", touchAction: "none" }}
            className="cursor-crosshair rounded shadow-lg"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => setHover(null)}
          />
        </div>

        {/* 우측 패널 */}
        <aside className="flex w-80 flex-col overflow-y-auto border-l border-neutral-700 bg-neutral-800">
          {/* 맵 설정 — 배경 경로 */}
          <section className="border-b border-neutral-700 p-3">
            <h3 className="mb-2 text-xs font-bold uppercase text-neutral-400">맵 설정</h3>
            <Row label="배경 이미지 경로">
              <input
                value={map.config.background}
                onChange={(e) =>
                  setMap((prev) => ({ ...prev, config: { ...prev.config, background: e.target.value } }))
                }
                className={input}
              />
            </Row>
            <div className="mt-2">
              <Row label="충돌 마스크 경로">
                <input
                  value={map.config.collisionMask}
                  onChange={(e) =>
                    setMap((prev) => ({ ...prev, config: { ...prev.config, collisionMask: e.target.value } }))
                  }
                  className={input}
                />
              </Row>
            </div>
            <p className="mt-1 text-[10px] leading-tight text-neutral-500">
              배경 = 바닥 PNG. 마스크 = 걸을 수 있는 영역(흰색). 툴바 &ldquo;마스크 그리기&rdquo;로 편집·내보내기.
            </p>
          </section>

          {/* 스프라이트 팔레트 (아틀라스) */}
          <section className="border-b border-neutral-700 p-3">
            <h3 className="mb-2 text-xs font-bold uppercase text-neutral-400">스프라이트</h3>
            <div className="mb-2 flex flex-wrap gap-1">
              {GROUP_TABS.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setPaletteGroup(g.key)}
                  className={`rounded px-2 py-0.5 text-[11px] ${
                    paletteGroup === g.key ? "bg-pink-600" : "bg-neutral-700 hover:bg-neutral-600"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <div className="grid max-h-56 grid-cols-4 gap-1 overflow-y-auto">
              {atlas
                ? Object.entries(atlas.sprites)
                    .filter(([, f]) => f.group === paletteGroup)
                    .map(([name, f]) => (
                      <button
                        key={name}
                        onClick={() => addFromAtlas(name, f)}
                        title={name}
                        className="flex flex-col items-center rounded bg-neutral-700 p-1 hover:bg-neutral-600"
                      >
                        <span className="flex h-11 items-end justify-center">
                          <span style={thumbStyle(atlas, f)} />
                        </span>
                        <span className="mt-0.5 w-full truncate text-center text-[9px] text-neutral-300">
                          {name.replace(/^(npc_|shop_|tile_|fg_)/, "")}
                        </span>
                      </button>
                    ))
                : <span className="col-span-4 text-xs text-neutral-500">아틀라스 로딩...</span>}
            </div>
            <div className="mt-2 flex gap-1">
              <button onClick={() => addObject("npc", ASSET_PALETTE[0].src)} className={`${btn} flex-1`}>+ 빈 NPC(파일)</button>
              <button onClick={() => addObject("prop", ASSET_PALETTE[0].src)} className={`${btn} flex-1`}>+ 오브젝트(파일)</button>
            </div>
          </section>

          {/* 오브젝트 목록 */}
          <section className="border-b border-neutral-700 p-3">
            <h3 className="mb-2 text-xs font-bold uppercase text-neutral-400">오브젝트 ({map.objects.length})</h3>
            <ul className="space-y-1">
              {map.objects.map((o) => (
                <li key={o.id}>
                  <button
                    onClick={() => setSelectedId(o.id)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs ${
                      o.id === selectedId ? "bg-pink-600" : "bg-neutral-700 hover:bg-neutral-600"
                    }`}
                  >
                    <span className="truncate">
                      {o.kind === "npc" ? "🧍 " + o.nickname : "📦 prop"}
                    </span>
                    <span className="ml-2 shrink-0 text-neutral-300">{o.x},{o.y}</span>
                  </button>
                </li>
              ))}
              {map.objects.length === 0 && (
                <li className="text-xs text-neutral-500">비어 있음 — 위에서 추가하세요.</li>
              )}
            </ul>
          </section>

          {/* 속성 편집 */}
          <section className="flex-1 p-3">
            <h3 className="mb-2 text-xs font-bold uppercase text-neutral-400">속성</h3>
            {selected ? (
              <div className="space-y-2 text-xs">
                <Row label="종류">
                  <select
                    value={selected.kind}
                    onChange={(e) => {
                      const kind = e.target.value as SquareObjectKind;
                      if (kind === selected.kind) return;
                      if (kind === "npc") updateSelected({ kind: "npc", nickname: "새 NPC" } as Partial<SquareObject>);
                      else updateSelected({ kind: "prop", interactive: undefined, action: undefined, nickname: undefined } as unknown as Partial<SquareObject>);
                    }}
                    className={input}
                  >
                    <option value="npc">npc</option>
                    <option value="prop">prop</option>
                  </select>
                </Row>

                {selected.kind === "npc" && (
                  <Row label="닉네임">
                    <input value={selected.nickname} onChange={(e) => updateSelected({ nickname: e.target.value } as Partial<SquareObject>)} className={input} />
                  </Row>
                )}

                {selected.kind === "npc" && (
                  <Row label="대사 (한 줄에 하나, 랜덤 말풍선)">
                    <textarea
                      rows={3}
                      value={(selected.lines ?? []).join("\n")}
                      onChange={(e) =>
                        updateSelected({
                          lines: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                        } as Partial<SquareObject>)
                      }
                      className={`${input} resize-y`}
                      placeholder={"안녕하세요~\n좋은 하루!"}
                    />
                  </Row>
                )}

                <Row label="이미지">
                  <input
                    list="asset-list"
                    value={selected.imageSrc}
                    onChange={(e) => {
                      const src = e.target.value;
                      updateSelected({ imageSrc: src } as Partial<SquareObject>);
                      ensureImage(src, () => redrawRef.current?.());
                    }}
                    className={input}
                  />
                  <datalist id="asset-list">
                    {ASSET_PALETTE.map((a) => (
                      <option key={a.src} value={a.src} />
                    ))}
                  </datalist>
                </Row>

                <div className="grid grid-cols-2 gap-2">
                  <Row label="x %"><NumInput value={selected.x} step={0.5} onChange={(v) => updateSelected({ x: clamp(v, 0, 100) } as Partial<SquareObject>)} /></Row>
                  <Row label="y %"><NumInput value={selected.y} step={0.5} onChange={(v) => updateSelected({ y: clamp(v, 0, 100) } as Partial<SquareObject>)} /></Row>
                  <Row label="크기"><NumInput value={selected.size ?? DEFAULT_OBJECT_SIZE} step={1} onChange={(v) => updateSelected({ size: v } as Partial<SquareObject>)} /></Row>
                  <Row label="반전">
                    <label className="flex items-center gap-2 pt-1"><input type="checkbox" checked={!!selected.flip} onChange={(e) => updateSelected({ flip: e.target.checked } as Partial<SquareObject>)} /> flip</label>
                  </Row>
                  <Row label="offX"><NumInput value={selected.offsetX ?? 0} step={1} onChange={(v) => updateSelected({ offsetX: v } as Partial<SquareObject>)} /></Row>
                  <Row label="offY"><NumInput value={selected.offsetY ?? 0} step={1} onChange={(v) => updateSelected({ offsetY: v } as Partial<SquareObject>)} /></Row>
                </div>

                {selected.kind === "npc" && (
                  <>
                    <Row label="상호작용">
                      <label className="flex items-center gap-2 pt-1"><input type="checkbox" checked={!!selected.interactive} onChange={(e) => updateSelected({ interactive: e.target.checked } as Partial<SquareObject>)} /> 클릭 가능</label>
                    </Row>
                    {selected.interactive && (
                      <Row label="액션">
                        <select value={selected.action ?? ""} onChange={(e) => updateSelected({ action: (e.target.value || undefined) as "rest" | "roulette" | undefined } as Partial<SquareObject>)} className={input}>
                          <option value="">(없음)</option>
                          <option value="roulette">roulette</option>
                          <option value="rest">rest</option>
                        </select>
                      </Row>
                    )}
                  </>
                )}

                <button onClick={deleteSelected} className="mt-2 w-full rounded bg-red-700 px-2 py-1 text-xs hover:bg-red-600">삭제 (Del)</button>
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                {maskMode
                  ? "마스크 모드: 드래그로 걸을 수 있는 영역(초록)을 칠하세요. 지우개로 벽 지정, 브러시로 크기 조절, 완료 후 '마스크 PNG 내보내기'."
                  : spawnMode
                  ? "캔버스를 클릭해 스폰 위치를 지정하세요."
                  : "오브젝트를 선택하세요. 방향키로 미세 이동, Shift+방향키로 크게 이동."}
              </p>
            )}
          </section>

          {status && (
            <div className="border-t border-neutral-700 bg-neutral-900 px-3 py-2 text-[11px] text-emerald-400">{status}</div>
          )}
        </aside>
      </div>
    </div>
  );
}

function round1(v: number) {
  return Math.round(v * 10) / 10;
}

// ── 작은 UI 조각 ────────────────────────────────────────────────

const btn = "rounded bg-neutral-700 px-2 py-1 text-xs hover:bg-neutral-600";
const btnPrimary = "rounded bg-pink-600 px-2 py-1 text-xs font-bold hover:bg-pink-500";
const chk = "flex items-center gap-1 rounded bg-neutral-700 px-2 py-1 text-xs";
const input = "w-full rounded border border-neutral-600 bg-neutral-900 px-2 py-1 text-xs";

const GROUP_TABS: { key: AtlasGroup; label: string }[] = [
  { key: "npc", label: "NPC" },
  { key: "building", label: "건물" },
  { key: "prop", label: "프롭" },
  { key: "foreground", label: "전경" },
];

// 시트에서 프레임 하나만 잘라 보여주는 썸네일 CSS (background-position 기법)
function thumbStyle(atlas: SquareAtlas, f: AtlasFrame): React.CSSProperties {
  const TH = 40;
  const scale = TH / f.h;
  return {
    display: "block",
    width: Math.round(f.w * scale),
    height: TH,
    backgroundImage: `url(${atlas.sheet})`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: `-${Math.round(f.x * scale)}px -${Math.round(f.y * scale)}px`,
    backgroundSize: `${Math.round(atlas.width * scale)}px ${Math.round(atlas.height * scale)}px`,
    imageRendering: "pixelated",
  };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[11px] text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

function NumInput({ value, step, onChange }: { value: number; step: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      step={step}
      value={value}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!Number.isNaN(v)) onChange(v);
      }}
      className={input}
    />
  );
}

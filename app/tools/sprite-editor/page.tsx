"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface Offset {
  x: number;
  y: number;
}

interface Layer {
  id: string;
  name: string;
  image: HTMLImageElement;
  imageWidth: number;
  imageHeight: number;
  visible: boolean;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  offsets: Offset[]; // index = row * columns + frame
}

export default function SpriteEditorPage() {
  // 캔버스 표시 크기 (가장 큰 레이어 기준)
  const [canvasDisplayW, setCanvasDisplayW] = useState(64);
  const [canvasDisplayH, setCanvasDisplayH] = useState(64);

  // 새 레이어 기본 설정
  const [defaultFrameWidth, setDefaultFrameWidth] = useState(64);
  const [defaultFrameHeight, setDefaultFrameHeight] = useState(64);
  const [defaultColumns, setDefaultColumns] = useState(8);
  const [defaultRows, setDefaultRows] = useState(8);

  // 레이어
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // 프레임 탐색 (글로벌 - 모든 레이어에서 같은 프레임/행 인덱스 사용)
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentRow, setCurrentRow] = useState(0);

  // 뷰 설정
  const [zoom, setZoom] = useState(4);
  const [showGrid, setShowGrid] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(8);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 드래그
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragStartOffset = useRef({ x: 0, y: 0 });

  // 애니메이션
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  // 최대 columns/rows 계산 (프레임 탐색 범위)
  const maxColumns = layers.length > 0 ? Math.max(...layers.map((l) => l.columns)) : defaultColumns;
  const maxRows = layers.length > 0 ? Math.max(...layers.map((l) => l.rows)) : defaultRows;

  // 캔버스 표시 크기 업데이트
  useEffect(() => {
    if (layers.length === 0) {
      setCanvasDisplayW(defaultFrameWidth);
      setCanvasDisplayH(defaultFrameHeight);
    } else {
      setCanvasDisplayW(Math.max(...layers.map((l) => l.frameWidth)));
      setCanvasDisplayH(Math.max(...layers.map((l) => l.frameHeight)));
    }
  }, [layers, defaultFrameWidth, defaultFrameHeight]);

  // Canvas 렌더링
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvasDisplayW * zoom;
    const h = canvasDisplayH * zoom;
    canvas.width = w;
    canvas.height = h;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);

    // 배경 체커보드
    const checkSize = 8 * zoom;
    for (let cy = 0; cy < h; cy += checkSize) {
      for (let cx = 0; cx < w; cx += checkSize) {
        const isLight =
          (Math.floor(cx / checkSize) + Math.floor(cy / checkSize)) % 2 === 0;
        ctx.fillStyle = isLight ? "#3a3a3a" : "#2a2a2a";
        ctx.fillRect(cx, cy, checkSize, checkSize);
      }
    }

    // 레이어 그리기
    layers.forEach((layer) => {
      if (!layer.visible) return;

      // 이 레이어의 범위를 벗어나면 그리지 않음
      const frame = currentFrame < layer.columns ? currentFrame : currentFrame % layer.columns;
      const row = currentRow < layer.rows ? currentRow : currentRow % layer.rows;
      const idx = row * layer.columns + frame;
      const offset = layer.offsets[idx] || { x: 0, y: 0 };

      ctx.drawImage(
        layer.image,
        frame * layer.frameWidth,
        row * layer.frameHeight,
        layer.frameWidth,
        layer.frameHeight,
        offset.x * zoom,
        offset.y * zoom,
        layer.frameWidth * zoom,
        layer.frameHeight * zoom
      );
    });

    // 선택된 레이어 하이라이트
    if (selectedLayerId) {
      const selected = layers.find((l) => l.id === selectedLayerId);
      if (selected && selected.visible) {
        const frame = currentFrame < selected.columns ? currentFrame : currentFrame % selected.columns;
        const row = currentRow < selected.rows ? currentRow : currentRow % selected.rows;
        const idx = row * selected.columns + frame;
        const offset = selected.offsets[idx] || { x: 0, y: 0 };
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
          offset.x * zoom,
          offset.y * zoom,
          selected.frameWidth * zoom,
          selected.frameHeight * zoom
        );
        ctx.setLineDash([]);
      }
    }

    // 그리드
    if (showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      const gridSize = 16 * zoom;
      for (let gx = gridSize; gx < w; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = gridSize; gy < h; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }
    }
  }, [layers, currentFrame, currentRow, canvasDisplayW, canvasDisplayH, zoom, showGrid, selectedLayerId]);

  useEffect(() => {
    render();
  }, [render]);

  // 애니메이션 재생
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const interval = 1000 / fps;
    const animate = (time: number) => {
      if (time - lastTimeRef.current >= interval) {
        lastTimeRef.current = time;
        setCurrentFrame((prev) => (prev + 1) % maxColumns);
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, fps, maxColumns]);

  // 선택된 레이어의 현재 오프셋 인덱스 계산
  const getSelectedOffsetIdx = useCallback(() => {
    const selected = layers.find((l) => l.id === selectedLayerId);
    if (!selected) return 0;
    const frame = currentFrame < selected.columns ? currentFrame : currentFrame % selected.columns;
    const row = currentRow < selected.rows ? currentRow : currentRow % selected.rows;
    return row * selected.columns + frame;
  }, [layers, selectedLayerId, currentFrame, currentRow]);

  // 레이어 추가
  const handleAddLayer = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const name = file.name.replace(/\.[^/.]+$/, "");
      // 이미지 크기로부터 프레임 크기 자동 계산
      const cols = defaultColumns;
      const rws = defaultRows;
      const fw = Math.floor(img.naturalWidth / cols);
      const fh = Math.floor(img.naturalHeight / rws);
      const totalFrames = cols * rws;
      const offsets: Offset[] = Array.from({ length: totalFrames }, () => ({
        x: 0,
        y: 0,
      }));

      const newLayer: Layer = {
        id: crypto.randomUUID(),
        name,
        image: img,
        imageWidth: img.naturalWidth,
        imageHeight: img.naturalHeight,
        visible: true,
        columns: cols,
        rows: rws,
        frameWidth: fw,
        frameHeight: fh,
        offsets,
      };

      setLayers((prev) => [...prev, newLayer]);
      setSelectedLayerId(newLayer.id);
    };
    img.src = URL.createObjectURL(file);
    e.target.value = "";
  };

  // 레이어 프레임 설정 변경
  const updateLayerSetting = (id: string, key: "columns" | "rows" | "frameWidth" | "frameHeight", value: number) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [key]: value };
        // columns/rows 변경 시 frameWidth/frameHeight 자동 계산
        if (key === "columns") {
          updated.frameWidth = Math.floor(l.imageWidth / value);
        } else if (key === "rows") {
          updated.frameHeight = Math.floor(l.imageHeight / value);
        } else if (key === "frameWidth") {
          updated.columns = Math.floor(l.imageWidth / value);
        } else if (key === "frameHeight") {
          updated.rows = Math.floor(l.imageHeight / value);
        }
        // offsets 배열 크기 조정
        const newTotal = updated.columns * updated.rows;
        const newOffsets = Array.from({ length: newTotal }, (_, i) =>
          l.offsets[i] || { x: 0, y: 0 }
        );
        return { ...updated, offsets: newOffsets };
      })
    );
  };

  // 레이어 삭제
  const handleRemoveLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  // 레이어 표시/숨김
  const toggleVisibility = (id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  // 레이어 순서 변경
  const moveLayer = (id: string, direction: "up" | "down") => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx === -1) return prev;
      const target = direction === "up" ? idx + 1 : idx - 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  // 드래그 이벤트
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedLayerId) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };

    const selected = layers.find((l) => l.id === selectedLayerId);
    if (selected) {
      const idx = getSelectedOffsetIdx();
      const offset = selected.offsets[idx] || { x: 0, y: 0 };
      dragStartOffset.current = { x: offset.x, y: offset.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current || !selectedLayerId) return;

    const dx = Math.round((e.clientX - dragStart.current.x) / zoom);
    const dy = Math.round((e.clientY - dragStart.current.y) / zoom);

    const idx = getSelectedOffsetIdx();
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== selectedLayerId) return l;
        const newOffsets = [...l.offsets];
        newOffsets[idx] = {
          x: dragStartOffset.current.x + dx,
          y: dragStartOffset.current.y + dy,
        };
        return { ...l, offsets: newOffsets };
      })
    );
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // 오프셋 수동 입력
  const updateOffset = (axis: "x" | "y", value: number) => {
    if (!selectedLayerId) return;
    const idx = getSelectedOffsetIdx();
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== selectedLayerId) return l;
        const newOffsets = [...l.offsets];
        const current = newOffsets[idx] || { x: 0, y: 0 };
        newOffsets[idx] = { ...current, [axis]: value };
        return { ...l, offsets: newOffsets };
      })
    );
  };

  // 현재 프레임 오프셋을 모든 프레임에 적용
  const applyToAllFrames = () => {
    if (!selectedLayerId) return;
    const idx = getSelectedOffsetIdx();
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== selectedLayerId) return l;
        const currentOffset = l.offsets[idx] || { x: 0, y: 0 };
        const newOffsets = l.offsets.map(() => ({ ...currentOffset }));
        return { ...l, offsets: newOffsets };
      })
    );
  };

  // 현재 프레임 오프셋을 현재 행의 모든 프레임에 적용
  const applyToCurrentRow = () => {
    if (!selectedLayerId) return;
    const selected = layers.find((l) => l.id === selectedLayerId);
    if (!selected) return;
    const idx = getSelectedOffsetIdx();
    const row = currentRow < selected.rows ? currentRow : currentRow % selected.rows;
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== selectedLayerId) return l;
        const currentOffset = l.offsets[idx] || { x: 0, y: 0 };
        const newOffsets = [...l.offsets];
        for (let f = 0; f < l.columns; f++) {
          newOffsets[row * l.columns + f] = { ...currentOffset };
        }
        return { ...l, offsets: newOffsets };
      })
    );
  };

  // JSON Export
  const handleExport = () => {
    const exportData = {
      canvasWidth: canvasDisplayW,
      canvasHeight: canvasDisplayH,
      layers: Object.fromEntries(
        layers.map((l) => [
          l.name,
          {
            frameWidth: l.frameWidth,
            frameHeight: l.frameHeight,
            columns: l.columns,
            rows: l.rows,
            offsets: l.offsets.map((offset, idx) => ({
              frame: idx % l.columns,
              row: Math.floor(idx / l.columns),
              x: offset.x,
              y: offset.y,
            })),
          },
        ])
      ),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sprite-offsets.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // JSON Import
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);

          if (data.layers) {
            setLayers((prev) =>
              prev.map((l) => {
                const layerData = data.layers[l.name];
                if (!layerData) return l;
                const updated = {
                  ...l,
                  frameWidth: layerData.frameWidth || l.frameWidth,
                  frameHeight: layerData.frameHeight || l.frameHeight,
                  columns: layerData.columns || l.columns,
                  rows: layerData.rows || l.rows,
                };
                const newTotal = updated.columns * updated.rows;
                const newOffsets = Array.from({ length: newTotal }, () => ({ x: 0, y: 0 }));
                layerData.offsets?.forEach(
                  (o: { frame: number; row: number; x: number; y: number }) => {
                    const idx = o.row * updated.columns + o.frame;
                    if (idx < newOffsets.length) {
                      newOffsets[idx] = { x: o.x, y: o.y };
                    }
                  }
                );
                return { ...updated, offsets: newOffsets };
              })
            );
          }
        } catch {
          alert("JSON 파일을 읽을 수 없습니다.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);
  const currentOffsetIdx = getSelectedOffsetIdx();
  const currentOffset = selectedLayer?.offsets[currentOffsetIdx] || { x: 0, y: 0 };

  return (
    <div
      className="fixed inset-0 bg-[#1a1a2e] text-white flex flex-col overflow-hidden"
      style={{ maxWidth: "none" }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#16213e] border-b border-[#0f3460] shrink-0">
        <h1 className="text-lg font-bold">Sprite Editor</h1>
        <div className="flex gap-2">
          <button
            onClick={handleImport}
            className="px-3 py-1 bg-[#533483] hover:bg-[#6a4c93] rounded text-sm"
          >
            Import JSON
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1 bg-[#e94560] hover:bg-[#ff6b6b] rounded text-sm"
          >
            Export JSON
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 패널 */}
        <div className="w-72 bg-[#16213e] border-r border-[#0f3460] flex flex-col shrink-0 overflow-y-auto">
          {/* 기본 프레임 설정 (새 레이어에 적용) */}
          <div className="p-3 border-b border-[#0f3460]">
            <h2 className="text-sm font-bold mb-2 text-[#e94560]">
              Default Settings (new layers)
            </h2>
            <div className="grid grid-cols-4 gap-1 text-sm">
              <label className="flex flex-col">
                <span className="text-gray-400 text-[10px]">W</span>
                <input
                  type="number"
                  value={defaultFrameWidth}
                  onChange={(e) => setDefaultFrameWidth(Number(e.target.value) || 64)}
                  className="bg-[#1a1a2e] border border-[#0f3460] rounded px-1 py-0.5 text-white w-full text-xs"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-gray-400 text-[10px]">H</span>
                <input
                  type="number"
                  value={defaultFrameHeight}
                  onChange={(e) => setDefaultFrameHeight(Number(e.target.value) || 64)}
                  className="bg-[#1a1a2e] border border-[#0f3460] rounded px-1 py-0.5 text-white w-full text-xs"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-gray-400 text-[10px]">Cols</span>
                <input
                  type="number"
                  value={defaultColumns}
                  onChange={(e) => setDefaultColumns(Number(e.target.value) || 1)}
                  className="bg-[#1a1a2e] border border-[#0f3460] rounded px-1 py-0.5 text-white w-full text-xs"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-gray-400 text-[10px]">Rows</span>
                <input
                  type="number"
                  value={defaultRows}
                  onChange={(e) => setDefaultRows(Number(e.target.value) || 1)}
                  className="bg-[#1a1a2e] border border-[#0f3460] rounded px-1 py-0.5 text-white w-full text-xs"
                />
              </label>
            </div>
          </div>

          {/* 레이어 패널 */}
          <div className="p-3 border-b border-[#0f3460]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-[#e94560]">Layers</h2>
              <button
                onClick={handleAddLayer}
                className="px-2 py-1 bg-[#533483] hover:bg-[#6a4c93] rounded text-xs"
              >
                + Add
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="space-y-1">
              {layers.map((layer) => (
                <div key={layer.id}>
                  <div
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer text-sm ${
                      selectedLayerId === layer.id
                        ? "bg-[#0f3460] border border-[#e94560]"
                        : "bg-[#1a1a2e] hover:bg-[#0f3460]"
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVisibility(layer.id);
                      }}
                      className="text-xs shrink-0"
                    >
                      {layer.visible ? "👁" : "🚫"}
                    </button>
                    <span className="truncate flex-1">{layer.name}</span>
                    <span className="text-[10px] text-gray-500 shrink-0">
                      {layer.frameWidth}x{layer.frameHeight} {layer.columns}x{layer.rows}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(layer.id, "up");
                      }}
                      className="text-xs text-gray-400 hover:text-white shrink-0"
                    >
                      ▲
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(layer.id, "down");
                      }}
                      className="text-xs text-gray-400 hover:text-white shrink-0"
                    >
                      ▼
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveLayer(layer.id);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 shrink-0"
                    >
                      ✕
                    </button>
                  </div>

                  {/* 선택된 레이어의 개별 설정 */}
                  {selectedLayerId === layer.id && (
                    <div className="mt-1 ml-2 p-2 bg-[#1a1a2e] rounded text-xs">
                      <p className="text-gray-400 text-[10px] mb-1">
                        Image: {layer.imageWidth} × {layer.imageHeight}px
                        {" | "}Frame: {layer.frameWidth} × {layer.frameHeight}px
                      </p>
                      <div className="grid grid-cols-4 gap-1">
                        <label className="flex flex-col">
                          <span className="text-gray-400 text-[10px]">W</span>
                          <input
                            type="number"
                            value={layer.frameWidth}
                            onChange={(e) =>
                              updateLayerSetting(layer.id, "frameWidth", Number(e.target.value) || 1)
                            }
                            className="bg-[#0d1117] border border-[#0f3460] rounded px-1 py-0.5 text-white w-full"
                          />
                        </label>
                        <label className="flex flex-col">
                          <span className="text-gray-400 text-[10px]">H</span>
                          <input
                            type="number"
                            value={layer.frameHeight}
                            onChange={(e) =>
                              updateLayerSetting(layer.id, "frameHeight", Number(e.target.value) || 1)
                            }
                            className="bg-[#0d1117] border border-[#0f3460] rounded px-1 py-0.5 text-white w-full"
                          />
                        </label>
                        <label className="flex flex-col">
                          <span className="text-gray-400 text-[10px]">Cols</span>
                          <input
                            type="number"
                            value={layer.columns}
                            onChange={(e) =>
                              updateLayerSetting(layer.id, "columns", Number(e.target.value) || 1)
                            }
                            className="bg-[#0d1117] border border-[#0f3460] rounded px-1 py-0.5 text-white w-full"
                          />
                        </label>
                        <label className="flex flex-col">
                          <span className="text-gray-400 text-[10px]">Rows</span>
                          <input
                            type="number"
                            value={layer.rows}
                            onChange={(e) =>
                              updateLayerSetting(layer.id, "rows", Number(e.target.value) || 1)
                            }
                            className="bg-[#0d1117] border border-[#0f3460] rounded px-1 py-0.5 text-white w-full"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {layers.length === 0 && (
                <p className="text-gray-500 text-xs text-center py-4">
                  + Add 버튼으로
                  <br />
                  스프라이트 시트 추가
                </p>
              )}
            </div>
          </div>

          {/* 오프셋 설정 */}
          {selectedLayer && (
            <div className="p-3 border-b border-[#0f3460]">
              <h2 className="text-sm font-bold mb-2 text-[#e94560]">
                Offset ({selectedLayer.name})
              </h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="flex flex-col">
                  <span className="text-gray-400 text-xs">X</span>
                  <input
                    type="number"
                    value={currentOffset.x}
                    onChange={(e) => updateOffset("x", Number(e.target.value) || 0)}
                    className="bg-[#1a1a2e] border border-[#0f3460] rounded px-2 py-1 text-white w-full"
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-gray-400 text-xs">Y</span>
                  <input
                    type="number"
                    value={currentOffset.y}
                    onChange={(e) => updateOffset("y", Number(e.target.value) || 0)}
                    className="bg-[#1a1a2e] border border-[#0f3460] rounded px-2 py-1 text-white w-full"
                  />
                </label>
              </div>
              <div className="flex gap-1 mt-2">
                <button
                  onClick={applyToCurrentRow}
                  className="flex-1 px-2 py-1 bg-[#0f3460] hover:bg-[#1a4f8a] rounded text-xs"
                >
                  Apply to Row
                </button>
                <button
                  onClick={applyToAllFrames}
                  className="flex-1 px-2 py-1 bg-[#0f3460] hover:bg-[#1a4f8a] rounded text-xs"
                >
                  Apply to All
                </button>
              </div>
            </div>
          )}

          {/* 뷰 설정 */}
          <div className="p-3">
            <h2 className="text-sm font-bold mb-2 text-[#e94560]">View</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 text-xs">Zoom</span>
              <button
                onClick={() => setZoom((z) => Math.max(1, z - 1))}
                className="px-2 py-0.5 bg-[#0f3460] rounded text-xs"
              >
                -
              </button>
              <span className="text-xs w-6 text-center">{zoom}x</span>
              <button
                onClick={() => setZoom((z) => Math.min(10, z + 1))}
                className="px-2 py-0.5 bg-[#0f3460] rounded text-xs"
              >
                +
              </button>
            </div>
            <label className="flex items-center gap-2 mt-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              <span className="text-gray-400 text-xs">Grid</span>
            </label>
          </div>
        </div>

        {/* 메인 캔버스 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 overflow-auto flex items-center justify-center bg-[#0d1117] p-4">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="cursor-crosshair"
              style={{ imageRendering: "pixelated" }}
            />
          </div>

          {/* 하단 컨트롤 */}
          <div className="bg-[#16213e] border-t border-[#0f3460] px-4 py-3 shrink-0">
            <div className="flex items-center justify-between">
              {/* 프레임 탐색 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Frame</span>
                  <button
                    onClick={() => setCurrentFrame((f) => (f - 1 + maxColumns) % maxColumns)}
                    className="px-2 py-0.5 bg-[#0f3460] hover:bg-[#1a4f8a] rounded text-sm"
                  >
                    ◀
                  </button>
                  <span className="text-sm w-12 text-center">
                    {currentFrame + 1}/{maxColumns}
                  </span>
                  <button
                    onClick={() => setCurrentFrame((f) => (f + 1) % maxColumns)}
                    className="px-2 py-0.5 bg-[#0f3460] hover:bg-[#1a4f8a] rounded text-sm"
                  >
                    ▶
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Row</span>
                  <button
                    onClick={() => setCurrentRow((r) => (r - 1 + maxRows) % maxRows)}
                    className="px-2 py-0.5 bg-[#0f3460] hover:bg-[#1a4f8a] rounded text-sm"
                  >
                    ◀
                  </button>
                  <span className="text-sm w-12 text-center">
                    {currentRow + 1}/{maxRows}
                  </span>
                  <button
                    onClick={() => setCurrentRow((r) => (r + 1) % maxRows)}
                    className="px-2 py-0.5 bg-[#0f3460] hover:bg-[#1a4f8a] rounded text-sm"
                  >
                    ▶
                  </button>
                </div>
              </div>

              {/* 재생 컨트롤 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">FPS</span>
                <input
                  type="number"
                  value={fps}
                  onChange={(e) =>
                    setFps(Math.max(1, Math.min(30, Number(e.target.value) || 8)))
                  }
                  className="bg-[#1a1a2e] border border-[#0f3460] rounded px-2 py-0.5 text-white w-12 text-sm"
                />
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-3 py-1 rounded text-sm ${
                    isPlaying
                      ? "bg-[#e94560] hover:bg-[#ff6b6b]"
                      : "bg-[#533483] hover:bg-[#6a4c93]"
                  }`}
                >
                  {isPlaying ? "⏸ Stop" : "▶ Play"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

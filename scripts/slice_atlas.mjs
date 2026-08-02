// square_sprites.png → 알파 경계 기반 스프라이트 자동 슬라이싱
// 사용: node scripts/slice_atlas.mjs
// 출력: scratch 디버그 오버레이 + 콘솔 통계 (프레임 확정 전 검증용)

import sharp from "sharp";
import { writeFileSync } from "node:fs";

const SRC = "public/images/square/square_sprites.png";
const ALPHA_MIN = 16; // 이보다 불투명하면 스프라이트 픽셀
const MIN_AREA = 500; // 이보다 작은 덩어리(글자/점)는 무시
const MIN_H = 28; // 높이가 이보다 작으면 무시 (헤더/라벨 텍스트 h≈13~21 제거)
// 바닥 타일은 각자 테두리(베벨)+아래쪽 그림자가 그려진 낱개 패널이라 그대로 반복하면 이음선이 생긴다.
// tile 그룹만 테두리를 잘라내(inset) 밝은 안쪽만 쓰면 연속된 바닥처럼 이어진다.
// 아래 그림자가 더 두꺼워서 bottom 을 크게 잡는다(비대칭). (측정: 위/좌/우 ~5-6px, 아래 ~10px)
const TILE_INSET = { top: 8, left: 8, right: 8, bottom: 12 };

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
console.log(`이미지 ${W}x${H}, 채널 ${C}`);

// 불투명 마스크
const opaque = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) {
  if (data[i * C + 3] > ALPHA_MIN) opaque[i] = 1;
}

// 8-이웃 연결요소 라벨링 (BFS)
const label = new Int32Array(W * H).fill(0);
const comps = [];
const stack = new Int32Array(W * H);
let cur = 0;
const neigh = [-1, 1, -W, W, -W - 1, -W + 1, W - 1, W + 1];
for (let start = 0; start < W * H; start++) {
  if (!opaque[start] || label[start]) continue;
  cur++;
  let sp = 0;
  stack[sp++] = start;
  label[start] = cur;
  let minX = W, minY = H, maxX = 0, maxY = 0, area = 0;
  while (sp > 0) {
    const p = stack[--sp];
    const x = p % W;
    const y = (p / W) | 0;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    area++;
    for (let n = 0; n < 8; n++) {
      const np = p + neigh[n];
      if (np < 0 || np >= W * H) continue;
      const nx = np % W;
      // 가로 경계 넘어가는 이웃 방지
      if (Math.abs(nx - x) > 1) continue;
      if (opaque[np] && !label[np]) {
        label[np] = cur;
        stack[sp++] = np;
      }
    }
  }
  comps.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area });
}

// 필터
const kept = comps.filter((c) => c.area >= MIN_AREA && c.h >= MIN_H);
console.log(`연결요소 ${comps.length}개 → 필터 후 ${kept.length}개`);

// y밴드(행)로 클러스터링 후 x정렬
kept.sort((a, b) => a.y - b.y);
const rows = [];
const ROW_TOL = 40;
for (const c of kept) {
  const cy = c.y + c.h / 2;
  let row = rows.find((r) => Math.abs(r.cy - cy) < ROW_TOL);
  if (!row) {
    row = { cy, items: [] };
    rows.push(row);
  }
  row.items.push(c);
  row.cy = (row.cy * (row.items.length - 1) + cy) / row.items.length;
}
rows.forEach((r) => r.items.sort((a, b) => a.x - b.x));

console.log(`\n행(band) ${rows.length}개:`);
rows.forEach((r, ri) => {
  const sizes = r.items.map((c) => `${c.w}x${c.h}`).join(" ");
  console.log(`  row${ri} (y≈${Math.round(r.cy)}) : ${r.items.length}개  [${sizes}]`);
});

// 검증 오버레이로 확인한 시트 배치를 (행,열) 순서대로 의미있는 이름에 매핑.
// [names, group] — group ∈ tile|building|prop|npc|foreground (에디터 기본 kind 결정)
const ROW_NAMES = [
  [["tile_stone1", "tile_stone2", "tile_stone3", "tile_dirt", "tile_grass", "tile_wood", "tile_water", "tile_water_edge"], "tile"],
  [["tile_stone_edge", "tile_cobble_edge", "tile_grass_dirt1", "tile_grass_dirt2", "tile_stone_grass", "tile_brick", "tile_water_bordered"], "tile"],
  [["shop_cafe", "shop_flowers", "shop_bakery", "shop_potions", "shop_books", "shop_general"], "building"],
  [["fountain", "bench", "board", "signpost", "barrel", "barrels", "crate", "crate2", "cart", "flowerpot_pink", "flowerpot_yellow", "bush", "tree", "tree_small"], "prop"],
  [["lamp"], "prop"],
  [["sack", "crate_produce", "crate_bottles", "stall_bottles", "hanging_sign", "awning_red", "awning_blue", "planter_pink", "planter_yellow", "bush2", "topiary"], "prop"],
  [["npc_shopkeeper", "npc_wizard", "npc_baker", "npc_villager_boy", "npc_villager_girl", "npc_elderly", "npc_florist", "npc_merchant", "npc_cat"], "npc"],
  [["fg_stall", "fg_flowerbox", "fg_hedge", "fg_crate", "fg_barrel", "fg_flowerbed", "fg_chalkboard", "fg_flowerpot_yellow", "fg_fence", "fg_flowerpot_pink", "fg_signpost", "fg_topiary"], "foreground"],
];

const sprites = {};
let mismatch = false;
rows.forEach((r, ri) => {
  const spec = ROW_NAMES[ri];
  if (!spec) return;
  const [names, group] = spec;
  if (names.length !== r.items.length) {
    console.warn(`⚠ row${ri}: 이름 ${names.length}개 ≠ 검출 ${r.items.length}개 — 매핑 확인 필요`);
    mismatch = true;
  }
  r.items.forEach((c, ci) => {
    const name = names[ci] ?? `r${ri}_c${ci}`;
    let fr = { x: c.x, y: c.y, w: c.w, h: c.h };
    // 바닥 타일만 테두리 제거 → seamless 반복 (비대칭: 아래 그림자 더 크게)
    if (group === "tile") {
      const t = TILE_INSET;
      fr = {
        x: fr.x + t.left,
        y: fr.y + t.top,
        w: fr.w - t.left - t.right,
        h: fr.h - t.top - t.bottom,
      };
    }
    sprites[name] = { ...fr, group };
  });
});
const frames = sprites;

// 디버그 오버레이 SVG (빨간 사각형 + 이름)
const rects = [];
Object.entries(frames).forEach(([name, f]) => {
  rects.push(
    `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="none" stroke="red" stroke-width="2"/>` +
      `<text x="${f.x + 2}" y="${f.y + 12}" font-size="11" fill="yellow">${name}</text>`
  );
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${rects.join("")}</svg>`;
const scratch =
  "C:/Users/yjjuc/AppData/Local/Temp/claude/C--Users-yjjuc-OneDrive-Desktop-todo-project-todo-hunter/03c0dc3c-601e-4c31-80e0-1b1cf2870712/scratchpad";
await sharp(SRC)
  .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
  .png()
  .toFile(`${scratch}/atlas_debug.png`);
console.log(`\n디버그 오버레이: ${scratch}/atlas_debug.png`);

// 최종 아틀라스 JSON — 게임/에디터 공용
const atlas = { sheet: "/images/square/square_sprites.png", width: W, height: H, sprites: frames };
writeFileSync("public/images/square/square_atlas.json", JSON.stringify(atlas, null, 2));
console.log(`아틀라스 저장: public/images/square/square_atlas.json (${Object.keys(frames).length} sprites)`);
if (mismatch) console.warn("⚠ 이름/검출 개수 불일치가 있습니다. 위 경고를 확인하세요.");

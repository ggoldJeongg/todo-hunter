#!/usr/bin/env node
// main_frame.png 의 '남색 채움'만 다른 색으로 바꾼 프레임 변형을 만든다.
// 검정 외곽선(#000000)·금장식(따뜻한색)은 원본 그대로 두고, 채움색(#201E26)과
// 그 안티에일리어싱 명암만 지정색으로 remap 한다.
//
// 사용법:
//   node scripts/make-frame-variant.mjs --color=92B2AA --out=main_frame_green.png [--rim=2]
//   node scripts/make-frame-variant.mjs --color=DED1BC --out=main_frame_cream.png
//
// --color : 채움(가장 밝은 남색)이 될 색 (# 없이 6자리 hex)
// --out   : public/images/frames/ 아래 출력 파일명
// --rim   : 프레임 안쪽으로 채움을 당기는 남색 테두리 두께(px, 기본 2). 0 이면 프레임에 딱 붙음.

import sharp from "sharp";
import path from "node:path";

// ── 인자 파싱 ──
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v];
  })
);
const COLOR_HEX = args.color;
const OUT_NAME = args.out;
const RIM = args.rim != null ? Number(args.rim) : 2;

if (!COLOR_HEX || !OUT_NAME || !/^[0-9a-fA-F]{6}$/.test(COLOR_HEX)) {
  console.error(
    "사용법: node scripts/make-frame-variant.mjs --color=RRGGBB --out=파일명.png [--rim=2]"
  );
  process.exit(1);
}

const TARGET = [
  parseInt(COLOR_HEX.slice(0, 2), 16),
  parseInt(COLOR_HEX.slice(2, 4), 16),
  parseInt(COLOR_HEX.slice(4, 6), 16),
];

const SRC = "public/images/frames/main_frame.png";
const OUT = path.join("public/images/frames", OUT_NAME);

const FILL = [0x20, 0x1e, 0x26]; // 원본 남색 채움
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const FILL_LUM = lum(...FILL);

// 금장식 판별: 따뜻함(R > B) & 어느 정도 밝음
const isGold = (r, g, b) => r > b + 12 && r + g + b > 120;
// 차가운 남색/검정 계열(= 채움 또는 외곽선 AA)인지
const isNavyFamily = (r, g, b) => !isGold(r, g, b) && b >= r - 6;

const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const W = info.width, H = info.height;
const at = (x, y) => (y * W + x) * 4;

// 1) 리컬러 대상 마스크: 불투명 & 남색계열(금장식 아님)
const mask = new Uint8Array(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = at(x, y);
    mask[y * W + x] =
      data[i + 3] >= 10 && isNavyFamily(data[i], data[i + 1], data[i + 2]) ? 1 : 0;
  }
}

// 2) 침식(erosion): 프레임/금장식/투명에 RIM 이내로 붙은 남색은 원본 그대로 남겨
//    채움색을 프레임 안쪽으로 그만큼 당긴다.
function deepInside(x, y) {
  for (let dy = -RIM; dy <= RIM; dy++) {
    for (let dx = -RIM; dx <= RIM; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) return false;
      if (!mask[ny * W + nx]) return false; // 이웃에 프레임/투명 있으면 rim
    }
  }
  return true;
}

let changed = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (!mask[y * W + x]) continue;              // 금장식 스킵
    if (RIM > 0 && !deepInside(x, y)) continue;  // 프레임에 붙은 남색 rim 은 원본 유지
    const i = at(x, y);
    // 명도 비율로 매핑: 채움(밝은 남색)→TARGET, 검정 외곽선(lum0)→검정
    const scale = Math.min(1, lum(data[i], data[i + 1], data[i + 2]) / FILL_LUM);
    data[i] = Math.round(TARGET[0] * scale);
    data[i + 1] = Math.round(TARGET[1] * scale);
    data[i + 2] = Math.round(TARGET[2] * scale);
    changed++;
  }
}

await sharp(data, { raw: { width: W, height: H, channels: 4 } })
  .png()
  .toFile(OUT);

console.log(`✓ ${OUT}  color=#${COLOR_HEX} rim=${RIM} (리컬러 ${changed}px, 원본 유지)`);

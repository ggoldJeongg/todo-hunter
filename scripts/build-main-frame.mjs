#!/usr/bin/env node
// main_frame.svg 의 9개 나인슬라이스 조각(base64 PNG)을 하나의 75x75 PNG 로 합친다.
// 결과물은 CSS border-image 소스로 사용한다 (slice = 15px).
// 사용법: node scripts/build-main-frame.mjs

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = "public/images/frames/main_frame.svg";
const OUT = "public/images/frames/main_frame.png";

const svg = fs.readFileSync(SRC, "utf8");

// <image id="imageN_..." ... xlink:href="data:image/png;base64,...."/>
const re = /id="image(\d)_[^"]+"[^>]*?xlink:href="data:image\/png;base64,([^"]+)"/g;
const slices = {};
let m;
while ((m = re.exec(svg))) {
  slices[Number(m[1])] = Buffer.from(m[2], "base64");
}

// 3x3 배치 좌표 (native px). 모서리 15, 가장자리 45.
//  0(TL 15x15) 1(top 45x15) 2(TR 15x15)
//  3(L 15x45)  4(mid 45x45) 5(R 15x45)
//  6(BL 15x15) 7(bot 45x15) 8(BR 15x15)
// 9조각 전부 합친다(중앙 i:4 = 어두운 남색 #201E26 포함).
// CSS 는 border-image ... fill 로 이 이미지를 쓴다:
//   - 모서리/가장자리: 프레임 링
//   - fill: 중앙(남색)이 카드 내부 배경으로 채워짐
//   - 바깥 모서리 노치: 원본 그대로 투명 → 뒤 배경 비침
const layout = [
  { i: 0, left: 0, top: 0 },
  { i: 1, left: 15, top: 0 },
  { i: 2, left: 60, top: 0 },
  { i: 3, left: 0, top: 15 },
  { i: 4, left: 15, top: 15 },
  { i: 5, left: 60, top: 15 },
  { i: 6, left: 0, top: 60 },
  { i: 7, left: 15, top: 60 },
  { i: 8, left: 60, top: 60 },
];

const composites = layout.map(({ i, left, top }) => ({ input: slices[i], left, top }));

// 8조각(중앙 제외)을 75x75 로 합친다.
//   - 중앙(15~60px): 투명 (카드 요소의 배경색이 대신 채운다)
//   - 바깥 모서리 노치: 원본 그대로 투명 (뒤 배경이 비침)
//   - 황금 장식 안쪽 어두운 남색 띠(#201e26): 그대로 유지.
//     카드 내부를 같은 #201e26 으로 채우고 background-clip:padding-box 를 주면
//     남색 띠 ↔ 내부가 이어져 틈이 안 생긴다. (내부를 밝게 쓰려면 이 띠를 지워야 함)
await sharp({
  create: { width: 75, height: 75, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(composites)
  .png()
  .toFile(OUT);

console.log(`✓ ${OUT} (75x75, slice=15px · 중앙 남색 포함 · 바깥 노치 투명)`);
console.log("  CSS: border-image: url(main_frame.png) 15 fill / <두께>px stretch;");

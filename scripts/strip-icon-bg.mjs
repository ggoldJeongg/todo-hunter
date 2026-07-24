#!/usr/bin/env node
// 스탯 아이콘의 어두운 배경을 투명으로 바꾼다.
// 사용법: npm run icons:strip
//
// 원본(public/icons/*.png)은 rgb(29,29,31) 배경이 구워져 있어서 밝은 패널 위에 올리면
// 검은 사각형으로 보인다. 그 배경색만 투명 처리해 글리프만 남긴다.
// 글리프 외곽선인 rgb(0,0,0) 은 건드리지 않는다.
// 원본은 유지하고 public/icons/stats/ 에 새로 쓴다.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SRC_DIR = "public/icons";
const OUT_DIR = "public/icons/stats";
const FILES = ["heart.png", "brain.png", "smile.png", "coin.png", "star.png"];

// 제거 대상 배경색과 허용 오차 (안티에일리어싱된 가장자리까지 흡수)
const BG = [29, 29, 31];
const TOLERANCE = 12;

await mkdir(OUT_DIR, { recursive: true });

for (const file of FILES) {
  const { data, info } = await sharp(path.join(SRC_DIR, file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let cleared = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue;
    const near =
      Math.abs(data[i] - BG[0]) <= TOLERANCE &&
      Math.abs(data[i + 1] - BG[1]) <= TOLERANCE &&
      Math.abs(data[i + 2] - BG[2]) <= TOLERANCE;
    if (near) {
      data[i + 3] = 0;
      cleared++;
    }
  }

  const out = path.join(OUT_DIR, file);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(out);

  console.log(`✓ ${out}  투명 처리 ${cleared}px / 전체 ${info.width * info.height}px`);
}

console.log(`\n완료: ${FILES.length}개 (원본은 그대로 유지)`);

#!/usr/bin/env node
// manifest.json 용 PWA 아이콘 일괄 생성기.
// 원본 1장(public/splash_screens/icon.png)에서 필요한 사이즈를 전부 뽑아 public/icons/ 에 쓴다.
// 사용법:
//   npm run icons
//   npm run icons -- --src public/foo.png   (원본 교체 시)
//
// any / maskable 을 따로 뽑는 이유:
//   maskable 은 OS가 원형·둥근사각형 등으로 잘라내는 용도라 가장자리 20%가 날아간다.
//   그래서 내용을 중앙 80%(안전 영역) 안으로 줄이고 나머지를 배경색으로 채운다.
//   투명 배경도 마스킹 시 지저분해지므로 flatten 으로 배경색을 깔아준다.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = "public/icons";
const ANY_SIZES = [48, 72, 96, 144, 192, 512];
const MASKABLE_SIZES = [192, 512];
const SAFE_RATIO = 0.8; // maskable 안전 영역 비율 (W3C 권장)
const BG = "#E9E3D7"; // manifest.json 의 background_color 와 반드시 일치시킬 것 (어긋나면 OS 스플래시에서 아이콘 배경만 도드라진다)

const srcIdx = process.argv.indexOf("--src");
const SRC = srcIdx !== -1 ? process.argv[srcIdx + 1] : "public/splash_screens/icon.png";

const meta = await sharp(SRC).metadata();
if (meta.width < Math.max(...ANY_SIZES)) {
  // 확대는 화질 손실이라 경고만 하고 진행 (500 → 512 처럼 근소한 차이는 실사용상 문제없음)
  console.warn(
    `⚠  원본이 ${meta.width}x${meta.height} 라 최대 ${Math.max(...ANY_SIZES)}px 까지 확대됩니다.`
  );
}

await mkdir(OUT_DIR, { recursive: true });

// any: 원본 비율 유지, 투명 배경 그대로
for (const size of ANY_SIZES) {
  const out = path.join(OUT_DIR, `${size}.png`);
  await sharp(SRC)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out);
  console.log(`✓ ${out}  (${size}x${size}, any)`);
}

// maskable: 중앙 80%로 축소 + 배경색 패딩 + 투명 제거
for (const size of MASKABLE_SIZES) {
  const inner = Math.round(size * SAFE_RATIO);
  const pad = Math.floor((size - inner) / 2);
  const out = path.join(OUT_DIR, `${size}-maskable.png`);
  await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: pad,
      bottom: size - inner - pad, // 홀수 여백일 때 합이 정확히 size 가 되도록 나머지를 아래/오른쪽에 몰아준다
      left: pad,
      right: size - inner - pad,
      background: BG,
    })
    .flatten({ background: BG })
    .png()
    .toFile(out);
  console.log(`✓ ${out}  (${size}x${size}, maskable, 안전영역 ${SAFE_RATIO * 100}%)`);
}

console.log(`\n완료: ${ANY_SIZES.length + MASKABLE_SIZES.length}개 생성 (원본: ${SRC})`);

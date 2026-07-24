#!/usr/bin/env node
// 나인슬라이스 프레임 에셋을 3색 팔레트로 다시 칠한다.
// 사용법: npm run frames
//
// 원본 프레임은 "검은 외곽선 + 갈색 모서리 장식 + 중앙 채움" 3개 명도 구간으로 되어 있어서,
// 픽셀의 명도를 기준으로 팔레트 3색에 매핑하면 도트 모양을 그대로 두고 색만 바꿀 수 있다.
// 원본은 건드리지 않고 -3tone 접미사로 새 파일을 만든다.

import sharp from "sharp";
import path from "node:path";

// globals.css 의 --pixel-* 과 반드시 같은 값이어야 한다.
const PALETTE = {
  ink: [0x15, 0x14, 0x13],
  stone: [0xb0, 0xaa, 0xa1],
  paper: [0xe9, 0xe3, 0xd7],
};

// 명도 경계. 원본 분포(외곽선 0 / 장식 80~161 / 채움 31 또는 231)를 기준으로 잡았다.
const DARK_MAX = 50;
const LIGHT_MIN = 200;

const SRC_DIR = "public/images/backgrounds";
const FILES = [
  // [원본, 중앙 채움을 어떤 색으로 볼지]
  ["panel-border-01-parchment.png", "paper"],
  ["panel-border-01.png", "ink"],
  ["portrait-border-19.png", "ink"],
];

function classify(r, g, b) {
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (lum < DARK_MAX) return "ink"; // 외곽선
  if (lum < LIGHT_MIN) return "stone"; // 모서리 장식
  return "paper"; // 밝은 채움
}

for (const [file, fillTone] of FILES) {
  const src = path.join(SRC_DIR, file);
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const counts = { ink: 0, stone: 0, paper: 0, transparent: 0 };

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) {
      counts.transparent++;
      continue;
    }
    let tone = classify(data[i], data[i + 1], data[i + 2]);
    // 어두운 변형의 중앙 채움(명도 31)은 외곽선과 같은 구간에 걸리는데,
    // 의도상 채움이므로 지정된 톤을 그대로 쓴다. 외곽선은 순수 검정(0)이라 구분된다.
    if (tone === "ink" && data[i] + data[i + 1] + data[i + 2] > 30) tone = fillTone;
    const [r, g, b] = PALETTE[tone];
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    counts[tone]++;
  }

  const out = src.replace(/\.png$/, "-3tone.png");
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(out);

  console.log(
    `✓ ${out}  ink=${counts.ink} stone=${counts.stone} paper=${counts.paper} 투명=${counts.transparent}`
  );
}

console.log(`\n완료: ${FILES.length}개 (원본은 그대로 유지)`);

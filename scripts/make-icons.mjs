// public/icon.svg から PNG アイコンを生成する
// 使い方: node scripts/make-icons.mjs
import { readFile } from "node:fs/promises";
import sharp from "sharp";

// ホーム画面アイコンは OS 側で角丸マスクされるため、角丸なしの全面背景にする
const svg = (await readFile("public/icon.svg", "utf8")).replace('rx="36"', 'rx="0"');

for (const size of [180, 192, 512]) {
  await sharp(Buffer.from(svg), { density: 300 })
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`);
  console.log(`public/icon-${size}.png generated`);
}

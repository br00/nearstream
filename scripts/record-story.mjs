import puppeteer from "puppeteer";
import { execSync } from "child_process";
import { mkdirSync, rmSync } from "fs";
import path from "path";

const FRAME_DIR = path.resolve("scripts/frames");
const OUTPUT = path.resolve("public/story.mp4");
// Instagram story: 1080x1920, but we render at 1/3 with 3x device scale
const WIDTH = 360;
const HEIGHT = 640;
const FPS = 30;
const DURATION_SEC = 10;
const TOTAL_FRAMES = FPS * DURATION_SEC;

rmSync(FRAME_DIR, { recursive: true, force: true });
mkdirSync(FRAME_DIR, { recursive: true });

console.log("Launching browser...");
const browser = await puppeteer.launch({
  headless: true,
});

const page = await browser.newPage();
await page.setViewport({
  width: WIDTH,
  height: HEIGHT,
  deviceScaleFactor: 3, // renders at 1080x1920
});

console.log("Loading story page...");
await page.goto("http://localhost:3000/story", { waitUntil: "networkidle0" });

// Let particles initialize and settle
await new Promise((r) => setTimeout(r, 2000));

console.log(`Capturing ${TOTAL_FRAMES} frames at ${FPS}fps...`);
for (let i = 0; i < TOTAL_FRAMES; i++) {
  const frameNum = String(i).padStart(4, "0");
  await page.screenshot({
    path: path.join(FRAME_DIR, `frame_${frameNum}.png`),
  });

  await new Promise((r) => setTimeout(r, 1000 / FPS));

  if ((i + 1) % 60 === 0) {
    console.log(`  ${i + 1}/${TOTAL_FRAMES} frames`);
  }
}

await browser.close();

console.log("Encoding video with ffmpeg...");
execSync(
  `ffmpeg -y -framerate ${FPS} ` +
    `-i "${FRAME_DIR}/frame_%04d.png" ` +
    `-c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p ` +
    `-movflags +faststart ` +
    `"${OUTPUT}"`,
  { stdio: "inherit" }
);

rmSync(FRAME_DIR, { recursive: true, force: true });

console.log(`\nDone! Video saved to: ${OUTPUT}`);
console.log(`Resolution: 1080x1920 (Instagram Story ready)`);
console.log(`Duration: ${DURATION_SEC}s at ${FPS}fps`);

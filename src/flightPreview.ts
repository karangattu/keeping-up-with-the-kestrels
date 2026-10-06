import { drawBirdSprite } from "./birdSprite";
import { RAPTORS } from "./App";
import { FLIGHT_CELL_SIZE, getFlightFrameIndex } from "./flightAnimation";

const canvas = document.querySelector<HTMLCanvasElement>("#birds")!;
const ctx = canvas.getContext("2d")!;
const pause = document.querySelector<HTMLButtonElement>("#pause")!;
const directionButton = document.querySelector<HTMLButtonElement>("#direction")!;
const speedInput = document.querySelector<HTMLInputElement>("#speed")!;
let paused = false;
let direction = 1;
let elapsed = 0;
let lastTime = 0;
pause.onclick = () => {
  paused = !paused;
  pause.textContent = paused ? "Resume" : "Pause";
};
directionButton.onclick = () => {
  direction *= -1;
  directionButton.textContent = direction === 1 ? "Face left" : "Face right";
};
speedInput.oninput = () => {
  document.querySelector("#speed-value")!.textContent = `${speedInput.value}×`;
};
const images = await Promise.all(RAPTORS.map((raptor) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = raptor.sheet;
})));
function draw(timestamp: number) {
  if (lastTime && !paused) elapsed += (timestamp - lastTime) * Number(speedInput.value);
  lastTime = timestamp;
  const width = canvas.clientWidth;
  const columns = width < 640 ? 2 : 3;
  const cellWidth = width / columns;
  const cellHeight = 240;
  const height = Math.ceil(RAPTORS.length / columns) * cellHeight;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== height * dpr) {
    canvas.width = Math.round(width * dpr);
    canvas.height = height * dpr;
    canvas.style.height = `${height}px`;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  RAPTORS.forEach((raptor, index) => {
    const x = (index % columns + 0.5) * cellWidth;
    const y = Math.floor(index / columns) * cellHeight;
    const frameIndex = getFlightFrameIndex({ raptorId: raptor.id, flightStyle: "hover", duration: 1, phase: 0, flapCenters: [] }, elapsed);
    const frame = raptor.frames[frameIndex];
    const { anchorX, anchorY } = frame;
    const image = images[index];
    const scale = Math.min(0.28, cellWidth / 700);
    const pixelScale = FLIGHT_CELL_SIZE / (image.width / 4) * scale;
    ctx.save();
    ctx.translate(x, y + 110);
    ctx.scale(direction, 1);
    const drawX = FLIGHT_CELL_SIZE * scale * 0.4 - anchorX * pixelScale;
    const drawY = -FLIGHT_CELL_SIZE * scale * 0.04 - anchorY * pixelScale;
    drawBirdSprite(ctx, image, frame, pixelScale, drawX, drawY);
    ctx.restore();
    ctx.fillStyle = "#153b3c";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(raptor.name, x, y + 221);
  });
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

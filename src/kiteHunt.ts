import hoverFrames from "./birdSpriteFrames.json";
import huntingFrames from "./kiteHuntFrames.json";
import type { SpriteFrame } from "./birdSprite";

// The approved neutral hover pose: tail (55,247), beak (292,235).
const BODY_DX = 237;
const BODY_DY = -12;
const BODY_LENGTH = Math.hypot(BODY_DX, BODY_DY);
const BODY_ANGLE = Math.atan2(BODY_DY, BODY_DX);

type KiteFrame = {
  sheet: "hover" | "hunt";
  index: number;
  frame: SpriteFrame;
  bodyLength: number;
  pixelRatio: number;
  rotation: number;
  gripX: number;
  gripY: number;
};

const hovering: KiteFrame[] = hoverFrames["white-tailed-kite"].map((frame, index) => ({
  sheet: "hover", index,
  frame: { ...frame, anchorX: frame.anchorX - BODY_DX / 4, anchorY: frame.anchorY - BODY_DY / 4 },
  bodyLength: BODY_LENGTH, pixelRatio: 1, rotation: 0, gripX: 2.25, gripY: 22,
}));

const hunting: KiteFrame[] = huntingFrames.map((frame, index) => {
  const anchorX = frame.tailX * 0.25 + frame.beakX * 0.75;
  const anchorY = frame.tailY * 0.25 + frame.beakY * 0.75;
  const dx = frame.beakX - frame.tailX;
  const dy = frame.beakY - frame.tailY;
  const bodyLength = Math.hypot(dx, dy);
  const pixelRatio = BODY_LENGTH / bodyLength;
  const rotation = BODY_ANGLE - Math.atan2(dy, dx);
  const gripX = (frame.talonX - anchorX) * pixelRatio;
  const gripY = (frame.talonY - anchorY) * pixelRatio;
  return {
    sheet: "hunt", index,
    frame: { sx: frame.sx, sy: frame.sy, sw: frame.sw, sh: frame.sh, anchorX: anchorX - frame.sx, anchorY: anchorY - frame.sy },
    bodyLength, pixelRatio, rotation,
    gripX: gripX * Math.cos(rotation) - gripY * Math.sin(rotation),
    gripY: gripX * Math.sin(rotation) + gripY * Math.cos(rotation),
  };
});

export function getKiteAnimationFrame(progress: number, wingFrame: number): KiteFrame {
  if (progress <= 0.44) return hovering[wingFrame];
  if (progress < 0.6) {
    const index = Math.min(3, Math.floor((progress - 0.44) / 0.11 * 4));
    // Both animations share these exact pixels, anchor, angle, and scale.
    return index === 0 ? hovering[0] : hunting[index];
  }
  if (progress < 0.66) return hunting[Math.min(7, 4 + Math.floor((progress - 0.6) / 0.05 * 4))];
  // The generated final pose raises the wings; reuse the half-down recovery.
  return hunting[[8, 9, 10, 11, 12, 13, 14, 13][Math.floor(wingFrame / 2)]];
}

export type SpriteFrame = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  anchorX: number;
  anchorY: number;
  clip?: string;
};

const silhouettePaths = new WeakMap<SpriteFrame, Path2D>();

/** Clip overlapping atlas crops to their own silhouette in source-pixel space. */
export function drawBirdSprite(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  frame: SpriteFrame,
  pixelScale: number,
  x: number,
  y: number,
) {
  const { sx, sy, sw, sh, clip } = frame;
  if (!clip) {
    ctx.drawImage(image, sx, sy, sw, sh, x, y, sw * pixelScale, sh * pixelScale);
    return;
  }
  let path = silhouettePaths.get(frame);
  if (!path) {
    path = new Path2D(clip);
    silhouettePaths.set(frame, path);
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pixelScale, pixelScale);
  ctx.clip(path);
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  ctx.restore();
}

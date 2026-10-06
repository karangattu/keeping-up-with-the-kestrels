import { readFileSync } from "node:fs";
import framesBySpecies from "./birdSpriteFrames.json";
import { describe, expect, it } from "vitest";
import { getFlightFrameIndex } from "./flightAnimation";
import { RAPTOR_IDS } from "./game";

const flight = {
  raptorId: "americanKestrel" as const,
  flightStyle: "flapGlide" as const,
  duration: 8000,
  phase: 0,
  flapCenters: [0.5],
};

describe("flight animation", () => {
  it("starts and finishes a flap burst in the glide pose", () => {
    expect(getFlightFrameIndex(flight, (4000 - 320 - 1) / 8000)).toBe(0);
    expect(getFlightFrameIndex(flight, (4000 - 320) / 8000)).toBe(0);
    expect(getFlightFrameIndex(flight, (4000 + 320) / 8000)).toBe(0);
  });

  it("plays every pose in order and wraps seamlessly", () => {
    const frames = Array.from({ length: 33 }, (_, i) =>
      getFlightFrameIndex({ ...flight, flightStyle: "hover" }, (i * 20 + 1) / 8000),
    );
    expect(frames).toEqual([...Array.from({ length: 16 }, (_, i) => i), ...Array.from({ length: 16 }, (_, i) => i), 0]);
  });

  it("keeps wingbeat speed independent of crossing duration", () => {
    for (const raptorId of RAPTOR_IDS) {
      const bird = { ...flight, raptorId, flightStyle: "hover" as const };
      for (let ms = 0; ms < 2000; ms += 17) {
        expect(getFlightFrameIndex(bird, ms / 8000)).toBe(
          getFlightFrameIndex({ ...bird, duration: 12000 }, ms / 12000),
        );
      }
    }
  });

  it("holds a steady extended-wing silhouette between bursts for every species", () => {
    for (const raptorId of RAPTOR_IDS) {
      expect(getFlightFrameIndex({ ...flight, raptorId, flapCenters: [] }, 0.3)).toBe(0);
    }
  });
});

describe("bird sprite exports", () => {
  it("provides 16 valid anchored crops for all 11 variants", () => {
    expect(Object.keys(framesBySpecies)).toHaveLength(11);
    for (const [species, frames] of Object.entries(framesBySpecies)) {
      const png = readFileSync(new URL(`../assets/${species}-sprite-sheet.png`, import.meta.url));
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);
      expect(png[25]).toBe(6); // RGBA PNG, preserving the transparent background.
      expect(frames).toHaveLength(16);
      for (const frame of frames) {
        expect(frame.sw).toBeGreaterThan(0);
        expect(frame.sh).toBeGreaterThan(0);
        expect(frame.sx).toBeGreaterThanOrEqual(0);
        expect(frame.sy).toBeGreaterThanOrEqual(0);
        expect(frame.sx + frame.sw).toBeLessThanOrEqual(width);
        expect(frame.sy + frame.sh).toBeLessThanOrEqual(height);
        expect(frame.anchorX).toBeGreaterThanOrEqual(0);
        expect(frame.anchorX).toBeLessThanOrEqual(frame.sw);
        expect(frame.anchorY).toBeGreaterThanOrEqual(0);
        expect(frame.anchorY).toBeLessThanOrEqual(frame.sh);
      }
    }
  });
});

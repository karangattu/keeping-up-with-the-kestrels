import {
  Clock3,
  Download,
  Gauge,
  Hand,
  Home,
  Play,
  RotateCcw,
  SkipForward,
  Smartphone,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import {
  computeAccuracy,
  computeCappedTotalScore,
  computeMaxScore,
  computeScorePerSpecies,
  computeTotalDelta,
  computeTotalScore,
  formatTime,
  getFinalCountdownBeep,
  getMultiplier,
  hash,
  makeEmptyCounts,
  randomBetween,
  RAPTOR_IDS,
  ROUND_SECONDS,
  type Counts,
  type Difficulty,
  type RaptorId,
} from "./game";
import introVideo from "../assets/game_intro.mp4";
import promoVideo from "../assets/promo.mp4";
import gameSong from "../assets/game_song.mp3";
import rshaSound from "../assets/RSHA_sound.mp3";
import rthaSound from "../assets/RTHA_sound.mp3";
import posterImage from "../assets/game_poster.jpg";
import logoImage from "../assets/SFBBO_Logo_Rounded.png";
import backdropImage from "../assets/backdrop.png";
import americanKestrelSheet from "../assets/american-kestrel-sprite-sheet.png";
import coopersHawkSheet from "../assets/coopers-hawk-sprite-sheet.png";
import goldenEagleSheet from "../assets/golden-eagle-sprite-sheet.png";
import redShoulderedHawkSheet from "../assets/red-shouldered-hawk-sprite-sheet.png";
import redTailedHawkSheet from "../assets/red-tailed-hawk-sprite-sheet.png";
import turkeyVultureSheet from "../assets/turkey-vulture-sprite-sheet.png";
import northernHarrierSheet from "../assets/northern-harrier-sprite-sheet.png";
import northernHarrierMaleSheet from "../assets/northern-harrier-male-sprite-sheet.png";
import baldEagleSheet from "../assets/bald-eagle-sprite-sheet.png";
import whiteTailedKiteSheet from "../assets/white-tailed-kite-sprite-sheet.png";
import ospreySheet from "../assets/osprey-sprite-sheet.png";
import americanKestrelProfile from "../assets/american-kestrel-profile.png";
import coopersHawkProfile from "../assets/coopers-hawk-profile.png";
import goldenEagleProfile from "../assets/golden-eagle-profile.png";
import redShoulderedHawkProfile from "../assets/red-shouldered-hawk-profile.png";
import redTailedHawkProfile from "../assets/red-tailed-hawk-profile.png";
import turkeyVultureProfile from "../assets/turkey-vulture-profile.png";
import northernHarrierProfile from "../assets/northern-harrier-profile.png";
import baldEagleProfile from "../assets/bald-eagle-profile.png";
import whiteTailedKiteProfile from "../assets/white-tailed-kite-profile.png";
import ospreyProfile from "../assets/osprey-profile.png";
import baldEagleVentralImage from "../assets/bald-eagle-ventral-view.png";
import goldenEagleVentralImage from "../assets/golden-eagle-ventral-view.png";
import redShoulderedHawkVentralImage from "../assets/red-shouldered-hawk-ventral-view.png";
import redTailedHawkVentralImage from "../assets/red-tailed-hawk-ventral-view.png";
import turkeyVultureVentralImage from "../assets/turkey-vulture-ventral-view.png";

type Phase = "intro" | "promo" | "tutorial" | "countdown" | "playing" | "results";
type TutorialRaptorId = "americanKestrel" | "redTailedHawk" | "turkeyVulture";
type TutorialStep = "welcome" | TutorialRaptorId | "success";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const INSTALL_PROMPT_DISMISSED_KEY = "kestrel.installPromptDismissed";

type HighScore = {
  id: string | number;
  player_name: string;
  score: number;
  level: Difficulty;
  created_at: string;
};

type ThermalRaptorId =
  | "goldenEagle"
  | "redShoulderedHawk"
  | "redTailedHawk"
  | "turkeyVulture"
  | "baldEagle";

type Frame = { sx: number; sy: number; sw: number; sh: number };

export type Raptor = {
  key: string;
  id: RaptorId;
  name: string;
  shortName: string;
  sheet: string;
  tint: string;
  frames: Frame[];
  sizeScale: number;
  profile: string;
  fact: string;
};

type Streaks = Record<RaptorId, number>;

type Bird = {
  id: number;
  raptorKey: string;
  raptorId: RaptorId;
  flightStyle: "glide" | "hover" | "teeter" | "flapGlide";
  direction: 1 | -1;
  startX: number;
  startY: number;
  hoverX: number;
  hoverY: number;
  hoverStart: number;
  hoverEnd: number;
  controlX: number;
  controlY: number;
  endX: number;
  endY: number;
  startedAt: number;
  duration: number;
  farScale: number;
  nearScale: number;
  bank: number;
  bob: number;
  phase: number;
  flapOffset: number;
  noiseSeed: number;
  soarBias: number;
  flapCenters: number[];
  altitudePhase: number;
  altitudeAmp: number;
};

type ThermalBird = {
  id: number;
  raptorId: ThermalRaptorId;
  startedAt: number;
  duration: number;
  // Horizontal traversal across the top band.
  direction: 1 | -1;
  startX: number;
  endX: number;
  baseY: number;
  // Gentle scalloped soaring layered onto the crossing path.
  glideAmp: number;
  glidePhase: number;
  loopCount: number;
  loopAmpX: number;
  loopAmpY: number;
  baseScale: number;
  sizeRatio: number;
  turnDirection: 1 | -1;
  bankPhase: number;
  alpha: number;
  altitudePhase: number;
  altitudeAmp: number;
  wobble: number;
};

type SpriteAsset = {
  image: CanvasImageSource;
  width: number;
  height: number;
  ready: boolean;
};

const PROMO_FALLBACK_MS = 9000;
const MALE_HARRIER_MIN_ROUND_PROGRESS = 0.35;
const MALE_HARRIER_CHANCE = 0.18;
const LEADERBOARD_FETCH_LIMIT = 100;
const LEADERBOARD_SIZE = 5;
const THERMAL_TOP_BAND = { min: 0.04, max: 0.26 };

function normalizePlayerName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function dedupeHighScores(scores: HighScore[]) {
  const uniqueScores = new Map<string, HighScore>();

  for (const score of scores) {
    const key = normalizePlayerName(score.player_name);
    if (!uniqueScores.has(key)) {
      uniqueScores.set(key, score);
    }
  }

  return Array.from(uniqueScores.values()).slice(0, LEADERBOARD_SIZE);
}

function framesFromBounds(bounds: Array<[number, number, number, number]>, width: number, height: number, padding = 16): Frame[] {
  const cellW = width / 3;
  const cellH = height / 2;

  return bounds.map(([minX, minY, maxX, maxY], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);

    const cellLeft = col * cellW;
    const cellRight = cellLeft + cellW;
    const cellTop = row * cellH;
    const cellBottom = cellTop + cellH;

    const sx = Math.max(cellLeft, minX - padding);
    const sy = Math.max(cellTop, minY - padding);
    const right = Math.min(cellRight, maxX + padding + 1);
    const bottom = Math.min(cellBottom, maxY + padding + 1);

    return {
      sx,
      sy,
      sw: Math.max(0, right - sx),
      sh: Math.max(0, bottom - sy),
    };
  });
}

const COOPERS_HAWK_FRAMES = framesFromBounds(
  [
    [59, 305, 555, 388],
    [633, 121, 1072, 372],
    [1177, 26, 1595, 385],
    [52, 554, 498, 780],
    [612, 573, 1057, 848],
    [1150, 587, 1582, 889],
  ],
  1672,
  941,
);

const AMERICAN_KESTREL_FRAMES = framesFromBounds(
  [
    [38, 234, 600, 360],
    [644, 48, 1063, 334],
    [1175, 29, 1599, 339],
    [53, 561, 487, 784],
    [624, 570, 1032, 853],
    [1145, 572, 1562, 893],
  ],
  1672,
  941,
);

const GOLDEN_EAGLE_FRAMES = framesFromBounds(
  [
    [22, 266, 612, 416],
    [681, 96, 1066, 414],
    [1229, 37, 1581, 413],
    [110, 552, 494, 811],
    [649, 557, 1053, 847],
    [1204, 574, 1580, 828],
  ],
  1672,
  941,
);

const NORTHERN_HARRIER_FRAMES = framesFromBounds(
  [
    [43, 329, 654, 455],
    [730, 83, 1173, 452],
    [1330, 33, 1786, 471],
    [69, 663, 542, 970],
    [710, 666, 1172, 937],
    [1316, 684, 1797, 797],
  ],
  1920,
  1080,
);

const NORTHERN_HARRIER_MALE_FRAMES = framesFromBounds(
  [
    [47, 307, 598, 404],
    [705, 125, 1213, 385],
    [1340, 47, 1816, 400],
    [72, 555, 567, 914],
    [710, 673, 1192, 924],
    [1335, 754, 1838, 896],
  ],
  1920,
  1080,
);

const RED_SHOULDERED_HAWK_FRAMES = framesFromBounds(
  [
    [24, 251, 601, 398],
    [677, 99, 1093, 401],
    [1222, 39, 1558, 400],
    [127, 580, 496, 811],
    [674, 588, 1040, 838],
    [1202, 599, 1552, 819],
  ],
  1672,
  941,
);

const RED_TAILED_HAWK_FRAMES = framesFromBounds(
  [
    [40, 258, 590, 386],
    [658, 159, 1093, 383],
    [1210, 79, 1551, 399],
    [163, 508, 509, 750],
    [687, 604, 1049, 806],
    [1206, 617, 1571, 834],
  ],
  1672,
  941,
);

const TURKEY_VULTURE_FRAMES = framesFromBounds(
  [
    [36, 274, 640, 434],
    [757, 140, 1280, 430],
    [1396, 66, 1770, 445],
    [176, 565, 554, 858],
    [785, 688, 1188, 953],
    [1391, 696, 1784, 964],
  ],
  1920,
  1080,
);

const BALD_EAGLE_FRAMES = framesFromBounds(
  [
    [61, 295, 625, 445],
    [722, 145, 1226, 453],
    [1348, 35, 1776, 476],
    [108, 617, 610, 907],
    [731, 618, 1213, 990],
    [1333, 632, 1816, 1011],
  ],
  1920,
  1080,
);

const OSPREY_FRAMES = framesFromBounds(
  [
    [55, 321, 590, 478],
    [721, 133, 1218, 494],
    [1347, 37, 1767, 509],
    [105, 616, 592, 927],
    [730, 633, 1199, 1014],
    [1335, 650, 1802, 1012],
  ],
  1920,
  1080,
);

const WHITE_TAILED_KITE_FRAMES = framesFromBounds(
  [
    [48, 344, 646, 474],
    [741, 111, 1158, 460],
    [1341, 42, 1741, 483],
    [91, 669, 578, 976],
    [751, 676, 1203, 996],
    [1334, 711, 1821, 847],
  ],
  1920,
  1080,
);

export const RAPTORS: Raptor[] = [
  {
    key: "americanKestrel",
    id: "americanKestrel",
    name: "American Kestrel",
    shortName: "American Kestrel",
    sheet: americanKestrelSheet,
    tint: "#e8a84c",
    frames: AMERICAN_KESTREL_FRAMES,
    sizeScale: 0.47,
    profile: americanKestrelProfile,
    fact: "Small falcon; hovers while hunting on open fields.",
  },
  {
    key: "coopersHawk",
    id: "coopersHawk",
    name: "Cooper's Hawk",
    shortName: "Cooper's Hawk",
    sheet: coopersHawkSheet,
    tint: "#8ca6a9",
    frames: COOPERS_HAWK_FRAMES,
    sizeScale: 0.62,
    profile: coopersHawkProfile,
    fact: "Medium accipiter; banded tail, hunts birds in backyards.",
  },
  {
    key: "goldenEagle",
    id: "goldenEagle",
    name: "Golden Eagle",
    shortName: "Golden Eagle",
    sheet: goldenEagleSheet,
    tint: "#6b5c43",
    frames: GOLDEN_EAGLE_FRAMES,
    sizeScale: 1.42,
    profile: goldenEagleProfile,
    fact: "Huge eagle; soaring flight, golden-brown wash on nape.",
  },
  {
    key: "northernHarrier",
    id: "northernHarrier",
    name: "Northern Harrier",
    shortName: "Northern Harrier",
    sheet: northernHarrierSheet,
    tint: "#ab8660",
    frames: NORTHERN_HARRIER_FRAMES,
    sizeScale: 0.89,
    profile: northernHarrierProfile,
    fact: "Low-flying raptor; white rump, owl-like facial disk.",
  },
  {
    key: "northernHarrierMale",
    id: "northernHarrier",
    name: "Northern Harrier (Male)",
    shortName: "Northern Harrier",
    sheet: northernHarrierMaleSheet,
    tint: "#8a9ba8",
    frames: NORTHERN_HARRIER_MALE_FRAMES,
    sizeScale: 0.86,
    profile: northernHarrierProfile,
    fact: "Low-flying raptor; white rump, owl-like facial disk.",
  },
  {
    key: "redShoulderedHawk",
    id: "redShoulderedHawk",
    name: "Red-shouldered Hawk",
    shortName: "Red-shouldered Hawk",
    sheet: redShoulderedHawkSheet,
    tint: "#c35a32",
    frames: RED_SHOULDERED_HAWK_FRAMES,
    sizeScale: 0.78,
    profile: redShoulderedHawkProfile,
    fact: "Medium hawk; reddish chest, translucent wing crescents.",
  },
  {
    key: "redTailedHawk",
    id: "redTailedHawk",
    name: "Red-tailed Hawk",
    shortName: "Red-tailed Hawk",
    sheet: redTailedHawkSheet,
    tint: "#d68538",
    frames: RED_TAILED_HAWK_FRAMES,
    sizeScale: 1,
    profile: redTailedHawkProfile,
    fact: "Large hawk; dark belly band, rufous tail in adults.",
  },
  {
    key: "turkeyVulture",
    id: "turkeyVulture",
    name: "Turkey Vulture",
    shortName: "Turkey Vulture",
    sheet: turkeyVultureSheet,
    tint: "#7b5547",
    frames: TURKEY_VULTURE_FRAMES,
    sizeScale: 1.42,
    profile: turkeyVultureProfile,
    fact: "Large scavenger; dihedral wings, rocks side-to-side.",
  },
  {
    key: "baldEagle",
    id: "baldEagle",
    name: "Bald Eagle",
    shortName: "Bald Eagle",
    sheet: baldEagleSheet,
    tint: "#4a3728",
    frames: BALD_EAGLE_FRAMES,
    sizeScale: 1.66,
    profile: baldEagleProfile,
    fact: "Huge eagle; white head and tail, wings flat when soaring.",
  },
  {
    key: "whiteTailedKite",
    id: "whiteTailedKite",
    name: "White-tailed Kite",
    shortName: "White-tailed Kite",
    sheet: whiteTailedKiteSheet,
    tint: "#c4b8a8",
    frames: WHITE_TAILED_KITE_FRAMES,
    sizeScale: 0.85,
    profile: whiteTailedKiteProfile,
    fact: "Graceful raptor; white body, black shoulders, hovers.",
  },
  {
    key: "osprey",
    id: "osprey",
    name: "Osprey",
    shortName: "Osprey",
    sheet: ospreySheet,
    tint: "#5c4a3a",
    frames: OSPREY_FRAMES,
    sizeScale: 1.35,
    profile: ospreyProfile,
    fact: "Fish specialist; dark eye stripe, arched wings.",
  },
];

const UNIQUE_RAPTORS = RAPTORS.filter(
  (raptor, index, arr) => arr.findIndex((r) => r.id === raptor.id) === index
);

const TUTORIAL_RAPTORS = UNIQUE_RAPTORS.filter(
  (raptor) => raptor.id === "americanKestrel" || raptor.id === "redTailedHawk" || raptor.id === "turkeyVulture"
);
const TUTORIAL_SEQUENCE = ["americanKestrel", "redTailedHawk", "turkeyVulture"] as const satisfies readonly TutorialRaptorId[];
const TUTORIAL_COPY = {
  americanKestrel: {
    title: "Spot the Kestrel",
    body: "American Kestrels are small falcons. Look for quick wingbeats and a hover, then tap American Kestrel below.",
  },
  redTailedHawk: {
    title: "Now the Red-tailed Hawk",
    body: "Red-tailed Hawks are bigger and steadier, with broad wings built for soaring. Tap Red-tailed Hawk below.",
  },
  turkeyVulture: {
    title: "Now the Turkey Vulture",
    body: "Turkey Vultures hold long wings in a shallow V and rock side-to-side as they glide. Tap Turkey Vulture below.",
  },
} satisfies Record<TutorialRaptorId, { title: string; body: string }>;

const SPAWN_RAPTORS = RAPTORS.filter((raptor) => raptor.key !== "northernHarrierMale");
const MALE_NORTHERN_HARRIER = RAPTORS.find((raptor) => raptor.key === "northernHarrierMale");
const THERMAL_RAPTORS = [
  { id: "redShoulderedHawk", image: redShoulderedHawkVentralImage, sizeRatio: 0.83 },
  { id: "redTailedHawk", image: redTailedHawkVentralImage, sizeRatio: 1 },
  { id: "turkeyVulture", image: turkeyVultureVentralImage, sizeRatio: 1.41 },
  { id: "goldenEagle", image: goldenEagleVentralImage, sizeRatio: 1.64 },
  { id: "baldEagle", image: baldEagleVentralImage, sizeRatio: 1.65 },
] as const satisfies ReadonlyArray<{ id: ThermalRaptorId; image: string; sizeRatio: number }>;

const SPECIES_BEHAVIOR: Record<
  RaptorId,
  { soarBias: [number, number]; flapBursts: [number, number]; hoverChance: number; flightStyle: Bird["flightStyle"] }
> = {
  americanKestrel: { soarBias: [0.12, 0.28], flapBursts: [1, 2], hoverChance: 0.08, flightStyle: "flapGlide" },
  coopersHawk: { soarBias: [0.2, 0.42], flapBursts: [1, 2], hoverChance: 0, flightStyle: "flapGlide" },
  goldenEagle: { soarBias: [0.72, 0.92], flapBursts: [1, 1], hoverChance: 0, flightStyle: "glide" },
  northernHarrier: { soarBias: [0.42, 0.62], flapBursts: [1, 2], hoverChance: 0, flightStyle: "glide" },
  redShoulderedHawk: { soarBias: [0.36, 0.56], flapBursts: [1, 2], hoverChance: 0, flightStyle: "glide" },
  redTailedHawk: { soarBias: [0.62, 0.82], flapBursts: [1, 1], hoverChance: 0, flightStyle: "glide" },
  turkeyVulture: { soarBias: [0.82, 0.96], flapBursts: [1, 1], hoverChance: 0, flightStyle: "teeter" },
  baldEagle: { soarBias: [0.72, 0.9], flapBursts: [1, 1], hoverChance: 0, flightStyle: "glide" },
  whiteTailedKite: { soarBias: [0.18, 0.36], flapBursts: [1, 2], hoverChance: 0.78, flightStyle: "hover" },
  osprey: { soarBias: [0.48, 0.68], flapBursts: [1, 2], hoverChance: 0.1, flightStyle: "glide" },
};

const DIFFICULTY = {
  beginner: {
    label: "Beginner",
    minBirds: 3,
    spawnEvery: [1700, 2400],
    maxBirds: 4,
    flightDuration: [9000, 12500],
    farScale: [0.1, 0.14],
    nearScale: [0.3, 0.38],
    thermalMaxBirds: 1,
    thermalSpawnEvery: [10000, 14000],
  },
  expert: {
    label: "Expert",
    minBirds: 4,
    spawnEvery: [1050, 1600],
    maxBirds: 6,
    flightDuration: [8200, 11200],
    farScale: [0.08, 0.13],
    nearScale: [0.25, 0.34],
    thermalMaxBirds: 2,
    thermalSpawnEvery: [7000, 11000],
  },
} satisfies Record<
  Difficulty,
  {
    label: string;
    minBirds: number;
    spawnEvery: [number, number];
    maxBirds: number;
    flightDuration: [number, number];
    farScale: [number, number];
    nearScale: [number, number];
    thermalMaxBirds: number;
    thermalSpawnEvery: [number, number];
  }
>;

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function easeInOut(progress: number) {
  return progress * progress * (3 - 2 * progress);
}

function quadraticBezier(start: number, control: number, end: number, progress: number) {
  const inverse = 1 - progress;
  return inverse * inverse * start + 2 * inverse * progress * control + progress * progress * end;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function smoothNoise(seed: number, t: number): number {
  const i = Math.floor(t);
  const f = t - i;
  const u = fade(f);
  return lerp(hash(seed + i), hash(seed + i + 1), u) * 2 - 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getWind(timestamp: number): { x: number; y: number } {
  const t = timestamp * 0.00008;
  return {
    x: Math.sin(t) * 0.4 + Math.sin(t * 2.3) * 0.2,
    y: Math.cos(t * 0.7) * 0.12,
  };
}

function getBirdBasePosition(bird: Bird, progress: number): { x: number; y: number } {
  if (bird.flightStyle === "hover") {
    if (progress < bird.hoverStart) {
      const approach = easeInOut(progress / bird.hoverStart);
      return {
        x: lerp(bird.startX, bird.hoverX, approach),
        y: lerp(bird.startY, bird.hoverY, approach),
      };
    }

    if (progress <= bird.hoverEnd) {
      const hoverProgress = (progress - bird.hoverStart) / (bird.hoverEnd - bird.hoverStart);
      return {
        x: bird.hoverX + Math.sin(hoverProgress * Math.PI * 2 + bird.phase) * 7,
        y: bird.hoverY + Math.sin(hoverProgress * Math.PI * 4 + bird.altitudePhase) * 4,
      };
    }

    const exit = easeInOut((progress - bird.hoverEnd) / (1 - bird.hoverEnd));
    return {
      x: lerp(bird.hoverX, bird.endX, exit),
      y: lerp(bird.hoverY, bird.endY, exit),
    };
  }

  const eased = easeInOut(progress);
  return {
    x: quadraticBezier(bird.startX, bird.controlX, bird.endX, eased),
    y: quadraticBezier(bird.startY, bird.controlY, bird.endY, eased),
  };
}

function generateFlapCenters(bird: Bird, speciesBehavior: typeof SPECIES_BEHAVIOR[RaptorId]): number[] {
  const count = Math.round(randomBetween(speciesBehavior.flapBursts));
  const centers: number[] = [];

  if (bird.flightStyle === "hover") {
    if (count === 1) return [randomBetween([bird.hoverStart + 0.12, bird.hoverEnd - 0.12])];
    return [bird.hoverStart + 0.14, bird.hoverEnd - 0.14];
  }

  const spacing = 0.72 / count;
  const startOffset = 0.16 + Math.random() * 0.06;

  for (let i = 0; i < count; i++) {
    const base = startOffset + i * spacing;
    const jitter = (Math.random() - 0.5) * spacing * 0.4;
    centers.push(clamp(base + jitter, 0.1, 0.9));
  }

  return centers;
}

function getFlightFrameIndex(bird: Bird, frameCount: number, progress: number) {
  const flapWidth = bird.flightStyle === "hover" ? 0.26 : 0.18;

  for (const center of bird.flapCenters) {
    const distance = Math.abs(progress - center);
    if (distance < flapWidth / 2) {
      const localProgress = (progress - (center - flapWidth / 2)) / flapWidth;
      // Smoothstep easing so we dwell longer on each frame at the extremes
      const eased = localProgress * localProgress * (3 - 2 * localProgress);
      const sequence = [0, 1, 2, 1, 0, 3, 4, 5, 4, 3, 0];
      const sequenceIndex = Math.min(sequence.length - 1, Math.floor(eased * sequence.length));
      return Math.min(sequence[sequenceIndex], frameCount - 1);
    }
  }

  if (bird.flightStyle === "hover") {
    return Math.min(Math.round(1 + Math.sin(progress * Math.PI * 6 + bird.phase) * 0.6), frameCount - 1);
  }

  const glideValue = bird.flightStyle === "teeter"
    ? 0.4 + 0.5 * Math.sin(progress * Math.PI * 2.4 + bird.phase)
    : 0.25 + 0.35 * Math.sin(progress * Math.PI * 1.6 + bird.phase);
  return clamp(Math.round(glideValue), 0, frameCount - 1);
}

function makeCounts(): Counts {
  return makeEmptyCounts();
}

function makeStreaks(): Streaks {
  return makeEmptyCounts();
}

const LAST_SECONDS_WARNING = 10;

let audioContextRef: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioContextRef) return audioContextRef;
  const Ctor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioContextRef = new Ctor();
  return audioContextRef;
}

function playBeep(frequency = 880, durationMs = 220, peakGain = 0.18) {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") {
    void context.resume().catch(() => undefined);
  }
  const now = context.currentTime;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peakGain, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.02);
}

export function App() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const installPromptEventRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === "1") return;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      installPromptEventRef.current = event as BeforeInstallPromptEvent;
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };
    const handleAppInstalled = () => {
      installPromptEventRef.current = null;
      setInstallPromptEvent(null);
      setShowInstallPrompt(false);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const dismissInstallPrompt = useCallback(() => {
    setShowInstallPrompt(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, "1");
    }
  }, []);

  const acceptInstallPrompt = useCallback(async () => {
    const promptEvent = installPromptEventRef.current ?? installPromptEvent;
    if (!promptEvent) {
      dismissInstallPrompt();
      return;
    }
    installPromptEventRef.current = null;
    setInstallPromptEvent(null);
    setShowInstallPrompt(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, "1");
    }
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => undefined);
  }, [installPromptEvent, dismissInstallPrompt]);

  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>("welcome");
  const [playerCounts, setPlayerCounts] = useState<Counts>(() => makeCounts());
  const [actualCounts, setActualCounts] = useState<Counts>(() => makeCounts());
  const [streaks, setStreaks] = useState<Streaks>(() => makeStreaks());
  const [lastStreakEvent, setLastStreakEvent] = useState<{ raptorId: RaptorId; multiplier: number; timestamp: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<HighScore[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [qualifiesForHighScore, setQualifiesForHighScore] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<RaptorId | null>(null);
  const [shownTooltips, setShownTooltips] = useState<Record<RaptorId, boolean>>(() => ({} as Record<RaptorId, boolean>));
  const tooltipTimerRef = useRef<number | null>(null);
  const [bumpedButtons, setBumpedButtons] = useState<Record<RaptorId, boolean>>(() => ({} as Record<RaptorId, boolean>));
  const [floaters, setFloaters] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
  const floaterIdRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameMusicRef = useRef<HTMLAudioElement | null>(null);
  const rthaAudioRef = useRef<HTMLAudioElement | null>(null);
  const rshaAudioRef = useRef<HTMLAudioElement | null>(null);
  const backdropRef = useRef<HTMLImageElement | null>(null);
  const imageMapRef = useRef<Record<string, SpriteAsset> | null>(null);
  const birdsRef = useRef<Bird[]>([]);
  const thermalImageMapRef = useRef<Record<ThermalRaptorId, SpriteAsset> | null>(null);
  const thermalBirdsRef = useRef<ThermalBird[]>([]);
  const actualCountsRef = useRef<Counts>(makeCounts());
  const startTimeRef = useRef(0);
  const lastBeepSecondRef = useRef(0);
  const nextSpawnRef = useRef(0);
  const nextThermalSpawnRef = useRef(0);
  const birdIdRef = useRef(0);
  const thermalBirdIdRef = useRef(0);
  const hasSpawnedMaleHarrierRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const phaseRef = useRef<Phase>("intro");

  const totalActual = useMemo(
    () => RAPTOR_IDS.reduce((sum, id) => sum + actualCounts[id], 0),
    [actualCounts],
  );

  const totalPlayer = useMemo(
    () => RAPTOR_IDS.reduce((sum, id) => sum + playerCounts[id], 0),
    [playerCounts],
  );

  const totalDelta = useMemo(
    () => computeTotalDelta(actualCounts, playerCounts),
    [actualCounts, playerCounts],
  );

  const accuracy = computeAccuracy(actualCounts, playerCounts);

  const scorePerSpecies = useMemo(
    () => computeScorePerSpecies(actualCounts, playerCounts, difficulty),
    [actualCounts, playerCounts, difficulty],
  );

  const totalScore = useMemo(() => computeTotalScore(scorePerSpecies), [scorePerSpecies]);

  const maxScore = useMemo(() => computeMaxScore(actualCounts, difficulty), [actualCounts, difficulty]);

  const cappedTotalScore = computeCappedTotalScore(totalScore, maxScore);

  useEffect(() => {
    const backdrop = new Image();
    backdrop.src = backdropImage;
    backdropRef.current = backdrop;

    const entries = RAPTORS.map((raptor) => {
      const image = new Image();
      image.src = raptor.sheet;
      const asset: SpriteAsset = {
        image,
        width: 0,
        height: 0,
        ready: false,
      };

      image
        .decode()
        .then(() => {
          asset.image = image;
          asset.width = image.naturalWidth;
          asset.height = image.naturalHeight;
          asset.ready = true;
        })
        .catch(() => {
          if (image.complete && image.naturalWidth > 0) {
            asset.width = image.naturalWidth;
            asset.height = image.naturalHeight;
            asset.ready = true;
          }
        });

      return [raptor.key, asset] as const;
    });

    imageMapRef.current = Object.fromEntries(entries) as Record<string, SpriteAsset>;

    const thermalEntries = THERMAL_RAPTORS.map((raptor) => {
      const image = new Image();
      image.src = raptor.image;
      const asset: SpriteAsset = {
        image,
        width: 0,
        height: 0,
        ready: false,
      };

      image
        .decode()
        .then(() => {
          asset.image = image;
          asset.width = image.naturalWidth;
          asset.height = image.naturalHeight;
          asset.ready = true;
        })
        .catch(() => {
          if (image.complete && image.naturalWidth > 0) {
            asset.width = image.naturalWidth;
            asset.height = image.naturalHeight;
            asset.ready = true;
          }
        });

      return [raptor.id, asset] as const;
    });

    thermalImageMapRef.current = Object.fromEntries(thermalEntries) as Record<ThermalRaptorId, SpriteAsset>;
  }, []);

  const spawnBird = useCallback((viewWidth: number, viewHeight: number, timestamp: number) => {
    const config = DIFFICULTY[difficulty];
    const elapsed = startTimeRef.current > 0 ? (timestamp - startTimeRef.current) / 1000 : 0;
    const progress = Math.min(1, elapsed / ROUND_SECONDS);
    
    const speciesPool = Math.floor(progress * SPAWN_RAPTORS.length * 1.5) + 3;
    const availableRaptors = SPAWN_RAPTORS.slice(0, Math.min(speciesPool, SPAWN_RAPTORS.length));
    const forceMaleHarrier = !hasSpawnedMaleHarrierRef.current
      && progress >= 0.75
      && availableRaptors.some((candidate) => candidate.id === "northernHarrier");
    const selectedRaptor = availableRaptors[Math.floor(Math.random() * availableRaptors.length)];
    const shouldUseMaleHarrier = !hasSpawnedMaleHarrierRef.current
      && selectedRaptor.id === "northernHarrier"
      && progress >= MALE_HARRIER_MIN_ROUND_PROGRESS
      && Math.random() < MALE_HARRIER_CHANCE;
    const raptor = (forceMaleHarrier || shouldUseMaleHarrier) && MALE_NORTHERN_HARRIER
      ? MALE_NORTHERN_HARRIER
      : selectedRaptor;

    if (raptor.key === "northernHarrierMale") {
      hasSpawnedMaleHarrierRef.current = true;
    }
    
    const behavior = SPECIES_BEHAVIOR[raptor.id];
    const flightStyle = Math.random() < behavior.hoverChance ? "hover" : behavior.flightStyle;
    const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
    const edgePadding = viewWidth * 0.12;
    const startX = direction === 1 ? -edgePadding : viewWidth + edgePadding;
    const endX = direction === 1 ? viewWidth + edgePadding : -edgePadding;
    const startY = randomBetween([viewHeight * 0.16, viewHeight * 0.42]);
    const endY = startY + randomBetween([-viewHeight * 0.05, viewHeight * 0.08]);
    const controlY = (startY + endY) / 2 + randomBetween([-viewHeight * 0.06, viewHeight * 0.06]);
    const controlX = viewWidth / 2 + randomBetween([-viewWidth * 0.08, viewWidth * 0.08]);
    const hoverX = randomBetween([viewWidth * 0.38, viewWidth * 0.62]);
    const hoverY = randomBetween([viewHeight * 0.18, viewHeight * 0.38]);
    const hoverStart = randomBetween([0.2, 0.28]);
    const hoverEnd = randomBetween([0.68, 0.78]);
    
    const bird: Bird = {
      id: birdIdRef.current,
      raptorKey: raptor.key,
      raptorId: raptor.id,
      flightStyle,
      direction,
      startX,
      startY,
      hoverX,
      hoverY,
      hoverStart,
      hoverEnd,
      controlX,
      controlY,
      endX,
      endY,
      startedAt: timestamp,
      duration: randomBetween(config.flightDuration),
      farScale: randomBetween(config.farScale),
      nearScale: randomBetween(config.nearScale),
      bank: randomBetween([-0.035, 0.035]),
      bob: randomBetween([1, 3]),
      phase: Math.random() * Math.PI * 2,
      flapOffset: Math.random() * 0.06,
      noiseSeed: Math.random() * 10000,
      soarBias: randomBetween(behavior.soarBias),
      flapCenters: [],
      altitudePhase: Math.random() * Math.PI * 2,
      altitudeAmp: randomBetween([viewHeight * 0.02, viewHeight * 0.05]),
    };
    
    bird.flapCenters = generateFlapCenters(bird, behavior);

    birdIdRef.current += 1;
    birdsRef.current.push(bird);
    actualCountsRef.current[raptor.id] += 1;
  }, [difficulty]);

  const spawnThermalBird = useCallback((viewWidth: number, viewHeight: number, timestamp: number) => {
    const raptor = THERMAL_RAPTORS[Math.floor(Math.random() * THERMAL_RAPTORS.length)];
    const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    // Enter just off one edge and exit off the other so the crossing reads as continuous flight.
    const margin = viewWidth * 0.14;
    const startX = direction === 1 ? -margin : viewWidth + margin;
    const endX = direction === 1 ? viewWidth + margin : -margin;
    // Settle into the top band, leaving room for the soaring scallops.
    const glideAmp = randomBetween([viewHeight * 0.012, viewHeight * 0.024]);
    const loopAmpY = randomBetween([viewHeight * 0.01, viewHeight * 0.022]);
    const verticalReach = glideAmp + loopAmpY;
    const minY = viewHeight * THERMAL_TOP_BAND.min + verticalReach + viewHeight * 0.01;
    const maxY = viewHeight * THERMAL_TOP_BAND.max - verticalReach - viewHeight * 0.01;
    const baseY = randomBetween([minY, Math.max(minY, maxY)]);
    const bird: ThermalBird = {
      id: thermalBirdIdRef.current,
      raptorId: raptor.id,
      startedAt: timestamp,
      // Far-away birds cross slowly; the long duration keeps the drift gentle.
      duration: randomBetween([26000, 38000]),
      direction,
      startX,
      endX,
      baseY,
      glideAmp,
      glidePhase: Math.random() * Math.PI * 2,
      // A few lazy circling loops layered onto the crossing, as raptors do on a thermal.
      loopCount: randomBetween([2.5, 4.5]),
      loopAmpX: randomBetween([viewWidth * 0.018, viewWidth * 0.032]),
      loopAmpY,
      baseScale: randomBetween([0.03, 0.046]),
      sizeRatio: raptor.sizeRatio,
      turnDirection: Math.random() > 0.5 ? 1 : -1,
      bankPhase: Math.random() * Math.PI * 2,
      alpha: randomBetween([0.55, 0.72]),
      altitudePhase: Math.random() * Math.PI * 2,
      altitudeAmp: randomBetween([viewHeight * 0.003, viewHeight * 0.007]),
      wobble: randomBetween([0.003, 0.008]),
    };

    thermalBirdIdRef.current += 1;
    thermalBirdsRef.current.push(bird);
    actualCountsRef.current[raptor.id] += 1;
  }, []);

  const drawScene = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    const images = imageMapRef.current;
    const thermalImages = thermalImageMapRef.current;
    if (!canvas || !images || !thermalImages) return;
    const currentPhase = phaseRef.current;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const viewWidth = width / dpr;
    const viewHeight = height / dpr;

    drawBackdrop(ctx, viewWidth, viewHeight, backdropRef.current);

    birdsRef.current = birdsRef.current.filter((bird) => (timestamp - bird.startedAt) / bird.duration < 1.08);
    thermalBirdsRef.current = thermalBirdsRef.current.filter((bird) => (timestamp - bird.startedAt) / bird.duration < 1.02);

    if (currentPhase === "playing") {
      const config = DIFFICULTY[difficulty];
      while (birdsRef.current.length < config.minBirds) {
        spawnBird(viewWidth, viewHeight, timestamp - randomBetween([0, 2400]));
        nextSpawnRef.current = timestamp + randomBetween(config.spawnEvery) * 0.55;
      }

      if (timestamp >= nextSpawnRef.current && birdsRef.current.length < config.maxBirds) {
        spawnBird(viewWidth, viewHeight, timestamp);
        nextSpawnRef.current = timestamp + randomBetween(config.spawnEvery);
      }

      if (timestamp >= nextThermalSpawnRef.current && thermalBirdsRef.current.length < config.thermalMaxBirds) {
        spawnThermalBird(viewWidth, viewHeight, timestamp);
        nextThermalSpawnRef.current = timestamp + randomBetween(config.thermalSpawnEvery);
      }
    }

    const wind = getWind(timestamp);
    const visibleThermalBirds = thermalBirdsRef.current
      .map((bird) => {
        const sprite = thermalImages[bird.raptorId];
        if (!sprite?.ready || sprite.width === 0) return null;

        const progress = Math.min(1, Math.max(0, (timestamp - bird.startedAt) / bird.duration));
        // Position along the soaring path: a steady crossing with lazy circling
        // looped on top. Factored out so we can sample it slightly ahead to find
        // the heading and keep the bird's head pointed where it's going.
        const positionAt = (p: number) => {
          const eased = p * p * (3 - 2 * p);
          const loopAngle = bird.turnDirection * (bird.glidePhase + p * bird.loopCount * Math.PI * 2);
          const px = lerp(bird.startX, bird.endX, eased) + Math.cos(loopAngle) * bird.loopAmpX;
          const py = bird.baseY
            + Math.sin(p * Math.PI * 2 + bird.glidePhase) * bird.glideAmp
            + Math.sin(loopAngle) * bird.loopAmpY
            + Math.sin(p * Math.PI * 6 + bird.altitudePhase) * bird.altitudeAmp;
          return { px, py };
        };

        const here = positionAt(progress);
        const ahead = positionAt(Math.min(1, progress + 0.004));
        const x = here.px;
        const y = clamp(here.py, viewHeight * THERMAL_TOP_BAND.min, viewHeight * THERMAL_TOP_BAND.max);
        // Fade in/out near the edges so birds don't pop on and off screen.
        const fadeEnvelope = clamp(Math.min(progress, 1 - progress) / 0.12, 0, 1);
        const scale = bird.baseScale * bird.sizeRatio;
        // Point the head (sprite's "up") along the direction of travel, plus a
        // faint teeter so it doesn't look rigidly locked to the path.
        const heading = Math.atan2(ahead.py - here.py, ahead.px - here.px) + Math.PI / 2;
        const rotation = heading + Math.sin(progress * Math.PI * 4 + bird.bankPhase) * bird.wobble;
        const alpha = bird.alpha * fadeEnvelope;

        return {
          bird,
          x,
          y,
          scale,
          rotation,
          alpha,
          sprite,
        };
      })
      .filter((bird): bird is NonNullable<typeof bird> => Boolean(bird))
      .sort((a, b) => a.scale - b.scale);

    for (const thermalBird of visibleThermalBirds) {
      const { x, y, scale, rotation, alpha, sprite } = thermalBird;
      const drawWidth = sprite.width * scale;
      const drawHeight = sprite.height * scale;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = "rgba(17, 34, 42, 0.1)";
      ctx.shadowBlur = 4 + scale * 8;
      ctx.shadowOffsetY = 2 + scale * 6;
      ctx.drawImage(sprite.image, 0, 0, sprite.width, sprite.height, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
    }

    const visibleBirds = birdsRef.current
      .map((bird) => {
        const rawProgress = (timestamp - bird.startedAt) / bird.duration;
        const progress = Math.min(1, Math.max(0, rawProgress));
        const overhead = Math.sin(Math.PI * progress);
        
        const base = getBirdBasePosition(bird, progress);
        
        const noiseScale = bird.flightStyle === "hover" ? 0.25 : 1;
        const noiseX = smoothNoise(bird.noiseSeed, progress * 3) * viewWidth * 0.04 * noiseScale;
        const noiseY = smoothNoise(bird.noiseSeed + 100, progress * 3) * viewHeight * 0.03 * noiseScale;
        
        const altitudeVar = Math.sin(progress * Math.PI * 4 + bird.altitudePhase) * bird.altitudeAmp * noiseScale;
        
        const windEffect = 1 - overhead * 0.5;
        const windX = wind.x * viewWidth * 0.08 * windEffect * noiseScale;
        const windY = wind.y * viewHeight * 0.05 * windEffect * noiseScale;
        
        const x = base.x + noiseX + windX;
        const y = base.y + noiseY + windY + altitudeVar
          + Math.sin(timestamp * 0.0014 + bird.phase) * bird.bob;
        
        const prevProgress = Math.max(0, progress - 0.02);
        const prevBase = getBirdBasePosition(bird, prevProgress);
        
        const nextProgress = Math.min(1, progress + 0.02);
        const nextBase = getBirdBasePosition(bird, nextProgress);
        
        const dx = nextBase.x - prevBase.x;
        const dy = nextBase.y - prevBase.y;
        const velocity = Math.sqrt(dx * dx + dy * dy);
        const curveX = nextBase.x - base.x;
        const curveY = nextBase.y - base.y;
        const curvature = Math.abs(dx * curveY - dy * curveX) / (velocity * velocity + 1);
        
        const bankFromCurvature = clamp(curvature * bird.direction * 4, -0.18, 0.18);
        const pitchFromVelocity = clamp(Math.atan2(dy, Math.max(1, Math.abs(dx))) * 0.35, -0.16, 0.16);
        const teeter = bird.flightStyle === "teeter" ? Math.sin(progress * Math.PI * 7 + bird.phase) * 0.16 : 0;
        const hoverFacing = bird.flightStyle === "hover" && progress >= bird.hoverStart && progress <= bird.hoverEnd
          ? Math.sin(progress * Math.PI * 6 + bird.phase) * 0.04
          : 0;
        const rotation = clamp(
          bird.bank + bankFromCurvature + Math.sin(progress * Math.PI * 2 + bird.phase) * 0.018 + pitchFromVelocity + teeter + hoverFacing,
          -0.32,
          0.32,
        );
        
        const raptorConfig = RAPTORS.find((r) => r.key === bird.raptorKey);
        const speciesScale = raptorConfig?.sizeScale ?? 1;
        const scale = lerp(bird.farScale, bird.nearScale, Math.pow(overhead, 1.12)) * speciesScale;
        const alpha = lerp(0.7, 1, Math.pow(overhead, 0.5));

        return {
          bird,
          progress,
          x,
          y,
          scale,
          alpha,
          rotation,
        };
      })
      .sort((a, b) => a.scale - b.scale);

    const separationDist = 60;
    for (let i = 0; i < visibleBirds.length; i++) {
      const bird = visibleBirds[i];
      let sepX = 0;
      let sepY = 0;
      let sepCount = 0;
      
      for (let j = 0; j < visibleBirds.length; j++) {
        if (i === j) continue;
        const other = visibleBirds[j];
        const dx = bird.x - other.x;
        const dy = bird.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < separationDist && dist > 0) {
          sepX += (dx / dist) * (separationDist - dist);
          sepY += (dy / dist) * (separationDist - dist);
          sepCount++;
        }
      }
      
      if (sepCount > 0) {
        bird.x += (sepX / sepCount) * 0.5;
        bird.y += (sepY / sepCount) * 0.5;
      }
    }

    for (const visibleBird of visibleBirds) {
      const { bird, progress, x, y, scale, alpha, rotation } = visibleBird;
      const sprite = images[bird.raptorKey];
      if (!sprite.ready || sprite.width === 0) continue;

      const raptorConfig = RAPTORS.find((r) => r.key === bird.raptorKey);
      if (!raptorConfig) continue;

      const frames = raptorConfig.frames;
      const frameIndex = getFlightFrameIndex(bird, frames.length, progress);
      const { sx, sy, sw, sh } = frames[frameIndex];
      const drawWidth = sw * scale;
      const drawHeight = sh * scale;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      if (bird.direction < 0) ctx.scale(-1, 1);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = "rgba(16, 42, 47, 0.18)";
      ctx.shadowBlur = 6 + scale * 10;
      ctx.shadowOffsetY = 3 + scale * 8;
      ctx.drawImage(sprite.image, sx, sy, sw, sh, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
    }
  }, [difficulty, spawnBird]);

  useEffect(() => {
    if (phase !== "playing") return undefined;

    lastBeepSecondRef.current = 0;

    const tick = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
        nextSpawnRef.current = timestamp + 450;
        nextThermalSpawnRef.current = timestamp + 1400;
        lastFrameRef.current = timestamp;
      }

      lastFrameRef.current = timestamp;
      const elapsed = (timestamp - startTimeRef.current) / 1000;
      const remaining = ROUND_SECONDS - elapsed;

      drawScene(timestamp);
      setTimeLeft(remaining);

      const beepSecond = Math.ceil(remaining);
      const beep = getFinalCountdownBeep(beepSecond);
      if (beep && beepSecond !== lastBeepSecondRef.current) {
        lastBeepSecondRef.current = beepSecond;
        playBeep(beep.frequency, beep.durationMs, beep.peakGain);
      }

      if (remaining <= 0) {
        setActualCounts({ ...actualCountsRef.current });
        setPhase("results");
        if (typeof window !== "undefined") {
          window.localStorage.setItem("kestrel.tutorialSeen", "1");
        }
        return;
      }

      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    };
  }, [drawScene, phase]);

  useEffect(() => {
    if (phase !== "promo") return undefined;

    const fallback = window.setTimeout(() => {
      startTutorial();
    }, PROMO_FALLBACK_MS);

    return () => window.clearTimeout(fallback);
  }, [phase]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden && animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  useEffect(() => {
    const audio = gameMusicRef.current;
    if (!audio) return;

    if (phase === "promo" || phase === "tutorial" || phase === "countdown" || phase === "playing") {
      void audio.play().catch(() => undefined);
      return;
    }

    audio.pause();
    audio.currentTime = 0;
  }, [phase]);

  useEffect(() => {
    return () => {
      gameMusicRef.current?.pause();
      rthaAudioRef.current?.pause();
      rshaAudioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    const rtha = rthaAudioRef.current;
    const rsha = rshaAudioRef.current;
    if (rtha) rtha.volume = 0.15;
    if (rsha) rsha.volume = 0.15;

    // Play the ambient intro calls whenever we're on the home screen *and* audio
    // is unlocked. Read phase from the ref so a gesture firing right as the phase
    // flips still sees the current value.
    const playIntroSounds = () => {
      if (phaseRef.current !== "intro") return;
      void rtha?.play().catch(() => undefined);
      void rsha?.play().catch(() => undefined);
    };

    if (phase === "intro") {
      playIntroSounds();
    } else {
      rtha?.pause();
      if (rtha) rtha.currentTime = 0;
      rsha?.pause();
      if (rsha) rsha.currentTime = 0;
    }
  }, [phase]);

  // On a fresh load the browser blocks audio.play() until the first user gesture,
  // which is usually the click that leaves the intro — so the intro calls never
  // got a chance. Register a one-time, phase-independent unlock that retries the
  // intro sounds the moment the user first interacts with the page.
  useEffect(() => {
    const unlock = () => {
      if (phaseRef.current !== "intro") return;
      void rthaAudioRef.current?.play().catch(() => undefined);
      void rshaAudioRef.current?.play().catch(() => undefined);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const startGameMusic = () => {
    const audio = gameMusicRef.current;
    if (!audio) return;

    audio.volume = 0.42;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  };

  const prepareRound = (selectedDifficulty = difficulty) => {
    setDifficulty(selectedDifficulty);
    setPlayerCounts(makeCounts());
    setActualCounts(makeCounts());
    setStreaks(makeStreaks());
    setLastStreakEvent(null);
    setTimeLeft(ROUND_SECONDS);
    setCountdown(3);
    actualCountsRef.current = makeCounts();
    birdsRef.current = [];
    thermalBirdsRef.current = [];
    startTimeRef.current = 0;
    lastFrameRef.current = 0;
    nextSpawnRef.current = 0;
    nextThermalSpawnRef.current = 0;
    birdIdRef.current = 0;
    thermalBirdIdRef.current = 0;
    hasSpawnedMaleHarrierRef.current = false;
    startGameMusic();
    setPhase("promo");
  };

  const startRound = () => {
    setTimeLeft(ROUND_SECONDS);
    startTimeRef.current = 0;
    lastFrameRef.current = 0;
    nextSpawnRef.current = 0;
    nextThermalSpawnRef.current = 0;
    thermalBirdsRef.current = [];
    setPhase("playing");
  };

  const quitRound = () => {
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    birdsRef.current = [];
    thermalBirdsRef.current = [];
    startTimeRef.current = 0;
    lastFrameRef.current = 0;
    nextSpawnRef.current = 0;
    nextThermalSpawnRef.current = 0;
    setPhase("intro");
    if (typeof window !== "undefined") {
      window.localStorage.setItem("kestrel.tutorialSeen", "1");
    }
  };

  const completeTutorial = () => {
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    birdsRef.current = [];
    thermalBirdsRef.current = [];
    setPhase("countdown");
  };

  const startTutorial = () => {
    setTutorialStep("welcome");
    setPhase("tutorial");
  };

  const advanceTutorial = (raptorId: RaptorId) => {
    const nextId = TUTORIAL_SEQUENCE[TUTORIAL_SEQUENCE.indexOf(raptorId as TutorialRaptorId) + 1];
    setTutorialStep(nextId ?? "success");
  };

  useEffect(() => {
    if (phase !== "tutorial") return undefined;

    birdsRef.current = [];
    thermalBirdsRef.current = [];
    startTimeRef.current = 0;
    lastFrameRef.current = 0;

    const spawnTutorialBird = (raptorId: RaptorId, viewWidth: number, viewHeight: number, timestamp: number) => {
      const raptor = RAPTORS.find((r) => r.id === raptorId && r.key !== "northernHarrierMale");
      if (!raptor) return;
      const behavior = SPECIES_BEHAVIOR[raptor.id];
      const isHover = raptor.id === "americanKestrel";
      const bird: Bird = {
        id: birdIdRef.current++,
        raptorKey: raptor.key,
        raptorId: raptor.id,
        flightStyle: isHover ? "hover" : behavior.flightStyle,
        direction: 1,
        startX: -viewWidth * 0.18,
        startY: viewHeight * (isHover ? 0.42 : 0.34),
        hoverX: viewWidth * 0.5,
        hoverY: viewHeight * (isHover ? 0.36 : 0.3),
        hoverStart: 0.18,
        hoverEnd: 0.82,
        controlX: viewWidth * 0.5,
        controlY: viewHeight * (isHover ? 0.36 : 0.2),
        endX: viewWidth * 1.18,
        endY: viewHeight * (isHover ? 0.42 : 0.34),
        startedAt: timestamp,
        duration: isHover ? 9000 : 7600,
        farScale: 0.18,
        nearScale: isHover ? 0.42 : 0.36,
        bank: 0,
        bob: isHover ? 2 : 1,
        phase: 0,
        flapOffset: 0,
        noiseSeed: 1,
        soarBias: behavior.soarBias[1],
        flapCenters: [],
        altitudePhase: 0,
        altitudeAmp: viewHeight * 0.03,
      };
      bird.flapCenters = generateFlapCenters(bird, behavior);
      birdsRef.current = [bird];
    };

    const tick = (timestamp: number) => {
      if (phaseRef.current !== "tutorial") return;

      const activeRaptorId = TUTORIAL_SEQUENCE.find((id) => id === tutorialStep);
      if (activeRaptorId) {
        if (!startTimeRef.current) {
          startTimeRef.current = timestamp;
        }
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const currentBird = birdsRef.current[0];
          if (currentBird?.raptorId !== activeRaptorId || (currentBird && (timestamp - currentBird.startedAt) > currentBird.duration)) {
            spawnTutorialBird(activeRaptorId, rect.width, rect.height, timestamp);
          }
        }
      } else {
        birdsRef.current = [];
        thermalBirdsRef.current = [];
        startTimeRef.current = 0;
      }

      lastFrameRef.current = timestamp;
      drawScene(timestamp);
      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      birdsRef.current = [];
      thermalBirdsRef.current = [];
    };
  }, [drawScene, phase, tutorialStep]);

  useEffect(() => {
    if (phase !== "countdown") return undefined;

    setCountdown(3);
    const interval = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          startRound();
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase]);

  const fetchLeaderboard = useCallback(async () => {
    setIsLeaderboardLoading(true);
    setLeaderboardError("");
    const { data, error } = await supabase
      .from("kestrel_high_scores")
      .select("*")
      .eq("level", difficulty)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(LEADERBOARD_FETCH_LIMIT);

    setIsLeaderboardLoading(false);

    if (error) {
      setLeaderboardError("Could not load high scores. Check the Supabase table and RLS policies.");
      return;
    }

    const scores = dedupeHighScores((data ?? []) as HighScore[]);
    setLeaderboard(scores);
    if (phase === "results") {
      const qualifies = scores.length < LEADERBOARD_SIZE || totalScore > (scores[scores.length - 1]?.score ?? 0);
      setQualifiesForHighScore(qualifies && totalScore > 0);
    }
  }, [difficulty, phase, totalScore]);

  useEffect(() => {
    if (phase !== "results") {
      setQualifiesForHighScore(false);
      setHasSubmitted(false);
      setPlayerName("");
      setSubmitError("");
      setLeaderboardError("");
      setIsLeaderboardLoading(false);
      setShowBreakdown(false);
      return undefined;
    }

    fetchLeaderboard();

    const channel = supabase
      .channel("high_scores_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kestrel_high_scores" },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [phase, fetchLeaderboard]);

  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError("");

    const trimmedName = playerName.trim();
    const normalizedName = normalizePlayerName(trimmedName);

    const { data: existing, error: lookupError } = await supabase
      .from("kestrel_high_scores")
      .select("id, score, player_name")
      .eq("level", difficulty)
      .ilike("player_name", trimmedName)
      .order("score", { ascending: false })
      .limit(LEADERBOARD_FETCH_LIMIT);

    if (lookupError) {
      setIsSubmitting(false);
      setSubmitError(lookupError.message || "Could not check existing scores.");
      return;
    }

    const bestExisting = (existing ?? []).find((entry) => normalizePlayerName(entry.player_name) === normalizedName)
      ?? existing?.[0];
    if (bestExisting && bestExisting.score >= totalScore) {
      setIsSubmitting(false);
      setHasSubmitted(true);
      setQualifiesForHighScore(false);
      await fetchLeaderboard();
      return;
    }

    const baseScorePayload = {
      player_name: trimmedName,
      score: totalScore,
      level: difficulty,
      accuracy,
      total_counted: totalPlayer,
      total_actual: totalActual,
      kestrel_count: playerCounts.americanKestrel,
      coopers_hawk_count: playerCounts.coopersHawk,
      golden_eagle_count: playerCounts.goldenEagle,
      northern_harrier_count: playerCounts.northernHarrier,
      red_shouldered_hawk_count: playerCounts.redShoulderedHawk,
      red_tailed_hawk_count: playerCounts.redTailedHawk,
      turkey_vulture_count: playerCounts.turkeyVulture,
    };

    const fullScorePayload = {
      ...baseScorePayload,
      bald_eagle_count: playerCounts.baldEagle,
      white_tailed_kite_count: playerCounts.whiteTailedKite,
      osprey_count: playerCounts.osprey,
    };

    let error: { message?: string } | null = null;

    if (bestExisting) {
      const updateResult = await supabase
        .from("kestrel_high_scores")
        .update(fullScorePayload)
        .eq("id", bestExisting.id);
      error = updateResult.error;

      if (error && error.message?.toLowerCase().includes("column")) {
        const retry = await supabase
          .from("kestrel_high_scores")
          .update(baseScorePayload)
          .eq("id", bestExisting.id);
        error = retry.error;
      }
    } else {
      const insertResult = await supabase
        .from("kestrel_high_scores")
        .insert([fullScorePayload]);
      error = insertResult.error;

      if (error && error.message?.toLowerCase().includes("column")) {
        const retry = await supabase
          .from("kestrel_high_scores")
          .insert([baseScorePayload]);
        error = retry.error;
      }
    }

    setIsSubmitting(false);

    if (error) {
      setSubmitError(error.message || "Could not save high score.");
      return;
    }

    setHasSubmitted(true);
    setQualifiesForHighScore(false);
    await fetchLeaderboard();
  };

  const countRaptor = (raptorId: RaptorId) => {
    if (phase !== "playing") return;
    setPlayerCounts((current) => ({
      ...current,
      [raptorId]: current[raptorId] + 1,
    }));
    
    setStreaks((current) => {
      const actual = actualCountsRef.current[raptorId];
      const playerNewCount = playerCounts[raptorId] + 1;
      const isExact = playerNewCount === actual;
      const isClose = Math.abs(playerNewCount - actual) <= 1;
      
      if (isExact) {
        const newStreak = current[raptorId] + 1;
        const multiplier = getMultiplier(newStreak);
        if (multiplier > 1) {
          setLastStreakEvent({ raptorId, multiplier, timestamp: Date.now() });
        }
        return { ...current, [raptorId]: newStreak };
      } else if (isClose) {
        return { ...current, [raptorId]: 0 };
      } else {
        return { ...current, [raptorId]: 0 };
      }
    });
  };

  const triggerTooltip = (raptorId: RaptorId) => {
    if (typeof window !== "undefined" && window.localStorage.getItem("kestrel.tutorialSeen")) return;
    if (shownTooltips[raptorId]) return;
    setActiveTooltip(raptorId);
    setShownTooltips((prev) => ({ ...prev, [raptorId]: true }));
    if (tooltipTimerRef.current) {
      window.clearTimeout(tooltipTimerRef.current);
    }
    tooltipTimerRef.current = window.setTimeout(() => {
      setActiveTooltip(null);
      tooltipTimerRef.current = null;
    }, 2000);
  };

  const registerRaptorTapFeedback = (raptorId: RaptorId) => {
    playBeep(1200, 60, 0.05);
    window.navigator.vibrate?.(35);

    setBumpedButtons((prev) => ({ ...prev, [raptorId]: true }));
    window.setTimeout(() => {
      setBumpedButtons((prev) => ({ ...prev, [raptorId]: false }));
    }, 180);
  };

  const handleRaptorButtonClick = (e: React.MouseEvent<HTMLButtonElement>, raptorId: RaptorId) => {
    registerRaptorTapFeedback(raptorId);
    countRaptor(raptorId);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const newFloater = {
      id: floaterIdRef.current++,
      x,
      y,
      text: "+1",
    };
    setFloaters((prev) => [...prev, newFloater]);
    window.setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== newFloater.id));
    }, 800);

    setActiveTooltip(null);
    if (tooltipTimerRef.current) {
      window.clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
  };

  return (
    <main className="app-shell">
      <audio ref={gameMusicRef} src={gameSong} loop preload="auto" />
      <audio ref={rthaAudioRef} src={rthaSound} loop preload="auto" />
      <audio ref={rshaAudioRef} src={rshaSound} loop preload="auto" />
      <section className="orientation-lock">
        <Smartphone aria-hidden="true" />
        <h1>Rotate to landscape</h1>
        <p>This game is designed for a wide field of view on phones, tablets, and laptops.</p>
      </section>

      {phase === "intro" && (
        <section className="intro-screen">
          <video className="intro-video" poster={posterImage} src={introVideo} autoPlay muted loop playsInline />
          <img src={logoImage} className="intro-top-logo" alt="SFBBO logo" />
          <div className="intro-overlay">
            {showInstallPrompt && (
              <div className="install-prompt" role="dialog" aria-label="Install app">
                <Download aria-hidden="true" />
                <div className="install-prompt-copy">
                  <strong>Install for the best experience</strong>
                  <span>Add to your home screen for fullscreen play and offline access.</span>
                </div>
                <div className="install-prompt-actions">
                  <button className="secondary-action" type="button" onClick={dismissInstallPrompt}>
                    Not now
                  </button>
                  <button className="primary-action" type="button" onClick={acceptInstallPrompt}>
                    Install
                  </button>
                </div>
              </div>
            )}
            <div className="difficulty-card" aria-label="Select difficulty">
              {(Object.keys(DIFFICULTY) as Difficulty[]).map((level) => (
                <button
                  className={difficulty === level ? "difficulty-button selected" : "difficulty-button"}
                  key={level}
                  onClick={() => setDifficulty(level)}
                  type="button"
                >
                  {level === "beginner" ? <Gauge aria-hidden="true" /> : <Target aria-hidden="true" />}
                  <span>{DIFFICULTY[level].label}</span>
                </button>
              ))}
            </div>
            <button className="primary-action" type="button" onPointerDown={startGameMusic} onClick={() => prepareRound()}>
              <Play aria-hidden="true" />
              Start round
            </button>
          </div>
        </section>
      )}

      {phase === "promo" && (
        <section className="promo-screen">
          <video
            className="promo-video"
            src={promoVideo}
            poster={posterImage}
            autoPlay
            muted
            playsInline
            onEnded={() => startTutorial()}
            onError={() => startTutorial()}
          />
          <div className="promo-status">
            <button className="skip-promo-button" type="button" onClick={() => startTutorial()}>
              <SkipForward aria-hidden="true" />
              Skip promo
            </button>
          </div>
        </section>
      )}

      {phase === "tutorial" && (
        <section className="game-screen tutorial-screen">
          <canvas ref={canvasRef} className="game-canvas" aria-label="Tutorial bird flying" />
          
          {tutorialStep === "welcome" && (
            <div className="tutorial-card" role="dialog" aria-live="polite">
              <strong>Learn the Basics</strong>
              <p>You will have 60 seconds to identify and count raptors flying across the sky. Let's practice first.</p>
              <div className="tutorial-button-group">
                <button className="primary-action" type="button" onClick={() => setTutorialStep("americanKestrel")}>
                  <Play aria-hidden="true" />
                  Show Me a Raptor
                </button>
                <button className="secondary-action-text" type="button" onClick={completeTutorial}>
                  Skip tutorial
                </button>
              </div>
            </div>
          )}

          {TUTORIAL_SEQUENCE.map((raptorId) => tutorialStep === raptorId && (
            <div className="tutorial-card" role="dialog" aria-live="polite" key={raptorId}>
              <strong>{TUTORIAL_COPY[raptorId].title}</strong>
              <p>{TUTORIAL_COPY[raptorId].body}</p>
              <button className="secondary-action-text" style={{ marginTop: "10px" }} type="button" onClick={completeTutorial}>
                Skip tutorial
              </button>
            </div>
          ))}

          {tutorialStep === "success" && (
            <div className="tutorial-card" role="dialog" aria-live="polite">
              <strong>Spot on!</strong>
              <p>You identified the Kestrel, Red-tailed Hawk, and Turkey Vulture. Keep using the highlighted buttons in the game when each raptor appears.</p>
              <button className="primary-action" type="button" onClick={completeTutorial}>
                <Play aria-hidden="true" />
                Start the game
              </button>
            </div>
          )}

          <div className="tap-panel tap-panel-tutorial" aria-label="Raptor counters (tutorial)">
            {TUTORIAL_RAPTORS.map((raptor) => {
              const isSpotlight = tutorialStep === raptor.id;
              const isDimmed = TUTORIAL_SEQUENCE.some((id) => id === tutorialStep) && !isSpotlight;
              const handleBtnClick = () => {
                registerRaptorTapFeedback(raptor.id);
                if (isSpotlight) {
                  advanceTutorial(raptor.id);
                }
              };
              return (
                <button
                  className={`raptor-button ${isSpotlight ? "tutorial-spotlight" : isDimmed ? "tutorial-dim" : ""} ${bumpedButtons[raptor.id] ? "bumped" : ""}`}
                  key={raptor.id}
                  onClick={handleBtnClick}
                  style={{ "--raptor-color": raptor.tint } as React.CSSProperties}
                  type="button"
                  aria-label={isSpotlight ? "Tap to finish tutorial" : raptor.shortName}
                >
                  <div className="raptor-button-header">
                    <img src={raptor.profile} className="raptor-button-profile-pic" alt="" />
                    <span className="raptor-button-name">{raptor.shortName}</span>
                  </div>
                  {isSpotlight && (
                    <span className="tutorial-hand" aria-hidden="true">
                      <Hand />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {phase === "countdown" && (
        <section className="game-screen countdown-screen">
          <canvas ref={canvasRef} className="game-canvas" aria-label="Raptor count starting field" />
          <div className="countdown-card" aria-live="polite">
            <span>Round starts in</span>
            <strong>{countdown}</strong>
          </div>
        </section>
      )}

      {phase === "playing" && (
        <section className="game-screen">
          <canvas ref={canvasRef} className="game-canvas" aria-label="Raptors flying across the sky" />
          {lastStreakEvent && Date.now() - lastStreakEvent.timestamp < 1500 && (
            <div className="streak-flash" key={lastStreakEvent.timestamp}>
              <span className="streak-multiplier">{lastStreakEvent.multiplier}x</span>
              <span className="streak-label">COMBO!</span>
            </div>
          )}
          <header className="hud">
            <div className={timeLeft <= LAST_SECONDS_WARNING ? "hud-item hud-timer warning" : "hud-item hud-timer"}>
              <Clock3 aria-hidden="true" />
              <span>{formatTime(timeLeft)}</span>
            </div>
            <div className="hud-item">
              <Target aria-hidden="true" />
              <span>{DIFFICULTY[difficulty].label}</span>
            </div>
            {Math.max(...Object.values(streaks)) >= 2 && (
              <div className="hud-item streak-hud">
                <span className="streak-indicator">
                  {getMultiplier(Math.max(...Object.values(streaks)))}x STREAK
                </span>
              </div>
            )}
            <button
              className="hud-item hud-quit-button"
              type="button"
              onClick={quitRound}
              aria-label="Quit round and return to home"
            >
              <X aria-hidden="true" />
              <span>Quit</span>
            </button>
          </header>
          <div className="tap-panel" aria-label="Raptor counters">
            {UNIQUE_RAPTORS.map((raptor) => (
              <button
                className={`raptor-button ${streaks[raptor.id] >= 2 ? 'has-streak' : ''} ${bumpedButtons[raptor.id] ? 'bumped' : ''}`}
                key={raptor.id}
                onClick={(e) => handleRaptorButtonClick(e, raptor.id)}
                onMouseEnter={() => triggerTooltip(raptor.id)}
                onFocus={() => triggerTooltip(raptor.id)}
                style={{ "--raptor-color": raptor.tint } as React.CSSProperties}
                type="button"
              >
                {activeTooltip === raptor.id && (
                  <div className="raptor-tooltip" role="tooltip">
                    <strong>{raptor.name}</strong> — {raptor.fact}
                  </div>
                )}
                <div className="raptor-button-header">
                  <img src={raptor.profile} className="raptor-button-profile-pic" alt="" />
                  <span className="raptor-button-name">{raptor.shortName}</span>
                </div>
                <span className="raptor-button-footer">
                  <strong className="raptor-button-count">{playerCounts[raptor.id]}</strong>
                  {streaks[raptor.id] >= 2 && (
                    <span className="button-streak">{getMultiplier(streaks[raptor.id])}x<span className="button-streak-label"> streak</span></span>
                  )}
                </span>
              </button>
            ))}
          </div>

          {floaters.length > 0 && (
            <div className="floater-container">
              {floaters.map((f) => (
                <span key={f.id} className="floater-text" style={{ left: f.x, top: f.y }}>
                  {f.text}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {phase === "results" && (
        <section className="results-screen">
          <div className="results-panel">
            <div className="results-summary">
              <header className="results-hero">
                <span className="results-eyebrow">Round complete</span>
                <h1>{accuracy}% accuracy</h1>
                <p className="score-display">
                  <strong>{cappedTotalScore}</strong>
                  <span> of {maxScore} points</span>
                </p>
              </header>

              <div className="results-stats">
                <div className="stat">
                  <span className="stat-label">Counted</span>
                  <span className="stat-value">{totalPlayer}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Actual</span>
                  <span className="stat-value">{totalActual}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Off by</span>
                  <span className="stat-value">{totalDelta}</span>
                </div>
              </div>

              {qualifiesForHighScore && !hasSubmitted && (
                <form className="high-score-form" onSubmit={handleScoreSubmit}>
                  <h3>New high score</h3>
                  <p>You made the top 5! Enter your name:</p>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Your name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
                      required
                      disabled={isSubmitting}
                      className="high-score-input"
                      maxLength={15}
                    />
                    <button
                      className="primary-action submit-score-btn"
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Saving..." : "Submit"}
                    </button>
                  </div>
                  {submitError && <p className="leaderboard-message error-message">{submitError}</p>}
                </form>
              )}

              <section className="leaderboard-section">
                <div className="leaderboard-header">
                  <Trophy aria-hidden="true" />
                  <h2>Top 5 · {DIFFICULTY[difficulty].label}</h2>
                </div>

                {hasSubmitted && !qualifiesForHighScore && (
                  <p className="leaderboard-message">Score saved. Nice round.</p>
                )}

                <div className="leaderboard-list">
                  {isLeaderboardLoading ? (
                    <p className="leaderboard-message">Loading leaderboard...</p>
                  ) : leaderboardError ? (
                    <p className="leaderboard-message error-message">{leaderboardError}</p>
                  ) : leaderboard.length === 0 ? (
                    <p className="leaderboard-message">No high scores yet. Be the first.</p>
                  ) : (
                    leaderboard.map((item, idx) => (
                      <div
                        className={`leaderboard-item rank-${idx + 1}`}
                        key={item.id}
                      >
                        <span className="leaderboard-rank">#{idx + 1}</span>
                        <span className="leaderboard-name">{item.player_name}</span>
                        <span className="leaderboard-score">{item.score} pts</span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <footer className="results-actions">
                <button
                  className="primary-action"
                  type="button"
                  onClick={() => prepareRound(difficulty)}
                >
                  <RotateCcw aria-hidden="true" />
                  Play again
                </button>
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => setPhase("intro")}
                >
                  <Home aria-hidden="true" />
                  Home
                </button>
              </footer>
            </div>

            <div className="breakdown-wrapper">
              <button
                type="button"
                className="breakdown-toggle"
                onClick={() => setShowBreakdown((v) => !v)}
                aria-expanded={showBreakdown}
              >
                {showBreakdown ? "Hide per-species breakdown" : "See per-species breakdown"}
              </button>

              {showBreakdown && (
                <div className="results-grid">
                  {UNIQUE_RAPTORS.map((raptor) => {
                    const delta = playerCounts[raptor.id] - actualCounts[raptor.id];
                    const points = scorePerSpecies[raptor.id];
                    return (
                      <article className="result-row" key={raptor.id}>
                        <div className="result-row-header">
                          <img src={raptor.profile} className="result-row-profile-pic" alt="" style={{ borderColor: raptor.tint }} />
                          <h2>{raptor.name}</h2>
                        </div>
                        <div className="result-row-counts">
                          <span>You: <strong>{playerCounts[raptor.id]}</strong></span>
                          <span>Actual: <strong>{actualCounts[raptor.id]}</strong></span>
                        </div>
                        <div className="result-row-footer">
                          <span className="result-row-status">
                            {delta === 0 ? "Exact" : delta > 0 ? `Over by ${delta}` : `Under by ${Math.abs(delta)}`}
                          </span>
                          <span className="species-points">
                            {points >= 0 ? `+${points}` : points}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  viewHeight: number,
  backdrop: HTMLImageElement | null,
) {
  if (backdrop?.complete && backdrop.naturalWidth > 0) {
    const scale = Math.max(viewWidth / backdrop.naturalWidth, viewHeight / backdrop.naturalHeight);
    const width = backdrop.naturalWidth * scale;
    const height = backdrop.naturalHeight * scale;
    const x = (viewWidth - width) / 2;
    const y = (viewHeight - height) / 2;
    ctx.drawImage(backdrop, x, y, width, height);
    ctx.fillStyle = "rgba(232, 244, 241, 0.08)";
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    return;
  }

  const sky = ctx.createLinearGradient(0, 0, 0, viewHeight);
  sky.addColorStop(0, "#b9dfe8");
  sky.addColorStop(0.58, "#e9f3ed");
  sky.addColorStop(1, "#cbb48d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, viewWidth, viewHeight);
}

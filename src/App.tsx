import {
  BarChart3,
  Clock3,
  Download,
  Gauge,
  Play,
  RotateCcw,
  SkipForward,
  Smartphone,
  Target,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import introVideo from "../assets/game_intro.mp4";
import promoVideo from "../assets/promo.mp4";
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

type Difficulty = "beginner" | "expert";
type Phase = "intro" | "promo" | "countdown" | "playing" | "results";

type HighScore = {
  id: string | number;
  player_name: string;
  score: number;
  level: Difficulty;
  created_at: string;
};

type RaptorId =
  | "americanKestrel"
  | "coopersHawk"
  | "goldenEagle"
  | "northernHarrier"
  | "redShoulderedHawk"
  | "redTailedHawk"
  | "turkeyVulture"
  | "baldEagle"
  | "whiteTailedKite"
  | "osprey";

type Frame = { sx: number; sy: number; sw: number; sh: number };

type Raptor = {
  id: RaptorId;
  name: string;
  shortName: string;
  sheet: string;
  tint: string;
  frames: Frame[];
  sizeScale: number;
};

type Counts = Record<RaptorId, number>;

type Bird = {
  id: number;
  raptorId: RaptorId;
  direction: 1 | -1;
  startX: number;
  startY: number;
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

type SpriteAsset = {
  image: CanvasImageSource;
  width: number;
  height: number;
  ready: boolean;
};

const ROUND_SECONDS = 60;
const PROMO_FALLBACK_MS = 9000;
const HAWK_FRAMES: Frame[] = [
  { sx: 35, sy: 75, sw: 560, sh: 335 },
  { sx: 650, sy: 75, sw: 450, sh: 335 },
  { sx: 1200, sy: 75, sw: 385, sh: 335 },
  { sx: 35, sy: 500, sw: 560, sh: 345 },
  { sx: 650, sy: 500, sw: 450, sh: 345 },
  { sx: 1200, sy: 500, sw: 385, sh: 345 },
];

const HARRIER_FRAMES: Frame[] = [
  { sx: 35, sy: 30, sw: 625, sh: 450 },
  { sx: 705, sy: 30, sw: 475, sh: 450 },
  { sx: 1310, sy: 30, sw: 495, sh: 450 },
  { sx: 35, sy: 650, sw: 625, sh: 350 },
  { sx: 705, sy: 650, sw: 475, sh: 350 },
  { sx: 1310, sy: 650, sw: 495, sh: 350 },
];

const EMPTY_COUNTS: Counts = {
  americanKestrel: 0,
  coopersHawk: 0,
  goldenEagle: 0,
  northernHarrier: 0,
  redShoulderedHawk: 0,
  redTailedHawk: 0,
  turkeyVulture: 0,
  baldEagle: 0,
  whiteTailedKite: 0,
  osprey: 0,
};

const RAPTORS: Raptor[] = [
  {
    id: "americanKestrel",
    name: "American Kestrel",
    shortName: "American Kestrel",
    sheet: americanKestrelSheet,
    tint: "#e8a84c",
    frames: HAWK_FRAMES,
    sizeScale: 0.52,
  },
  {
    id: "coopersHawk",
    name: "Cooper's Hawk",
    shortName: "Cooper's Hawk",
    sheet: coopersHawkSheet,
    tint: "#8ca6a9",
    frames: HAWK_FRAMES,
    sizeScale: 0.72,
  },
  {
    id: "goldenEagle",
    name: "Golden Eagle",
    shortName: "Golden Eagle",
    sheet: goldenEagleSheet,
    tint: "#6b5c43",
    frames: HAWK_FRAMES,
    sizeScale: 1.55,
  },
  {
    id: "northernHarrier",
    name: "Northern Harrier",
    shortName: "Northern Harrier",
    sheet: northernHarrierSheet,
    tint: "#ab8660",
    frames: HARRIER_FRAMES,
    sizeScale: 0.94,
  },
  {
    id: "northernHarrier",
    name: "Northern Harrier (Male)",
    shortName: "Northern Harrier",
    sheet: northernHarrierMaleSheet,
    tint: "#8a9ba8",
    frames: HARRIER_FRAMES,
    sizeScale: 0.9,
  },
  {
    id: "redShoulderedHawk",
    name: "Red-shouldered Hawk",
    shortName: "Red-shouldered Hawk",
    sheet: redShoulderedHawkSheet,
    tint: "#c35a32",
    frames: HAWK_FRAMES,
    sizeScale: 0.86,
  },
  {
    id: "redTailedHawk",
    name: "Red-tailed Hawk",
    shortName: "Red-tailed Hawk",
    sheet: redTailedHawkSheet,
    tint: "#d68538",
    frames: HAWK_FRAMES,
    sizeScale: 1,
  },
  {
    id: "turkeyVulture",
    name: "Turkey Vulture",
    shortName: "Turkey Vulture",
    sheet: turkeyVultureSheet,
    tint: "#7b5547",
    frames: HAWK_FRAMES,
    sizeScale: 1.32,
  },
  {
    id: "baldEagle",
    name: "Bald Eagle",
    shortName: "Bald Eagle",
    sheet: baldEagleSheet,
    tint: "#4a3728",
    frames: HAWK_FRAMES,
    sizeScale: 1.6,
  },
  {
    id: "whiteTailedKite",
    name: "White-tailed Kite",
    shortName: "White-tailed Kite",
    sheet: whiteTailedKiteSheet,
    tint: "#c4b8a8",
    frames: HAWK_FRAMES,
    sizeScale: 0.58,
  },
  {
    id: "osprey",
    name: "Osprey",
    shortName: "Osprey",
    sheet: ospreySheet,
    tint: "#5c4a3a",
    frames: HAWK_FRAMES,
    sizeScale: 1.15,
  },
];

const UNIQUE_RAPTORS = RAPTORS.filter(
  (raptor, index, arr) => arr.findIndex((r) => r.id === raptor.id) === index
);

const SPECIES_BEHAVIOR: Record<RaptorId, { soarBias: [number, number]; flapFrequency: number; hoverChance: number }> = {
  americanKestrel: { soarBias: [0.05, 0.2], flapFrequency: 1.3, hoverChance: 0.25 },
  coopersHawk: { soarBias: [0.15, 0.35], flapFrequency: 1.1, hoverChance: 0 },
  goldenEagle: { soarBias: [0.6, 0.85], flapFrequency: 0.5, hoverChance: 0 },
  northernHarrier: { soarBias: [0.3, 0.55], flapFrequency: 0.85, hoverChance: 0 },
  redShoulderedHawk: { soarBias: [0.2, 0.45], flapFrequency: 0.95, hoverChance: 0 },
  redTailedHawk: { soarBias: [0.4, 0.65], flapFrequency: 0.7, hoverChance: 0 },
  turkeyVulture: { soarBias: [0.7, 0.9], flapFrequency: 0.45, hoverChance: 0 },
  baldEagle: { soarBias: [0.55, 0.8], flapFrequency: 0.55, hoverChance: 0 },
  whiteTailedKite: { soarBias: [0.1, 0.3], flapFrequency: 1.2, hoverChance: 0.35 },
  osprey: { soarBias: [0.35, 0.6], flapFrequency: 0.8, hoverChance: 0 },
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
  },
  expert: {
    label: "Expert",
    minBirds: 4,
    spawnEvery: [1050, 1600],
    maxBirds: 6,
    flightDuration: [8200, 11200],
    farScale: [0.08, 0.13],
    nearScale: [0.25, 0.34],
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
  }
>;

function randomBetween([min, max]: [number, number]) {
  return min + Math.random() * (max - min);
}

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

function hash(x: number): number {
  const s = Math.sin(x * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smoothNoise(seed: number, t: number): number {
  const i = Math.floor(t);
  const f = t - i;
  const u = fade(f);
  return lerp(hash(seed + i), hash(seed + i + 1), u) * 2 - 1;
}

function getWind(timestamp: number): { x: number; y: number } {
  const t = timestamp * 0.00008;
  return {
    x: Math.sin(t) * 0.4 + Math.sin(t * 2.3) * 0.2,
    y: Math.cos(t * 0.7) * 0.12,
  };
}

function generateFlapCenters(bird: Bird, speciesBehavior: typeof SPECIES_BEHAVIOR[RaptorId]): number[] {
  const baseCount = Math.round(5 * speciesBehavior.flapFrequency * (1 - bird.soarBias * 0.6));
  const count = Math.max(2, baseCount);
  const centers: number[] = [];
  const spacing = 0.85 / count;
  const startOffset = 0.08 + Math.random() * 0.05;
  
  for (let i = 0; i < count; i++) {
    const base = startOffset + i * spacing;
    const jitter = (Math.random() - 0.5) * spacing * 0.4;
    centers.push(Math.min(0.95, Math.max(0.05, base + jitter)));
  }
  
  return centers;
}

function getFlightFrameIndex(bird: Bird, frameCount: number, progress: number) {
  const flapWidth = 0.09 + bird.soarBias * 0.04;

  for (const center of bird.flapCenters) {
    const distance = Math.abs(progress - center);
    if (distance < flapWidth / 2) {
      const localProgress = (progress - (center - flapWidth / 2)) / flapWidth;
      const sequence = [2, 1, 0, 1, 2];
      const sequenceIndex = Math.min(sequence.length - 1, Math.floor(localProgress * sequence.length));
      return Math.min(sequence[sequenceIndex], frameCount - 1);
    }
  }

  const glideValue = 1.5 + 0.5 * Math.sin(progress * Math.PI * 5 + bird.phase);
  return Math.min(Math.round(glideValue), frameCount - 1);
}

function makeCounts(): Counts {
  return { ...EMPTY_COUNTS };
}

function formatTime(seconds: number) {
  const clamped = Math.max(0, Math.ceil(seconds));
  return `0:${String(clamped).padStart(2, "0")}`;
}

export function App() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [playerCounts, setPlayerCounts] = useState<Counts>(() => makeCounts());
  const [actualCounts, setActualCounts] = useState<Counts>(() => makeCounts());
  const [leaderboard, setLeaderboard] = useState<HighScore[]>([]);
  const [qualifiesForHighScore, setQualifiesForHighScore] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backdropRef = useRef<HTMLImageElement | null>(null);
  const imageMapRef = useRef<Record<RaptorId, SpriteAsset> | null>(null);
  const birdsRef = useRef<Bird[]>([]);
  const actualCountsRef = useRef<Counts>(makeCounts());
  const startTimeRef = useRef(0);
  const nextSpawnRef = useRef(0);
  const birdIdRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);

  const totalActual = useMemo(
    () => UNIQUE_RAPTORS.reduce((sum, raptor) => sum + actualCounts[raptor.id], 0),
    [actualCounts],
  );

  const totalPlayer = useMemo(
    () => UNIQUE_RAPTORS.reduce((sum, raptor) => sum + playerCounts[raptor.id], 0),
    [playerCounts],
  );

  const totalDelta = useMemo(
    () => UNIQUE_RAPTORS.reduce((sum, raptor) => sum + Math.abs(playerCounts[raptor.id] - actualCounts[raptor.id]), 0),
    [actualCounts, playerCounts],
  );

  const accuracy = totalActual === 0 ? 0 : Math.max(0, Math.round(((totalActual - totalDelta) / totalActual) * 100));

  const scorePerSpecies = useMemo(() => {
    const multiplier = difficulty === "expert" ? 2 : 1;
    return UNIQUE_RAPTORS.reduce((acc, raptor) => {
      const delta = Math.abs(playerCounts[raptor.id] - actualCounts[raptor.id]);
      const base = delta === 0 ? 10 : delta === 1 ? 5 : delta === 2 ? 2 : 0;
      acc[raptor.id] = base * multiplier;
      return acc;
    }, {} as Counts);
  }, [actualCounts, playerCounts, difficulty]);

  const totalScore = useMemo(
    () => UNIQUE_RAPTORS.reduce((sum, raptor) => sum + scorePerSpecies[raptor.id], 0),
    [scorePerSpecies],
  );

  const maxScore = useMemo(() => {
    const multiplier = difficulty === "expert" ? 2 : 1;
    const speciesWithBirds = UNIQUE_RAPTORS.filter((r) => actualCounts[r.id] > 0).length;
    return speciesWithBirds * 10 * multiplier;
  }, [actualCounts, difficulty]);

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
          const cleaned = removeCheckerBackground(image);
          asset.image = cleaned;
          asset.width = cleaned.width;
          asset.height = cleaned.height;
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

    imageMapRef.current = Object.fromEntries(entries) as Record<RaptorId, SpriteAsset>;
  }, []);

  const spawnBird = useCallback((viewWidth: number, viewHeight: number, timestamp: number) => {
    const config = DIFFICULTY[difficulty];
    const raptor = RAPTORS[Math.floor(Math.random() * RAPTORS.length)];
    const behavior = SPECIES_BEHAVIOR[raptor.id];
    const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
    const edgePadding = viewWidth * 0.12;
    const startX = direction === 1 ? -edgePadding : viewWidth + edgePadding;
    const endX = direction === 1 ? viewWidth + edgePadding : -edgePadding;
    const startY = randomBetween([viewHeight * 0.16, viewHeight * 0.42]);
    const endY = startY + randomBetween([-viewHeight * 0.05, viewHeight * 0.08]);
    const controlY = (startY + endY) / 2 + randomBetween([-viewHeight * 0.06, viewHeight * 0.06]);
    const controlX = viewWidth / 2 + randomBetween([-viewWidth * 0.08, viewWidth * 0.08]);
    
    const bird: Bird = {
      id: birdIdRef.current,
      raptorId: raptor.id,
      direction,
      startX,
      startY,
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

  const drawScene = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    const images = imageMapRef.current;
    if (!canvas || !images) return;

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

    const config = DIFFICULTY[difficulty];
    while (birdsRef.current.length < config.minBirds) {
      spawnBird(viewWidth, viewHeight, timestamp - randomBetween([0, 2400]));
      nextSpawnRef.current = timestamp + randomBetween(config.spawnEvery) * 0.55;
    }

    if (timestamp >= nextSpawnRef.current && birdsRef.current.length < config.maxBirds) {
      spawnBird(viewWidth, viewHeight, timestamp);
      nextSpawnRef.current = timestamp + randomBetween(config.spawnEvery);
    }

    const wind = getWind(timestamp);

    const visibleBirds = birdsRef.current
      .map((bird) => {
        const rawProgress = (timestamp - bird.startedAt) / bird.duration;
        const progress = Math.min(1, Math.max(0, rawProgress));
        const eased = easeInOut(progress);
        const overhead = Math.sin(Math.PI * progress);
        
        const baseX = quadraticBezier(bird.startX, bird.controlX, bird.endX, eased);
        const baseY = quadraticBezier(bird.startY, bird.controlY, bird.endY, eased);
        
        const noiseX = smoothNoise(bird.noiseSeed, progress * 3) * viewWidth * 0.04;
        const noiseY = smoothNoise(bird.noiseSeed + 100, progress * 3) * viewHeight * 0.03;
        
        const altitudeVar = Math.sin(progress * Math.PI * 4 + bird.altitudePhase) * bird.altitudeAmp;
        
        const windEffect = 1 - overhead * 0.5;
        const windX = wind.x * viewWidth * 0.08 * windEffect;
        const windY = wind.y * viewHeight * 0.05 * windEffect;
        
        const x = baseX + noiseX + windX;
        const y = baseY + noiseY + windY + altitudeVar
          + Math.sin(timestamp * 0.0014 + bird.phase) * bird.bob;
        
        const prevProgress = Math.max(0, progress - 0.02);
        const prevEased = easeInOut(prevProgress);
        const prevX = quadraticBezier(bird.startX, bird.controlX, bird.endX, prevEased);
        const prevY = quadraticBezier(bird.startY, bird.controlY, bird.endY, prevEased);
        
        const nextProgress = Math.min(1, progress + 0.02);
        const nextEased = easeInOut(nextProgress);
        const nextX = quadraticBezier(bird.startX, bird.controlX, bird.endX, nextEased);
        const nextY = quadraticBezier(bird.startY, bird.controlY, bird.endY, nextEased);
        
        const dx = nextX - prevX;
        const dy = nextY - prevY;
        const velocity = Math.sqrt(dx * dx + dy * dy);
        const curvature = Math.abs(dx * (nextY - y) - dy * (nextX - x)) / (velocity * velocity + 1);
        
        const bankFromCurvature = curvature * bird.direction * 12;
        const pitchFromVelocity = Math.atan2(dy, dx) * 0.3;
        const rotation = bird.bank + bankFromCurvature + Math.sin(progress * Math.PI * 2 + bird.phase) * 0.018 + pitchFromVelocity;
        
        const species = RAPTORS.find((r) => r.id === bird.raptorId);
        const speciesScale = species?.sizeScale ?? 1;
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
      const sprite = images[bird.raptorId];
      if (!sprite.ready || sprite.width === 0) continue;

      const raptorConfig = RAPTORS.find((r) => r.id === bird.raptorId);
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

    const tick = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
        nextSpawnRef.current = timestamp + 450;
        lastFrameRef.current = timestamp;
      }

      lastFrameRef.current = timestamp;
      const elapsed = (timestamp - startTimeRef.current) / 1000;
      const remaining = ROUND_SECONDS - elapsed;

      drawScene(timestamp);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setActualCounts({ ...actualCountsRef.current });
        setPhase("results");
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
      setPhase("countdown");
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

  const prepareRound = (selectedDifficulty = difficulty) => {
    setDifficulty(selectedDifficulty);
    setPlayerCounts(makeCounts());
    setActualCounts(makeCounts());
    setTimeLeft(ROUND_SECONDS);
    setCountdown(3);
    actualCountsRef.current = makeCounts();
    birdsRef.current = [];
    startTimeRef.current = 0;
    lastFrameRef.current = 0;
    nextSpawnRef.current = 0;
    birdIdRef.current = 0;
    setPhase("promo");
  };

  const startRound = () => {
    setTimeLeft(ROUND_SECONDS);
    startTimeRef.current = 0;
    lastFrameRef.current = 0;
    nextSpawnRef.current = 0;
    setPhase("playing");
  };

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
    const { data, error } = await supabase
      .from("kestrel_high_scores")
      .select("*")
      .eq("level", difficulty)
      .order("score", { ascending: false })
      .limit(5);
    if (!error && data) {
      setLeaderboard(data);
      if (phase === "results") {
        const qualifies = data.length < 5 || totalScore > (data[data.length - 1]?.score ?? 0);
        setQualifiesForHighScore(qualifies && totalScore > 0);
      }
    }
  }, [difficulty, phase, totalScore]);

  useEffect(() => {
    if (phase !== "results") {
      setQualifiesForHighScore(false);
      setHasSubmitted(false);
      setPlayerName("");
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
    const { error } = await supabase
      .from("kestrel_high_scores")
      .insert([
        {
          player_name: playerName.trim(),
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
          bald_eagle_count: playerCounts.baldEagle,
          white_tailed_kite_count: playerCounts.whiteTailedKite,
          osprey_count: playerCounts.osprey,
        },
      ]);
    setIsSubmitting(false);
    if (!error) {
      setHasSubmitted(true);
    }
  };

  const countRaptor = (raptorId: RaptorId) => {
    if (phase !== "playing") return;
    setPlayerCounts((current) => ({
      ...current,
      [raptorId]: current[raptorId] + 1,
    }));
  };

  return (
    <main className="app-shell">
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
            <div className="difficulty-card" aria-label="Select difficulty">
              {(Object.keys(DIFFICULTY) as Difficulty[]).map((level) => (
                <button
                  className={difficulty === level ? "difficulty-button selected" : "difficulty-button"}
                  key={level}
                  onClick={() => setDifficulty(level)}
                  type="button"
                >
                  <Gauge aria-hidden="true" />
                  <span>{DIFFICULTY[level].label}</span>
                </button>
              ))}
            </div>
            <button className="primary-action" type="button" onClick={() => prepareRound()}>
              <Play aria-hidden="true" />
              Start 60-second round
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
            onEnded={() => setPhase("countdown")}
            onError={() => setPhase("countdown")}
          />
          <div className="promo-status">
            <button className="skip-promo-button" type="button" onClick={() => setPhase("countdown")}>
              <SkipForward aria-hidden="true" />
              Skip promo
            </button>
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
          <header className="hud">
            <div className="hud-item">
              <Clock3 aria-hidden="true" />
              <span>{formatTime(timeLeft)}</span>
            </div>
            <div className="hud-item">
              <Target aria-hidden="true" />
              <span>{DIFFICULTY[difficulty].label}</span>
            </div>
          </header>
          <div className="tap-panel" aria-label="Raptor counters">
            {UNIQUE_RAPTORS.map((raptor) => (
              <button
                className="raptor-button"
                key={raptor.id}
                onClick={() => countRaptor(raptor.id)}
                style={{ "--raptor-color": raptor.tint } as React.CSSProperties}
                type="button"
              >
                <span>{raptor.shortName}</span>
                <strong>{playerCounts[raptor.id]}</strong>
              </button>
            ))}
          </div>
        </section>
      )}

      {phase === "results" && (
        <section className="results-screen">
          <div className="results-panel results-layout">
            <div className="results-left">
              <div className="results-heading">
                <BarChart3 aria-hidden="true" />
                <div>
                  <h1>{accuracy}% field count accuracy</h1>
                  <p className="score-display">{totalScore} / {maxScore} points</p>
                </div>
              </div>
              <div className="score-strip">
                <span>Counted {totalPlayer}</span>
                <span>Actual {totalActual}</span>
                <span>Difference {totalDelta}</span>
              </div>
              <div className="results-grid">
                {UNIQUE_RAPTORS.map((raptor) => {
                  const delta = playerCounts[raptor.id] - actualCounts[raptor.id];
                  const points = scorePerSpecies[raptor.id];
                  return (
                    <article className="result-row" key={raptor.id}>
                      <span className="species-dot" style={{ background: raptor.tint }} />
                      <h2>{raptor.name}</h2>
                      <span>Your count: {playerCounts[raptor.id]}</span>
                      <span>Actual: {actualCounts[raptor.id]}</span>
                      <strong>{delta === 0 ? "Exact" : delta > 0 ? `Over by ${delta}` : `Under by ${Math.abs(delta)}`}</strong>
                      <span className="species-points">+{points}</span>
                    </article>
                  );
                })}
              </div>
              <div className="results-actions">
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => {
                    prepareRound(difficulty);
                  }}
                >
                  <RotateCcw aria-hidden="true" />
                  Play again
                </button>
                <button className="primary-action" type="button" onClick={() => setPhase("intro")}>
                  <Download aria-hidden="true" />
                  Home screen
                </button>
              </div>
            </div>

            <div className="results-right leaderboard-section">
              <div className="leaderboard-header">
                <Trophy aria-hidden="true" />
                <h2>Top 5 High Scores</h2>
              </div>

              {qualifiesForHighScore && !hasSubmitted && (
                <form className="high-score-form" onSubmit={handleScoreSubmit}>
                  <h3>New High Score!</h3>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
                      required
                      disabled={isSubmitting}
                      className="high-score-input"
                    />
                    <button className="primary-action submit-score-btn" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : "Submit"}
                    </button>
                  </div>
                </form>
              )}

              <div className="leaderboard-list">
                {leaderboard.length === 0 ? (
                  <p className="no-scores">Loading leaderboard...</p>
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
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function removeCheckerBackground(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const isNeutral = max - min < 9;
    const isCheckerPixel = isNeutral && red > 205 && green > 205 && blue > 205;

    if (isCheckerPixel) {
      data[index + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
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

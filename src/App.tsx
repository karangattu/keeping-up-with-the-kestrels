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
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type Difficulty = "beginner" | "expert";
type Phase = "intro" | "promo" | "countdown" | "playing" | "results";

type RaptorId =
  | "americanKestrel"
  | "coopersHawk"
  | "goldenEagle"
  | "northernHarrier"
  | "redShoulderedHawk"
  | "redTailedHawk"
  | "turkeyVulture";

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
};

const RAPTORS: Raptor[] = [
  {
    id: "americanKestrel",
    name: "American Kestrel",
    shortName: "Kestrel",
    sheet: americanKestrelSheet,
    tint: "#e8a84c",
    frames: HAWK_FRAMES,
    sizeScale: 0.52,
  },
  {
    id: "coopersHawk",
    name: "Cooper's Hawk",
    shortName: "Cooper's",
    sheet: coopersHawkSheet,
    tint: "#8ca6a9",
    frames: HAWK_FRAMES,
    sizeScale: 0.72,
  },
  {
    id: "goldenEagle",
    name: "Golden Eagle",
    shortName: "Eagle",
    sheet: goldenEagleSheet,
    tint: "#6b5c43",
    frames: HAWK_FRAMES,
    sizeScale: 1.55,
  },
  {
    id: "northernHarrier",
    name: "Northern Harrier",
    shortName: "Harrier",
    sheet: northernHarrierSheet,
    tint: "#ab8660",
    frames: HARRIER_FRAMES,
    sizeScale: 0.94,
  },
  {
    id: "redShoulderedHawk",
    name: "Red-shouldered Hawk",
    shortName: "Red-shouldered",
    sheet: redShoulderedHawkSheet,
    tint: "#c35a32",
    frames: HAWK_FRAMES,
    sizeScale: 0.86,
  },
  {
    id: "redTailedHawk",
    name: "Red-tailed Hawk",
    shortName: "Red-tailed",
    sheet: redTailedHawkSheet,
    tint: "#d68538",
    frames: HAWK_FRAMES,
    sizeScale: 1,
  },
  {
    id: "turkeyVulture",
    name: "Turkey Vulture",
    shortName: "Vulture",
    sheet: turkeyVultureSheet,
    tint: "#7b5547",
    frames: HAWK_FRAMES,
    sizeScale: 1.32,
  },
];

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

function getFlightFrameIndex(bird: Bird, frameCount: number, progress: number) {
  const flapCenters = [
    0.12 + bird.flapOffset,
    0.32 - bird.flapOffset,
    0.54 + bird.flapOffset,
    0.74 - bird.flapOffset,
    0.92 + bird.flapOffset,
  ];
  const flapWidth = 0.10;

  for (const center of flapCenters) {
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
    () => RAPTORS.reduce((sum, raptor) => sum + actualCounts[raptor.id], 0),
    [actualCounts],
  );

  const totalPlayer = useMemo(
    () => RAPTORS.reduce((sum, raptor) => sum + playerCounts[raptor.id], 0),
    [playerCounts],
  );

  const totalDelta = useMemo(
    () => RAPTORS.reduce((sum, raptor) => sum + Math.abs(playerCounts[raptor.id] - actualCounts[raptor.id]), 0),
    [actualCounts, playerCounts],
  );

  const accuracy = totalActual === 0 ? 0 : Math.max(0, Math.round(((totalActual - totalDelta) / totalActual) * 100));

  const scorePerSpecies = useMemo(() => {
    const multiplier = difficulty === "expert" ? 2 : 1;
    return RAPTORS.reduce((acc, raptor) => {
      const delta = Math.abs(playerCounts[raptor.id] - actualCounts[raptor.id]);
      const base = delta === 0 ? 10 : delta === 1 ? 5 : delta === 2 ? 2 : 0;
      acc[raptor.id] = base * multiplier;
      return acc;
    }, {} as Counts);
  }, [actualCounts, playerCounts, difficulty]);

  const totalScore = useMemo(
    () => RAPTORS.reduce((sum, raptor) => sum + scorePerSpecies[raptor.id], 0),
    [scorePerSpecies],
  );

  const maxScore = useMemo(() => {
    const multiplier = difficulty === "expert" ? 2 : 1;
    const speciesWithBirds = RAPTORS.filter((r) => actualCounts[r.id] > 0).length;
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
    const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
    const edgePadding = viewWidth * 0.12;
    const startX = direction === 1 ? -edgePadding : viewWidth + edgePadding;
    const endX = direction === 1 ? viewWidth + edgePadding : -edgePadding;
    const startY = randomBetween([viewHeight * 0.16, viewHeight * 0.42]);
    const endY = startY + randomBetween([-viewHeight * 0.05, viewHeight * 0.08]);
    const controlY = (startY + endY) / 2 + randomBetween([-viewHeight * 0.035, viewHeight * 0.035]);
    const bird: Bird = {
      id: birdIdRef.current,
      raptorId: raptor.id,
      direction,
      startX,
      startY,
      controlX: viewWidth / 2,
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
    };

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

    const visibleBirds = birdsRef.current
      .map((bird) => {
        const rawProgress = (timestamp - bird.startedAt) / bird.duration;
        const progress = Math.min(1, Math.max(0, rawProgress));
        const eased = easeInOut(progress);
        const overhead = Math.sin(Math.PI * progress);
        const x = quadraticBezier(bird.startX, bird.controlX, bird.endX, eased);
        const y = quadraticBezier(bird.startY, bird.controlY, bird.endY, eased)
          + Math.sin(timestamp * 0.0014 + bird.phase) * bird.bob;
        const species = RAPTORS.find((r) => r.id === bird.raptorId);
        const speciesScale = species?.sizeScale ?? 1;
        const scale = lerp(bird.farScale, bird.nearScale, Math.pow(overhead, 1.12)) * speciesScale;
        const alpha = lerp(0.7, 1, Math.pow(overhead, 0.5));
        const rotation = bird.bank + Math.sin(progress * Math.PI * 2 + bird.phase) * 0.012;

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
            {RAPTORS.map((raptor) => (
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
          <div className="results-panel">
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
              {RAPTORS.map((raptor) => {
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

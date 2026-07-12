import { describe, expect, test } from "vitest";
import {
  COMBO_BASE,
  computeAccuracy,
  computeCappedTotalScore,
  computeMaxScore,
  computeScorePerSpecies,
  computeTotalDelta,
  computeTotalScore,
  formatTime,
  getComboReward,
  getFinalCountdownBeep,
  getMultiplier,
  hash,
  makeEmptyCounts,
  randomBetween,
  RAPTOR_IDS,
  ROUND_SECONDS,
  type Counts,
  type Difficulty,
} from "./game";
import { RAPTORS } from "./App";

const STARTER: Counts = {
  ...makeEmptyCounts(),
  americanKestrel: 3,
  redTailedHawk: 2,
  turkeyVulture: 1,
};

const PERFECT_GUESS: Counts = {
  ...STARTER,
  coopersHawk: 0,
  goldenEagle: 0,
  northernHarrier: 0,
  redShoulderedHawk: 0,
  baldEagle: 0,
  whiteTailedKite: 0,
  osprey: 0,
};

describe("formatTime", () => {
  test("formats whole seconds with two-digit padding", () => {
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(5)).toBe("0:05");
  });

  test("carries minutes for values at or above 60", () => {
    expect(formatTime(61)).toBe("1:01");
    expect(formatTime(120)).toBe("2:00");
  });

  test("rounds up partial seconds", () => {
    expect(formatTime(9.1)).toBe("0:10");
    expect(formatTime(0.01)).toBe("0:01");
  });

  test("clamps negative values to zero", () => {
    expect(formatTime(-3)).toBe("0:00");
  });

  test("returns 0:00 for exact zero", () => {
    expect(formatTime(0)).toBe("0:00");
  });
});

describe("getMultiplier", () => {
  test("returns 1 for streaks below 2", () => {
    expect(getMultiplier(0)).toBe(1);
    expect(getMultiplier(1)).toBe(1);
  });

  test("returns 2x at 2 consecutive correct", () => {
    expect(getMultiplier(2)).toBe(2);
  });

  test("returns 3x at 3 consecutive correct", () => {
    expect(getMultiplier(3)).toBe(3);
  });

  test("returns 5x at 4 or more consecutive correct", () => {
    expect(getMultiplier(4)).toBe(5);
    expect(getMultiplier(10)).toBe(5);
  });
});

describe("getComboReward", () => {
  test("awards no reward while the streak is still building (>1)", () => {
    expect(getComboReward(0)).toBe(0);
    expect(getComboReward(1)).toBe(0);
  });

  test("awards (multiplier - 1) * COMBO_BASE at 2+ consecutive on-target taps", () => {
    expect(getComboReward(2)).toBe((getMultiplier(2) - 1) * COMBO_BASE);
    expect(getComboReward(3)).toBe((getMultiplier(3) - 1) * COMBO_BASE);
    expect(getComboReward(4)).toBe((getMultiplier(4) - 1) * COMBO_BASE);
    expect(getComboReward(10)).toBe((getMultiplier(10) - 1) * COMBO_BASE);
  });

  test("a broken streak (0) yields no reward", () => {
    expect(getComboReward(0)).toBe(0);
    expect(getComboReward(-1)).toBe(0);
  });
});

describe("getFinalCountdownBeep", () => {
  test("ramps up during the last 10 seconds only", () => {
    expect(getFinalCountdownBeep(11)).toBeNull();
    expect(getFinalCountdownBeep(0)).toBeNull();

    const first = getFinalCountdownBeep(10);
    const last = getFinalCountdownBeep(1);
    expect(first).not.toBeNull();
    expect(last).not.toBeNull();
    expect(last!.frequency).toBeGreaterThan(first!.frequency);
    expect(last!.durationMs).toBeGreaterThan(first!.durationMs);
    expect(last!.peakGain).toBeGreaterThan(first!.peakGain);
  });
});

describe("scoreForSpecies (via computeScorePerSpecies)", () => {
  test("exact match awards 10 base points", () => {
    const actual = { ...makeEmptyCounts(), americanKestrel: 3 };
    const player = { ...actual };
    const result = computeScorePerSpecies(actual, player, "beginner");
    expect(result.americanKestrel).toBe(10);
  });

  test("off by 1 awards 5 base points when species was present", () => {
    const actual = { ...makeEmptyCounts(), americanKestrel: 3 };
    const player = { ...actual, americanKestrel: 2 };
    const result = computeScorePerSpecies(actual, player, "beginner");
    expect(result.americanKestrel).toBe(5);
  });

  test("off by 2 awards 2 base points when species was present", () => {
    const actual = { ...makeEmptyCounts(), americanKestrel: 3 };
    const player = { ...actual, americanKestrel: 1 };
    const result = computeScorePerSpecies(actual, player, "beginner");
    expect(result.americanKestrel).toBe(2);
  });

  test("off by 3+ awards 0 points when species was present", () => {
    const actual = { ...makeEmptyCounts(), americanKestrel: 3 };
    const player = { ...actual, americanKestrel: 0 };
    const result = computeScorePerSpecies(actual, player, "beginner");
    expect(result.americanKestrel).toBe(0);
  });

  test("over-counting a non-present species by 1 applies -5 penalty", () => {
    const result = computeScorePerSpecies(makeEmptyCounts(), {
      ...makeEmptyCounts(),
      americanKestrel: 1,
    }, "beginner");
    expect(result.americanKestrel).toBe(-5);
  });

  test("over-counting a non-present species by 2 applies -8 penalty", () => {
    const result = computeScorePerSpecies(makeEmptyCounts(), {
      ...makeEmptyCounts(),
      americanKestrel: 2,
    }, "beginner");
    expect(result.americanKestrel).toBe(-8);
  });

  test("over-counting a non-present species by 3+ applies -10 penalty", () => {
    const result = computeScorePerSpecies(makeEmptyCounts(), {
      ...makeEmptyCounts(),
      americanKestrel: 5,
    }, "beginner");
    expect(result.americanKestrel).toBe(-10);
  });

  test("expert difficulty doubles both rewards and penalties", () => {
    const actual = { ...makeEmptyCounts(), americanKestrel: 3 };
    const player = { ...actual };
    const expert = computeScorePerSpecies(actual, player, "expert");
    expect(expert.americanKestrel).toBe(20);

    const overResult = computeScorePerSpecies(makeEmptyCounts(), {
      ...makeEmptyCounts(),
      coopersHawk: 2,
    }, "expert");
    expect(overResult.coopersHawk).toBe(-16);
  });

  test("ignores species not in either counts (zero by default)", () => {
    const result = computeScorePerSpecies(makeEmptyCounts(), makeEmptyCounts(), "beginner");
    for (const id of RAPTOR_IDS) {
      expect(result[id]).toBe(0);
    }
  });
});

describe("computeTotalScore", () => {
  test("sums species scores", () => {
    const scores: Counts = { ...makeEmptyCounts(), americanKestrel: 10, redTailedHawk: 5 };
    expect(computeTotalScore(scores)).toBe(15);
  });

  test("floors negative totals to 0", () => {
    const scores: Counts = { ...makeEmptyCounts(), americanKestrel: -10, redTailedHawk: -10 };
    expect(computeTotalScore(scores)).toBe(0);
  });
});

describe("computeMaxScore", () => {
  test("is 10 per species that actually appeared, doubled on expert", () => {
    const actual: Counts = { ...makeEmptyCounts(), americanKestrel: 1, redTailedHawk: 2 };
    expect(computeMaxScore(actual, "beginner")).toBe(20);
    expect(computeMaxScore(actual, "expert")).toBe(40);
  });

  test("is 0 when no species appeared", () => {
    expect(computeMaxScore(makeEmptyCounts(), "beginner")).toBe(0);
  });
});

describe("computeCappedTotalScore", () => {
  test("caps to max score", () => {
    expect(computeCappedTotalScore(150, 100)).toBe(100);
  });

  test("leaves the score alone when below the cap", () => {
    expect(computeCappedTotalScore(50, 100)).toBe(50);
  });
});

describe("computeAccuracy", () => {
  test("perfect match is 100%", () => {
    const actual = { ...makeEmptyCounts(), americanKestrel: 3, redTailedHawk: 2 };
    expect(computeAccuracy(actual, actual)).toBe(100);
  });

  test("zero accuracy when nothing was actually present", () => {
    expect(computeAccuracy(makeEmptyCounts(), makeEmptyCounts())).toBe(0);
  });

  test("rounds to nearest integer percent", () => {
    const actual = { ...makeEmptyCounts(), americanKestrel: 3 };
    const player = { ...actual, americanKestrel: 2 };
    expect(computeAccuracy(actual, player)).toBe(67);
  });

  test("never goes below 0 even with heavy over-counting", () => {
    const actual = { ...makeEmptyCounts(), americanKestrel: 1 };
    const player = { ...makeEmptyCounts(), americanKestrel: 1, redTailedHawk: 9 };
    expect(computeAccuracy(actual, player)).toBe(0);
  });
});

describe("computeTotalDelta", () => {
  test("sums absolute differences across all species", () => {
    const actual: Counts = { ...makeEmptyCounts(), americanKestrel: 3, redTailedHawk: 2 };
    const player: Counts = { ...makeEmptyCounts(), americanKestrel: 1, redTailedHawk: 4 };
    expect(computeTotalDelta(actual, player)).toBe(2 + 2);
  });

  test("perfect match has zero delta", () => {
    expect(computeTotalDelta(STARTER, PERFECT_GUESS)).toBe(0);
  });
});

describe("makeEmptyCounts", () => {
  test("produces a record with all raptor ids set to 0", () => {
    const counts = makeEmptyCounts();
    for (const id of RAPTOR_IDS) {
      expect(counts[id]).toBe(0);
    }
  });
});

describe("hash", () => {
  test("returns a deterministic value in [0, 1)", () => {
    const a = hash(1.5);
    const b = hash(1.5);
    const c = hash(1.5001);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    expect(c).not.toBe(a);
  });
});

describe("randomBetween", () => {
  test("returns values in the half-open range [min, max)", () => {
    for (let i = 0; i < 200; i++) {
      const value = randomBetween([5, 10]);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThan(10);
    }
  });
});

describe("ROUND_SECONDS", () => {
  test("is 60", () => {
    expect(ROUND_SECONDS).toBe(60);
  });
});

describe("difficulty config sanity", () => {
  test.each<[Difficulty, number]>([
    ["beginner", 1],
    ["expert", 2],
  ])("%s has a stable difficulty multiplier semantics", (_difficulty, _expected) => {
    const actual = { ...makeEmptyCounts(), americanKestrel: 2 };
    const player = { ...actual };
    const beginnerScore = computeScorePerSpecies(actual, player, "beginner").americanKestrel;
    const expertScore = computeScorePerSpecies(actual, player, "expert").americanKestrel;
    expect(expertScore).toBe(beginnerScore * 2);
  });
});

describe("RAPTORS config and profile pictures", () => {
  test("every raptor has a profile image path and fact", () => {
    expect(RAPTORS.length).toBeGreaterThan(0);
    RAPTORS.forEach((raptor) => {
      expect(raptor.profile).toBeDefined();
      expect(typeof raptor.profile).toBe("string");
      expect(raptor.profile.length).toBeGreaterThan(0);
      expect(raptor.fact).toBeDefined();
      expect(typeof raptor.fact).toBe("string");
      expect(raptor.fact.length).toBeGreaterThan(0);
    });
  });
});

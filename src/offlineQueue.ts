export const PENDING_SCORES_KEY = "kestrel.pendingScores";

export type PendingHighScore = {
  payload: Record<string, unknown>;
  mode: "insert" | "update";
  targetId?: string | number;
};

export function loadPendingHighScores(): PendingHighScore[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PENDING_SCORES_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as PendingHighScore[]) : [];
  } catch {
    return [];
  }
}

export function pushPendingHighScore(entry: PendingHighScore) {
  if (typeof window === "undefined") return;
  try {
    const current = loadPendingHighScores();
    current.push(entry);
    window.localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

export function removePendingHighScore(index: number) {
  if (typeof window === "undefined") return;
  try {
    const current = loadPendingHighScores();
    const next = current.filter((_, i) => i !== index);
    window.localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

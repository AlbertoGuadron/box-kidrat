import type { BoxingMove, Serie } from "./types";

const STARTERS: BoxingMove[] = ["Jab", "Recto"];

const ALL_MOVES: BoxingMove[] = [
  "Jab",
  "Recto",
  "Upper Derecho",
  "Upper Izquierdo",
  "Gancho Derecho",
  "Gancho Izquierdo",
];

const POWER_MOVES = new Set<BoxingMove>(["Upper Derecho", "Upper Izquierdo", "Gancho Derecho", "Gancho Izquierdo"]);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isValidNext(move: BoxingMove, prev: BoxingMove, prevPrev: BoxingMove | null): boolean {
  // Power moves cannot repeat consecutively
  if (POWER_MOVES.has(move) && prev === move) return false;
  // Jab/Recto cannot appear 3 times in a row
  if (!POWER_MOVES.has(move) && prev === move && prevPrev === move) return false;
  return true;
}

/**
 * Generates one random combo per round.
 * Rules:
 *   - Positions 1 & 2 are always Jab or Recto (any combo of the two)
 *   - Jab/Recto: max 2 consecutive (no triple)
 *   - Power moves (Upper, Gancho): no two in a row, but can repeat non-consecutively
 *   - Length grows with round progression: 3 moves early → 6 moves late
 */
export function generateComboForRound(
  globalRoundIndex: number,
  totalRounds: number
): Serie {
  const progress = totalRounds <= 1 ? 1 : globalRoundIndex / (totalRounds - 1);
  const moveCount = Math.min(6, Math.round(3 + progress * 3));

  const combo: BoxingMove[] = [];

  // First two moves must be Jab or Recto
  combo.push(pick(STARTERS));
  if (moveCount >= 2) combo.push(pick(STARTERS));

  // Fill remaining positions with any valid move
  for (let i = 2; i < moveCount; i++) {
    const prev = combo[i - 1];
    const prevPrev = combo[i - 2] ?? null;
    const candidates = ALL_MOVES.filter((m) => isValidNext(m, prev, prevPrev));
    combo.push(pick(candidates));
  }

  return combo;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const MOVE_COLORS: Record<BoxingMove, string> = {
  Jab: "#F97316",
  Recto: "#FB923C",
  "Upper Derecho": "#EF4444",
  "Upper Izquierdo": "#EC4899",
  "Gancho Derecho": "#A855F7",
  "Gancho Izquierdo": "#3B82F6",
};

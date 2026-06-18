export type BoxingMove =
  | "Jab"
  | "Recto"
  | "Upper Derecho"
  | "Upper Izquierdo"
  | "Gancho Derecho"
  | "Gancho Izquierdo";

export type Serie = BoxingMove[];

export interface WorkoutConfig {
  warmupMinutes: number;
  restBeforeStart: number;
  sets: number;
  rounds: number; // rounds per set
  roundDuration: number;
  restBetweenRounds: number;
  restBetweenSets: number;
  cooldownMinutes: number;
}

export type TrainingPhase =
  | "idle"
  | "warmup"
  | "rest_before"
  | "round"
  | "rest_between_rounds"
  | "rest_between_sets"
  | "cooldown"
  | "done";

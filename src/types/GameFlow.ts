export interface GameSessionOptions {
  readonly levelNumber: number;
  readonly score: number;
}

export interface FailureSummary {
  readonly levelNumber: number;
  readonly fromCity: string;
  readonly toCity: string;
  readonly reason: string;
  readonly score: number;
  readonly distanceMeters: number;
  readonly levelDistanceMeters: number;
  readonly elapsedSeconds: number;
}

export interface ResultSummary {
  readonly levelNumber: number;
  readonly fromCity: string;
  readonly toCity: string;
  readonly elapsedSeconds: number;
  readonly cargoScore: number;
  readonly passingScore: number;
  readonly speedPenaltyScore: number;
  readonly timeBonus: number;
  readonly completionBonus: number;
  readonly previousScore: number;
  readonly totalScore: number;
}

// shapes of the json written by scripts/export_site_data.py

export type Metrics = {
  generated: string;
  dataset: {
    season: string;
    shots: number;
    players: number;
    games: number;
    made: number;
    missed: number;
    league_fg: number;
    train: number;
    test: number;
    features: number;
  };
  headline: { model: string; accuracy: number; log_loss: number; brier: number; auc: number };
  naive: { accuracy: number; log_loss: number; brier: number; auc: number };
  log_loss_gain: number;
  brier_gain: number;
  auc_spread: number;
  threshold: { best_f1_threshold: number; best_f1: number; accuracy_at_0_5: number };
  versions: Record<string, string>;
};

export type ModelRow = {
  name: string;
  family: string;
  tuned: boolean;
  accuracy: number;
  log_loss: number;
  brier: number;
  auc: number;
};

export type Models = {
  headline: string;
  models: ModelRow[];
  calibration: Record<string, { predicted: number[]; actual: number[] }>;
};

export type Roc = {
  fpr: number[];
  curves: { name: string; auc: number; tpr: number[] }[];
};

export type Shap = {
  n: number;
  base_value: number;
  units: string;
  importance: { feature: string; label: string; mean_abs: number }[];
  dependence: {
    feature: string;
    label: string;
    unit: string;
    domain: [number, number];
    x: number[];
    shap: number[];
    trend: { x: number[]; mean: number[] };
  }[];
};

export type Player = {
  id: number;
  name: string;
  shots: number;
  actual: number;
  expected: number;
  diff: number;
  se: number;
};

export type Players = {
  min_shots: number;
  count: number;
  in_sample_share: number;
  players: Player[];
};

export type Context = {
  league_fg: number;
  zones: { zone: string; label: string; min_ft: number; max_ft: number | null; fg: number; n: number }[];
  by_distance: { ft: number; fg: number; n: number }[];
  defender: {
    corr: number;
    bands: { label: string; fg: number; n: number; avg_shot_dist: number; share_threes: number }[];
    by_distance: { label: string; cells: { band: string; fg: number; n: number }[] }[];
  };
  pca: { explained: [number, number]; rows: number; points: [number, number, number][] };
};

export type PredictorGrid = {
  model: string;
  order: GridAxis[];
  axes: Record<GridAxis, number[]>;
  scale: number;
  values: number[];
  fixed: Record<string, string | number>;
  support: { dist_edges: number[]; def_edges: number[]; counts: number[][] };
};

export type GridAxis = "shot_dist" | "def_dist" | "shot_clock" | "touch_time" | "dribbles";

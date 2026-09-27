"""shared constants: paths, feature groups, search grids, reference results."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
RAW_CSV = DATA_DIR / "shot_logs.csv"
WEB_DIR = ROOT / "web"

SEED = 42
TEST_SIZE = 0.2
ALPHA = 50          # target encoding shrinkage, a player needs ~50 shots to be trusted
ENCODE_FOLDS = 5    # folds for out-of-fold target encoding
CV_FOLDS = 3        # folds for the hyperparameter search
N_SEARCH = 6        # random configs tried per model
SHAP_SAMPLE = 2000
MIN_SHOTS = 200     # leaderboard qualification
SITUATION_FOLDS = 5 # out-of-fold scoring for the leaderboard's no-identity model

NUMERIC = [
    "SHOT_DIST", "SHOT_CLOCK", "CLOSE_DEF_DIST",
    "LOG_DRIBBLES", "LOG_TOUCH_TIME", "GAME_CLOCK_SEC",
    "PTS_TYPE", "PERIOD", "SHOT_NUMBER",
    "SHOT_CLOCK_FRAC", "DEF_DIST_PER_SHOT_DIST",
]
BINARY = [
    "IS_CATCH_AND_SHOOT", "IS_LATE_CLOCK", "IS_BUZZER_BEATER",
    "IS_HOME", "IS_OPEN", "SHOT_CLOCK_MISSING",
]
CATEGORICAL = ["SHOT_ZONE"]
TARGET_ENCODE = ["player_id", "CLOSEST_DEFENDER_PLAYER_ID"]
NUMERIC_FINAL = NUMERIC + [c + "_FG_ENC" for c in TARGET_ENCODE]

ZONE_ORDER = ["restricted", "paint", "mid_short", "mid_long", "three", "deep_three"]

# search spaces, key order matters because configs are sampled key by key
XGB_GRID = {
    "n_estimators":     [150, 200, 250],
    "max_depth":        [4, 5, 6, 7],
    "learning_rate":    [0.05, 0.08, 0.1],
    "min_child_weight": [1, 5, 10],
    "subsample":        [0.8, 1.0],
    "colsample_bytree": [0.8, 1.0],
    "reg_lambda":       [0.5, 1.0, 3.0],
}
LGB_GRID = {
    "n_estimators":      [150, 200, 250],
    "num_leaves":        [15, 31, 63],
    "max_depth":         [-1, 6, 8],
    "learning_rate":     [0.05, 0.08, 0.1],
    "min_child_samples": [10, 20, 50],
    "subsample":         [0.8, 1.0],
    "colsample_bytree":  [0.8, 1.0],
    "reg_lambda":        [0.5, 1.0, 3.0],
}
XGB_FIXED = {"eval_metric": "logloss", "random_state": SEED, "n_jobs": -1, "tree_method": "hist"}
LGB_FIXED = {"random_state": SEED, "n_jobs": -1, "verbose": -1}

# winners of the notebook search, used by --fast to skip the search
KNOWN_BEST_PARAMS = {
    "xgb": {"n_estimators": 250, "max_depth": 4, "learning_rate": 0.05, "min_child_weight": 10,
            "subsample": 1.0, "colsample_bytree": 0.8, "reg_lambda": 0.5},
    "lgb": {"n_estimators": 150, "num_leaves": 15, "max_depth": 6, "learning_rate": 0.05,
            "min_child_samples": 20, "subsample": 1.0, "colsample_bytree": 1.0, "reg_lambda": 0.5},
}

# test set results recorded in notebooks/nba_shot_quality.ipynb, used for the parity check
NOTEBOOK_REFERENCE = {
    "LightGBM (tuned)":    {"Accuracy": 0.6201, "LogLoss": 0.6476, "Brier": 0.2288, "AUC": 0.6392},
    "XGBoost (tuned)":     {"Accuracy": 0.6197, "LogLoss": 0.6478, "Brier": 0.2289, "AUC": 0.6389},
    "Random Forest":       {"Accuracy": 0.6186, "LogLoss": 0.6486, "Brier": 0.2292, "AUC": 0.6382},
    "MLP":                 {"Accuracy": 0.6180, "LogLoss": 0.6525, "Brier": 0.2307, "AUC": 0.6350},
    "LightGBM":            {"Accuracy": 0.6161, "LogLoss": 0.6495, "Brier": 0.2297, "AUC": 0.6349},
    "Logistic Regression": {"Accuracy": 0.6155, "LogLoss": 0.6546, "Brier": 0.2315, "AUC": 0.6342},
    "XGBoost":             {"Accuracy": 0.6169, "LogLoss": 0.6497, "Brier": 0.2298, "AUC": 0.6334},
    "Naive (always avg)":  {"Accuracy": 0.5479, "LogLoss": 0.6886, "Brier": 0.2477, "AUC": 0.5000},
}
NOTEBOOK_SHAP_TOP = [
    ("DEF_DIST_PER_SHOT_DIST", 0.2569),
    ("SHOT_DIST", 0.2054),
    ("LOG_TOUCH_TIME", 0.1109),
    ("CLOSE_DEF_DIST", 0.0856),
]
# the notebook's leaderboard pooled in-sample predictions, the package uses out-of-fold ones,
# so these are printed for reference only
NOTEBOOK_PLAYERS = {"qualified": 248, "top": ("Kyle Korver", 10.92), "bottom": ("Omer Asik", -11.68)}

# plain names for the site
FEATURE_LABELS = {
    "DEF_DIST_PER_SHOT_DIST": "Defender gap / shot distance",
    "SHOT_DIST": "Shot distance",
    "LOG_TOUCH_TIME": "Touch time",
    "CLOSE_DEF_DIST": "Closest defender distance",
    "SHOT_CLOCK": "Shot clock",
    "PTS_TYPE": "Two or three",
    "LOG_DRIBBLES": "Dribbles",
    "player_id_FG_ENC": "Shooter (encoded FG%)",
    "SHOT_NUMBER": "Shooter's shot # in game",
    "GAME_CLOCK_SEC": "Game clock",
    "CLOSEST_DEFENDER_PLAYER_ID_FG_ENC": "Defender (encoded FG% allowed)",
    "PERIOD": "Period",
    "SHOT_CLOCK_FRAC": "Shot clock (fraction)",
    "IS_CATCH_AND_SHOOT": "Catch and shoot",
    "IS_LATE_CLOCK": "Late clock (4s or less)",
    "IS_BUZZER_BEATER": "Buzzer beater",
    "IS_HOME": "Home game",
    "IS_OPEN": "Open (6+ ft)",
    "SHOT_CLOCK_MISSING": "Shot clock off",
    "SHOT_ZONE_mid_long": "Zone: long mid-range",
    "SHOT_ZONE_mid_short": "Zone: short mid-range",
    "SHOT_ZONE_paint": "Zone: paint",
    "SHOT_ZONE_restricted": "Zone: restricted area",
    "SHOT_ZONE_three": "Zone: three",
}
# units for dependence plot x axes, log features are shown back in raw units
FEATURE_UNITS = {
    "DEF_DIST_PER_SHOT_DIST": "ratio",
    "SHOT_DIST": "ft",
    "LOG_TOUCH_TIME": "sec",
    "CLOSE_DEF_DIST": "ft",
    "SHOT_CLOCK": "sec",
    "LOG_DRIBBLES": "dribbles",
    "GAME_CLOCK_SEC": "sec",
}

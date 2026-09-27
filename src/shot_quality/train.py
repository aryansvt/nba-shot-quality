"""baseline models, random search, tuned models, and the no-identity situation model."""
import random
import time

import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import log_loss
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBClassifier

from .config import (
    BINARY, CATEGORICAL, CV_FOLDS, LGB_FIXED, N_SEARCH, NUMERIC, SEED, SITUATION_FOLDS, XGB_FIXED,
)
from .features import Matrices, SmoothedTargetEncoder


def baseline_models() -> dict:
    # (model, input matrix) pairs, linear and mlp get scaled inputs
    return {
        "Logistic Regression": (LogisticRegression(max_iter=1000, random_state=SEED), "scaled"),
        "Random Forest": (
            RandomForestClassifier(n_estimators=100, max_depth=12, min_samples_leaf=20,
                                   n_jobs=-1, random_state=SEED),
            "trees",
        ),
        "XGBoost": (
            XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.1,
                          eval_metric="logloss", random_state=SEED, n_jobs=-1),
            "trees",
        ),
        "LightGBM": (
            LGBMClassifier(n_estimators=200, learning_rate=0.1,
                           random_state=SEED, n_jobs=-1, verbose=-1),
            "trees",
        ),
        "MLP": (
            MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=40,
                          early_stopping=True, random_state=SEED),
            "scaled",
        ),
    }


def fit_baselines(m: Matrices, log=print) -> dict[str, np.ndarray]:
    probas = {}
    for name, (model, kind) in baseline_models().items():
        t0 = time.time()
        Xtr = m.train_scaled if kind == "scaled" else m.train_trees
        Xte = m.test_scaled if kind == "scaled" else m.test_trees
        model.fit(Xtr, m.y_train)
        probas[name] = model.predict_proba(Xte)[:, 1]
        log(f"  {name:<22} fit in {time.time() - t0:.1f}s")
    return probas


def sample_config(grid: dict, rng_obj: random.Random) -> dict:
    return {k: rng_obj.choice(v) for k, v in grid.items()}


def run_cv(model_cls, params: dict, fixed_kw: dict, X: np.ndarray, y: np.ndarray, splitter) -> float:
    # mean validation log loss across folds
    losses = []
    for tr_idx, val_idx in splitter.split(X, y):
        m = model_cls(**params, **fixed_kw)
        m.fit(X[tr_idx], y[tr_idx])
        proba = m.predict_proba(X[val_idx])[:, 1]
        losses.append(log_loss(y[val_idx], proba))
    return float(np.mean(losses))


def random_search(model_cls, grid: dict, fixed_kw: dict, X: np.ndarray, y: np.ndarray,
                  n_iter: int = N_SEARCH, log=print) -> tuple[dict, list[dict]]:
    # fresh rng per model so each search draws the same configs as the notebook
    rng = random.Random(SEED)
    splitter = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=SEED)
    history = []
    for i in range(n_iter):
        cfg = sample_config(grid, rng)
        score = run_cv(model_cls, cfg, fixed_kw, X, y, splitter)
        history.append({"params": cfg, "cv_logloss": score})
        log(f"  config {i + 1}/{n_iter}  logloss={score:.4f}")
    best = min(history, key=lambda r: r["cv_logloss"])
    return best["params"], history


def fit_tuned(m: Matrices, xgb_params: dict, lgb_params: dict):
    xgb = XGBClassifier(**xgb_params, **XGB_FIXED)
    xgb.fit(m.train_trees, m.y_train)
    lgb = LGBMClassifier(**lgb_params, **LGB_FIXED)
    lgb.fit(m.train_trees, m.y_train)
    return xgb, lgb


def situation_expected(df: pd.DataFrame) -> pd.DataFrame:
    """out-of-fold expected make probability for every shot, from a model that never sees the shooter.

    player skill is left out on purpose so it shows up in actual minus expected.
    each shot is scored by a model trained on the other folds, so every expected
    value is out-of-sample. (the notebook pooled in-sample train predictions with
    test predictions instead.)
    """
    X = df[NUMERIC + BINARY + CATEGORICAL + ["CLOSEST_DEFENDER_PLAYER_ID"]]
    y = df["FGM"]

    pre = ColumnTransformer([
        ("num", "passthrough", NUMERIC),
        # defender encoding is fine, we are measuring the shooter. it lives in the
        # pipeline so each fold re-learns it without seeing the held-out shots
        ("def", SmoothedTargetEncoder(), ["CLOSEST_DEFENDER_PLAYER_ID"]),
        ("bin", "passthrough", BINARY),
        ("cat", OneHotEncoder(drop="first", sparse_output=False), CATEGORICAL),
    ])
    model = Pipeline([
        ("pre", pre),
        ("lgbm", LGBMClassifier(n_estimators=200, num_leaves=15, max_depth=6,
                                learning_rate=0.05, min_child_samples=20,
                                random_state=SEED, n_jobs=-1, verbose=-1)),
    ])
    cv = StratifiedKFold(n_splits=SITUATION_FOLDS, shuffle=True, random_state=SEED)
    expected = cross_val_predict(model, X, y, cv=cv, method="predict_proba")[:, 1]

    return pd.DataFrame({
        "player_id": df["player_id"].to_numpy(),
        "player_name": df["player_name"].to_numpy(),
        "actual": y.to_numpy(),
        "expected": expected,
    })

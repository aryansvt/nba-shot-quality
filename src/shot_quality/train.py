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
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBClassifier

from .config import (
    BINARY, CATEGORICAL, CV_FOLDS, LGB_FIXED, N_SEARCH, NUMERIC, SEED, TEST_SIZE, XGB_FIXED,
)
from .features import Matrices, oof_encode, smoothed_mean


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
    """expected make probability for every shot from a model that never sees the shooter.

    player skill is left out on purpose so it shows up in actual minus expected.
    train and test predictions are pooled for bigger per-player samples, as in the notebook.
    """
    X2 = df[NUMERIC + BINARY + CATEGORICAL + ["CLOSEST_DEFENDER_PLAYER_ID"]].copy()
    y2 = df["FGM"].copy()
    X2_tr, X2_te, y2_tr, y2_te, id_tr, id_te, nm_tr, nm_te = train_test_split(
        X2, y2, df["player_id"], df["player_name"],
        test_size=TEST_SIZE, random_state=SEED, stratify=y2)

    # defender encoding is fine, we are measuring the shooter
    prior2 = y2_tr.mean()
    def_map = smoothed_mean(X2_tr["CLOSEST_DEFENDER_PLAYER_ID"], y2_tr, prior2)
    X2_tr["DEFENDER_ENC"] = oof_encode(X2_tr["CLOSEST_DEFENDER_PLAYER_ID"], y2_tr).values
    X2_te["DEFENDER_ENC"] = X2_te["CLOSEST_DEFENDER_PLAYER_ID"].map(def_map).fillna(prior2)
    X2_tr = X2_tr.drop(columns=["CLOSEST_DEFENDER_PLAYER_ID"])
    X2_te = X2_te.drop(columns=["CLOSEST_DEFENDER_PLAYER_ID"])

    pre = ColumnTransformer([
        ("num", "passthrough", NUMERIC + ["DEFENDER_ENC"]),
        ("bin", "passthrough", BINARY),
        ("cat", OneHotEncoder(drop="first", sparse_output=False), CATEGORICAL),
    ])
    X2_tr_arr = pre.fit_transform(X2_tr)
    X2_te_arr = pre.transform(X2_te)

    model = LGBMClassifier(n_estimators=200, num_leaves=15, max_depth=6,
                           learning_rate=0.05, min_child_samples=20,
                           random_state=SEED, n_jobs=-1, verbose=-1)
    model.fit(X2_tr_arr, y2_tr)

    return pd.DataFrame({
        "player_id": pd.concat([id_tr, id_te]).values,
        "player_name": pd.concat([nm_tr, nm_te]).values,
        "actual": pd.concat([y2_tr, y2_te]).values,
        "expected": np.concatenate([model.predict_proba(X2_tr_arr)[:, 1],
                                    model.predict_proba(X2_te_arr)[:, 1]]),
        "in_train": np.concatenate([np.ones(len(y2_tr), bool), np.zeros(len(y2_te), bool)]),
    })

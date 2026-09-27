"""train everything once and write the json the website reads.

usage:
    python scripts/export_site_data.py            # full run, includes the random search
    python scripts/export_site_data.py --fast     # reuse the notebook's best params

small files go to web/src/data (imported at build time), the predictor grid
goes to web/public/data (fetched in the browser).
"""
import argparse
import json
import time
from datetime import date
from importlib.metadata import version
from itertools import product
from pathlib import Path

import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from shot_quality.config import (
    FEATURE_LABELS, FEATURE_UNITS, KNOWN_BEST_PARAMS, LGB_FIXED, LGB_GRID, MIN_SHOTS,
    NOTEBOOK_PLAYERS, NOTEBOOK_REFERENCE, NOTEBOOK_SHAP_TOP, SEED, WEB_DIR, XGB_FIXED,
    XGB_GRID, ZONE_ORDER,
)
from shot_quality.data import load_clean
from shot_quality.evaluate import (
    calibration_points, get_metrics, naive_metrics, roc_points, shap_values, threshold_sweep,
)
from shot_quality.features import add_features, build_matrices, modeling_frame
from shot_quality.players import display_name, player_residuals
from shot_quality.train import fit_baselines, fit_tuned, random_search, situation_expected

HEADLINE = "LightGBM (tuned)"
NAIVE = "Naive (always avg)"
FAMILY = {
    "LightGBM (tuned)": "Gradient boosting",
    "XGBoost (tuned)": "Gradient boosting",
    "Random Forest": "Bagged trees",
    "MLP": "Neural net",
    "LightGBM": "Gradient boosting",
    "Logistic Regression": "Linear",
    "XGBoost": "Gradient boosting",
    NAIVE: "Baseline",
}
ZONE_LABELS = {
    "restricted": ("Restricted area", 0, 4),
    "paint": ("Paint", 4, 8),
    "mid_short": ("Short mid-range", 8, 16),
    "mid_long": ("Long mid-range", 16, 22),
    "three": ("Three", 22, 26),
    "deep_three": ("Deep three", 26, None),
}
# predictor grid axes, denser where the model changes fastest
GRID_AXES = {
    "shot_dist": [0, 1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 23, 24, 25, 26, 28, 30],
    "def_dist": [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15],
    "shot_clock": [0, 1, 2, 3, 4, 5, 7, 10, 13, 16, 20, 24],
    "touch_time": [0, 0.5, 1, 2, 3, 4, 6, 8, 12],
    "dribbles": [0, 1, 2, 3, 4, 6, 8, 12],
}
GRID_COLUMNS = ["SHOT_DIST", "CLOSE_DEF_DIST", "SHOT_CLOCK", "TOUCH_TIME", "DRIBBLES"]


def log(msg: str = "") -> None:
    print(msg, flush=True)


def r(x, n=4):
    return round(float(x), n)


def write_json(path: Path, obj, pretty: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    def default(o):
        if isinstance(o, np.integer):
            return int(o)
        if isinstance(o, np.floating):
            return float(o)
        if isinstance(o, np.ndarray):
            return o.tolist()
        raise TypeError(type(o))

    text = json.dumps(obj, default=default, allow_nan=False,
                      indent=2 if pretty else None,
                      separators=None if pretty else (",", ":"))
    path.write_text(text + "\n", encoding="utf-8", newline="\n")
    log(f"  wrote {path.as_posix()} ({path.stat().st_size / 1024:.0f} KB)")


def metric_row(name: str, m: dict) -> dict:
    return {
        "name": name,
        "family": FAMILY[name],
        "tuned": "(tuned)" in name,
        "accuracy": r(m["Accuracy"]),
        "log_loss": r(m["LogLoss"]),
        "brier": r(m["Brier"]),
        "auc": r(m["AUC"]),
    }


def shap_payload(X_shap, vals, base, feature_names) -> dict:
    mean_abs = np.abs(vals).mean(axis=0)
    order = np.argsort(mean_abs)[::-1]
    importance = [{"feature": feature_names[i], "label": FEATURE_LABELS[feature_names[i]],
                   "mean_abs": r(mean_abs[i])} for i in order]

    dependence = []
    for i in order[:4]:
        name = feature_names[i]
        x = X_shap[:, i].astype(float)
        if name.startswith("LOG_"):
            x = np.expm1(x)  # back to seconds / dribbles
        s = vals[:, i]
        # binned mean as a trend line
        edges = np.unique(np.quantile(x, np.linspace(0, 1, 21)))
        bins = np.clip(np.digitize(x, edges[1:-1]), 0, len(edges) - 2)
        trend = [(x[bins == b].mean(), s[bins == b].mean()) for b in range(len(edges) - 1) if (bins == b).any()]
        keep = slice(0, 1000)  # sample is already random, first 1000 is plenty to draw
        dependence.append({
            "feature": name,
            "label": FEATURE_LABELS[name],
            "unit": FEATURE_UNITS.get(name, ""),
            "domain": [r(np.quantile(x, 0.005), 3), r(np.quantile(x, 0.995), 3)],
            "x": np.round(x[keep], 3).tolist(),
            "shap": np.round(s[keep], 4).tolist(),
            "trend": {"x": [r(t[0], 3) for t in trend], "mean": [r(t[1]) for t in trend]},
        })
    return {"n": len(vals), "base_value": r(base), "units": "log-odds",
            "importance": importance, "dependence": dependence}


def context_payload(clean_df: pd.DataFrame, df: pd.DataFrame) -> dict:
    league = clean_df["FGM"].mean()

    zones = []
    for z in ZONE_ORDER:
        sub = df[df["SHOT_ZONE"] == z]
        label, lo, hi = ZONE_LABELS[z]
        zones.append({"zone": z, "label": label, "min_ft": lo, "max_ft": hi,
                      "fg": r(sub["FGM"].mean()), "n": len(sub)})

    feet = np.floor(df["SHOT_DIST"]).clip(upper=30).astype(int)
    by_distance = [{"ft": int(ft), "fg": r(g.mean()), "n": len(g)}
                   for ft, g in df["FGM"].groupby(feet)]

    # why raw defender distance looks useless: open shots are mostly long shots
    def_bands = [("0-2 ft", 0, 2), ("2-4 ft", 2, 4), ("4-6 ft", 4, 6), ("6+ ft", 6, np.inf)]
    dist_groups = [("At the rim", -np.inf, 4), ("4-16 ft", 4, 16), ("16-22 ft", 16, 22), ("22+ ft", 22, np.inf)]
    bands = []
    for label, lo, hi in def_bands:
        sub = df[(df["CLOSE_DEF_DIST"] >= lo) & (df["CLOSE_DEF_DIST"] < hi)]
        bands.append({"label": label, "fg": r(sub["FGM"].mean()), "n": len(sub),
                      "avg_shot_dist": r(sub["SHOT_DIST"].mean(), 1),
                      "share_threes": r((sub["PTS_TYPE"] == 3).mean())})
    groups = []
    for glabel, glo, ghi in dist_groups:
        g = df[(df["SHOT_DIST"] > glo) & (df["SHOT_DIST"] <= ghi)]
        cells = []
        for label, lo, hi in def_bands:
            sub = g[(g["CLOSE_DEF_DIST"] >= lo) & (g["CLOSE_DEF_DIST"] < hi)]
            cells.append({"band": label, "fg": r(sub["FGM"].mean()), "n": len(sub)})
        groups.append({"label": glabel, "cells": cells})

    # pca on the notebook's standardized numeric columns
    cols = ["SHOT_DIST", "SHOT_CLOCK", "CLOSE_DEF_DIST", "DRIBBLES", "TOUCH_TIME",
            "GAME_CLOCK_SEC", "PTS_TYPE", "PERIOD", "SHOT_NUMBER"]
    X_dim = clean_df[cols].dropna()
    y_dim = clean_df.loc[X_dim.index, "FGM"].values
    pca = PCA(n_components=len(cols))
    X_pca = pca.fit_transform(StandardScaler().fit_transform(X_dim))
    samp = np.random.RandomState(SEED).choice(len(X_pca), size=2000, replace=False)
    points = [[r(X_pca[i, 0], 3), r(X_pca[i, 1], 3), int(y_dim[i])] for i in samp]

    return {
        "league_fg": r(league),
        "zones": zones,
        "by_distance": by_distance,
        "defender": {
            "corr": r(clean_df["CLOSE_DEF_DIST"].corr(clean_df["FGM"])),
            "bands": bands,
            "by_distance": groups,
        },
        "pca": {"explained": [r(v) for v in pca.explained_variance_ratio_[:2]],
                "rows": len(X_dim), "points": points},
    }


def grid_payload(clean_df: pd.DataFrame, df: pd.DataFrame, m, model) -> dict:
    # hold everything but the five sliders at typical values
    fixed = {
        "GAME_CLOCK_SEC": int(clean_df["GAME_CLOCK_SEC"].median()),
        "PERIOD": int(clean_df["PERIOD"].median()),
        "SHOT_NUMBER": int(clean_df["SHOT_NUMBER"].median()),
        "SHOT_CLOCK_MISSING": 0,
    }
    base = pd.DataFrame(list(product(*GRID_AXES.values())), columns=GRID_COLUMNS)
    for k, v in fixed.items():
        base[k] = v
    # 22+ ft is a three in the majority of real shots at every foot
    base["PTS_TYPE"] = np.where(base["SHOT_DIST"] >= 22, 3, 2)

    preds = []
    for loc in ["H", "A"]:  # average over home and away
        frame = add_features(base.assign(LOCATION=loc))
        frame["player_id_FG_ENC"] = m.prior           # average shooter
        frame["CLOSEST_DEFENDER_PLAYER_ID_FG_ENC"] = m.prior  # average defender
        preds.append(model.predict_proba(m.trees_pipe.transform(frame[m.X_train.columns]))[:, 1])
    p = np.mean(preds, axis=0)

    # how many real shots sit in each distance x defender cell
    dist_edges = list(range(0, 32, 2))
    def_edges = list(range(0, 16))
    counts, _, _ = np.histogram2d(df["SHOT_DIST"], df["CLOSE_DEF_DIST"], bins=[dist_edges, def_edges])

    return {
        "model": HEADLINE,
        "order": list(GRID_AXES),
        "axes": GRID_AXES,
        "scale": 1000,
        "values": np.round(p * 1000).astype(int).tolist(),
        "fixed": {**fixed, "home_away": "averaged", "shooter": "league average",
                  "defender": "league average", "pts_type_rule": "3 if distance >= 22 ft"},
        "support": {"dist_edges": dist_edges, "def_edges": def_edges,
                    "counts": counts.astype(int).tolist()},
    }


def parity_report(results, best_xgb, best_lgb, shap_json, players) -> None:
    log("\nparity vs notebook (abs diff, flagged over 0.001)")
    worst = 0.0
    for name, ref in NOTEBOOK_REFERENCE.items():
        got = results[name]
        diffs = {k: got[k] - ref[k] for k in ref}
        worst = max(worst, *(abs(d) for d in diffs.values()))
        flag = "ok  " if all(abs(d) <= 0.001 for d in diffs.values()) else "DIFF"
        cells = "  ".join(f"{k} {got[k]:.4f} ({d:+.4f})" for k, d in diffs.items())
        log(f"  {flag} {name:<20} {cells}")
    log(f"  best params match: xgb={best_xgb == KNOWN_BEST_PARAMS['xgb']} lgb={best_lgb == KNOWN_BEST_PARAMS['lgb']}")
    for (feat, ref), row in zip(NOTEBOOK_SHAP_TOP, shap_json["importance"]):
        flag = "ok  " if row["feature"] == feat and abs(row["mean_abs"] - ref) <= 0.001 else "DIFF"
        log(f"  {flag} shap {feat:<24} notebook {ref:.4f}  now {row['feature']} {row['mean_abs']:.4f}")
    top, bottom = players.iloc[0], players.iloc[-1]
    log(f"  players: {len(players)} qualified (notebook {NOTEBOOK_PLAYERS['qualified']}), "
        f"top {top['player_name']} {top['over_expected'] * 100:+.2f}, "
        f"bottom {bottom['player_name']} {bottom['over_expected'] * 100:+.2f} "
        f"(notebook {NOTEBOOK_PLAYERS['top']}, {NOTEBOOK_PLAYERS['bottom']})")
    log(f"  largest metric diff: {worst:.4f}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--fast", action="store_true", help="skip the random search, use known best params")
    ap.add_argument("--web-dir", type=Path, default=WEB_DIR, help="next.js app folder")
    args = ap.parse_args()
    t_start = time.time()

    log("loading and cleaning")
    clean_df = load_clean()
    df = modeling_frame(clean_df)
    m = build_matrices(df)
    log(f"  {len(df):,} shots, train {len(m.y_train):,}, test {len(m.y_test):,}, {len(m.feature_names)} features")

    log("baseline models")
    probas = fit_baselines(m, log=log)

    if args.fast:
        log("tuning skipped (--fast)")
        best_xgb, best_lgb = KNOWN_BEST_PARAMS["xgb"], KNOWN_BEST_PARAMS["lgb"]
        xgb_hist = lgb_hist = None
    else:
        log("xgboost search")
        best_xgb, xgb_hist = random_search(XGBClassifier, XGB_GRID, XGB_FIXED,
                                           m.train_trees, m.y_train.values, log=log)
        log("lightgbm search")
        best_lgb, lgb_hist = random_search(LGBMClassifier, LGB_GRID, LGB_FIXED,
                                           m.train_trees, m.y_train.values, log=log)

    xgb_tuned, lgb_tuned = fit_tuned(m, best_xgb, best_lgb)
    probas["XGBoost (tuned)"] = xgb_tuned.predict_proba(m.test_trees)[:, 1]
    probas[HEADLINE] = lgb_tuned.predict_proba(m.test_trees)[:, 1]

    results = {name: get_metrics(m.y_test, p) for name, p in probas.items()}
    results[NAIVE], _ = naive_metrics(m.y_train, m.y_test)
    ranked = sorted(results, key=lambda k: results[k]["AUC"], reverse=True)

    log("curves, threshold sweep, shap")
    roc = {name: roc_points(m.y_test, probas[name]) for name in ranked if name != NAIVE}
    calibration = {name: calibration_points(m.y_test, probas[name]) for name in ranked if name != NAIVE}
    sweep = threshold_sweep(m.y_test, probas[HEADLINE])
    X_shap, vals, base = shap_values(lgb_tuned, m.test_trees)
    shap_json = shap_payload(X_shap, vals, base, m.feature_names)

    log("situation model and player residuals")
    shots = situation_expected(df)
    players = player_residuals(shots)

    log("context and predictor grid")
    context = context_payload(clean_df, df)
    grid = grid_payload(clean_df, df, m, lgb_tuned)

    head, naive = results[HEADLINE], results[NAIVE]
    real_models = [n for n in ranked if n != NAIVE]
    metrics = {
        "generated": date.today().isoformat(),
        "dataset": {
            "season": "2014-15",
            "shots": len(clean_df),
            "players": int(clean_df["player_id"].nunique()),
            "games": int(clean_df["GAME_ID"].nunique()),
            "made": int(clean_df["FGM"].sum()),
            "missed": int((clean_df["FGM"] == 0).sum()),
            "league_fg": r(clean_df["FGM"].mean()),
            "train": len(m.y_train),
            "test": len(m.y_test),
            "features": len(m.feature_names),
        },
        "headline": {"model": HEADLINE, **{k: v for k, v in metric_row(HEADLINE, head).items()
                                           if k in ("accuracy", "log_loss", "brier", "auc")}},
        "naive": {k: v for k, v in metric_row(NAIVE, naive).items()
                  if k in ("accuracy", "log_loss", "brier", "auc")},
        "log_loss_gain": r(1 - head["LogLoss"] / naive["LogLoss"]),
        "brier_gain": r(1 - head["Brier"] / naive["Brier"]),
        "auc_spread": r(results[real_models[0]]["AUC"] - results[real_models[-1]]["AUC"]),
        "threshold": {k: sweep[k] for k in ("best_f1_threshold", "best_f1", "accuracy_at_0_5")},
        "versions": {pkg: version(pkg) for pkg in
                     ("numpy", "pandas", "scikit-learn", "lightgbm", "xgboost", "shap")},
    }
    models_json = {
        "headline": HEADLINE,
        "models": [metric_row(n, results[n]) for n in ranked],
        "calibration": calibration,
        "search": {
            "folds": 3,
            "xgb": {"best": best_xgb, "history": xgb_hist},
            "lgb": {"best": best_lgb, "history": lgb_hist},
        },
        "threshold": sweep,
    }
    fpr = next(iter(roc.values()))["fpr"]
    roc_json = {"fpr": fpr, "curves": [{"name": n, "auc": r(results[n]["AUC"]), "tpr": roc[n]["tpr"]}
                                       for n in roc]}
    players_json = {
        "min_shots": MIN_SHOTS,
        "count": len(players),
        "in_sample_share": r(shots["in_train"].mean(), 2),
        "players": [{
            "id": int(p.player_id),
            "name": display_name(p.player_name),
            "shots": int(p.shots),
            "actual": r(p.actual_fg),
            "expected": r(p.expected_fg),
            "diff": r(p.over_expected),
            "se": r(p.se),
        } for p in players.itertuples()],
    }

    log("writing json")
    data_dir = args.web_dir / "src" / "data"
    write_json(data_dir / "metrics.json", metrics, pretty=True)
    write_json(data_dir / "models.json", models_json, pretty=True)
    write_json(data_dir / "roc.json", roc_json)
    write_json(data_dir / "shap.json", shap_json)
    write_json(data_dir / "players.json", players_json)
    write_json(data_dir / "context.json", context)
    write_json(args.web_dir / "public" / "data" / "predictor_grid.json", grid)

    parity_report(results, best_xgb, best_lgb, shap_json, players)
    log(f"\ndone in {time.time() - t_start:.0f}s")


if __name__ == "__main__":
    main()

"""metrics, curves, threshold sweep, and shap values."""
import warnings

import numpy as np
import shap
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    accuracy_score, brier_score_loss, f1_score, log_loss, precision_score,
    recall_score, roc_auc_score, roc_curve,
)

from .config import SEED, SHAP_SAMPLE


def get_metrics(y_true, proba) -> dict:
    pred = (proba >= 0.5).astype(int)
    return {
        "Accuracy": accuracy_score(y_true, pred),
        "LogLoss": log_loss(y_true, proba),
        "Brier": brier_score_loss(y_true, proba),
        "AUC": roc_auc_score(y_true, proba),
    }


def naive_metrics(y_train, y_test) -> tuple[dict, np.ndarray]:
    # always predict the training make rate, the floor every model has to beat
    p = np.full(len(y_test), float(y_train.mean()))
    return {
        "Accuracy": accuracy_score(y_test, (p >= 0.5).astype(int)),
        "LogLoss": log_loss(y_test, p),
        "Brier": brier_score_loss(y_test, p),
        "AUC": 0.5,
    }, p


def roc_points(y_true, proba) -> dict:
    # resample onto a fixed fpr grid, denser near zero where the curve bends
    fpr, tpr, _ = roc_curve(y_true, proba)
    grid = np.unique(np.concatenate([[0.0], np.geomspace(0.001, 0.05, 14), np.linspace(0.05, 1, 96)]))
    tpr_grid = np.interp(grid, fpr, tpr)
    return {"fpr": grid.round(4).tolist(), "tpr": tpr_grid.round(4).tolist()}


def calibration_points(y_true, proba, n_bins: int = 10) -> dict:
    frac_pos, mean_pred = calibration_curve(y_true, proba, n_bins=n_bins, strategy="quantile")
    return {"predicted": mean_pred.round(4).tolist(), "actual": frac_pos.round(4).tolist()}


def threshold_sweep(y_true, proba) -> dict:
    thresholds = np.linspace(0.05, 0.95, 91)
    acc, prec, rec, f1 = [], [], [], []
    for t in thresholds:
        pred = (proba >= t).astype(int)
        acc.append(accuracy_score(y_true, pred))
        prec.append(precision_score(y_true, pred, zero_division=0))
        rec.append(recall_score(y_true, pred, zero_division=0))
        f1.append(f1_score(y_true, pred, zero_division=0))
    best = int(np.argmax(f1))
    return {
        "thresholds": thresholds.round(2).tolist(),
        "accuracy": np.round(acc, 4).tolist(),
        "precision": np.round(prec, 4).tolist(),
        "recall": np.round(rec, 4).tolist(),
        "f1": np.round(f1, 4).tolist(),
        "best_f1_threshold": round(float(thresholds[best]), 2),
        "best_f1": round(float(f1[best]), 4),
        "accuracy_at_0_5": round(float(acc[45]), 4),
    }


def shap_values(model, X: np.ndarray, n: int = SHAP_SAMPLE):
    # same random test rows as the notebook
    rng = np.random.RandomState(SEED)
    idx = rng.choice(len(X), size=n, replace=False)
    X_shap = X[idx]
    explainer = shap.TreeExplainer(model)
    with warnings.catch_warnings():
        # shap warns that lightgbm binary output format changed, both formats are handled below
        warnings.simplefilter("ignore", UserWarning)
        vals = explainer.shap_values(X_shap)
    if isinstance(vals, list):
        vals = vals[1]          # class 1 = made shot
    elif vals.ndim == 3:
        vals = vals[:, :, 1]
    base = explainer.expected_value
    if np.ndim(base) > 0:
        base = np.ravel(base)[-1]
    return X_shap, vals, float(base)

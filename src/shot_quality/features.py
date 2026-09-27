"""feature engineering, leak-free target encoding, and model matrices."""
from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import KFold, train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from .config import (
    ALPHA, BINARY, CATEGORICAL, ENCODE_FOLDS, NUMERIC, NUMERIC_FINAL,
    SEED, TARGET_ENCODE, TEST_SIZE,
)
from .data import csv_roundtrip


def assign_zone(dist: float) -> str:
    # bins mirror how teams usually group shot locations
    if dist <= 4:
        return "restricted"
    elif dist <= 8:
        return "paint"
    elif dist <= 16:
        return "mid_short"
    elif dist <= 22:
        return "mid_long"
    elif dist <= 26:
        return "three"
    return "deep_three"


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # when the shot clock is off, the period clock is the real time pressure
    missing = df["SHOT_CLOCK"].isna()
    df.loc[missing, "SHOT_CLOCK"] = df.loc[missing, "GAME_CLOCK_SEC"].clip(upper=24)

    df["SHOT_ZONE"] = df["SHOT_DIST"].apply(assign_zone)

    df["IS_CATCH_AND_SHOOT"] = (df["DRIBBLES"] == 0).astype(int)
    df["IS_LATE_CLOCK"] = (df["SHOT_CLOCK"] <= 4).astype(int)
    df["IS_BUZZER_BEATER"] = (df["GAME_CLOCK_SEC"] <= 3).astype(int)
    df["IS_HOME"] = (df["LOCATION"] == "H").astype(int)
    df["IS_OPEN"] = (df["CLOSE_DEF_DIST"] >= 6).astype(int)  # 6+ ft counts as open

    # log1p handles zeros and squashes the long right tail
    df["LOG_DRIBBLES"] = np.log1p(df["DRIBBLES"])
    df["LOG_TOUCH_TIME"] = np.log1p(df["TOUCH_TIME"])

    df["SHOT_CLOCK_FRAC"] = df["SHOT_CLOCK"] / 24.0

    # openness relative to difficulty, the top shap feature
    df["DEF_DIST_PER_SHOT_DIST"] = df["CLOSE_DEF_DIST"] / (df["SHOT_DIST"] + 1)
    return df


def modeling_frame(clean_df: pd.DataFrame) -> pd.DataFrame:
    # same as the notebook's data/modeling.csv
    return csv_roundtrip(add_features(clean_df))


def split(df: pd.DataFrame, cols: list[str]):
    # stratified so both halves keep the 45/55 make/miss balance
    X = df[cols].copy()
    y = df["FGM"].copy()
    return train_test_split(X, y, test_size=TEST_SIZE, random_state=SEED, stratify=y)


def smoothed_mean(vals: pd.Series, target: pd.Series, prior: float, alpha: int = ALPHA) -> pd.Series:
    # bayesian shrinkage of each group's mean toward the league prior
    g = pd.DataFrame({"v": vals, "t": target}).groupby("v")["t"]
    counts = g.count()
    means = g.mean()
    return (counts * means + alpha * prior) / (counts + alpha)


def oof_encode(values: pd.Series, target: pd.Series, n_folds: int = ENCODE_FOLDS,
               alpha: int = ALPHA) -> pd.Series:
    # each fold is encoded from the other folds only, so a row never sees its own label
    prior = target.mean()
    encoded = pd.Series(prior, index=values.index, dtype=float)
    kf = KFold(n_splits=n_folds, shuffle=True, random_state=SEED)
    for tr_idx, val_idx in kf.split(values):
        enc_map = smoothed_mean(values.iloc[tr_idx], target.iloc[tr_idx], prior, alpha)
        encoded.iloc[val_idx] = values.iloc[val_idx].map(enc_map).fillna(prior)
    return encoded


def encode_test(test_vals: pd.Series, train_vals: pd.Series, train_target: pd.Series,
                alpha: int = ALPHA) -> pd.Series:
    prior = train_target.mean()
    enc_map = smoothed_mean(train_vals, train_target, prior, alpha)
    return test_vals.map(enc_map).fillna(prior)


def target_encode(X_train: pd.DataFrame, X_test: pd.DataFrame, y_train: pd.Series):
    X_train, X_test = X_train.copy(), X_test.copy()
    for col in TARGET_ENCODE:
        X_train[col + "_FG_ENC"] = oof_encode(X_train[col], y_train).values
        X_test[col + "_FG_ENC"] = encode_test(X_test[col], X_train[col], y_train).values
    return X_train.drop(columns=TARGET_ENCODE), X_test.drop(columns=TARGET_ENCODE)


def make_preprocessors(numeric: list[str] = NUMERIC_FINAL):
    # linear models and the mlp need scaling, trees do not
    scaled = ColumnTransformer([
        ("num", StandardScaler(), numeric),
        ("bin", "passthrough", BINARY),
        ("cat", OneHotEncoder(drop="first", sparse_output=False), CATEGORICAL),
    ])
    trees = ColumnTransformer([
        ("num", "passthrough", numeric),
        ("bin", "passthrough", BINARY),
        ("cat", OneHotEncoder(drop="first", sparse_output=False), CATEGORICAL),
    ])
    return scaled, trees


@dataclass
class Matrices:
    X_train: pd.DataFrame   # encoded frames, before the column transform
    X_test: pd.DataFrame
    y_train: pd.Series
    y_test: pd.Series
    train_scaled: np.ndarray
    test_scaled: np.ndarray
    train_trees: np.ndarray
    test_trees: np.ndarray
    feature_names: list[str]
    trees_pipe: ColumnTransformer
    prior: float            # training make rate, also the encoding fallback


def build_matrices(df: pd.DataFrame) -> Matrices:
    X_train, X_test, y_train, y_test = split(df, NUMERIC + BINARY + CATEGORICAL + TARGET_ENCODE)
    X_train, X_test = target_encode(X_train, X_test, y_train)

    scaled, trees = make_preprocessors()
    train_scaled = scaled.fit_transform(X_train)
    test_scaled = scaled.transform(X_test)
    train_trees = trees.fit_transform(X_train)
    test_trees = trees.transform(X_test)

    ohe = scaled.named_transformers_["cat"]
    feature_names = NUMERIC_FINAL + BINARY + list(ohe.get_feature_names_out(CATEGORICAL))

    return Matrices(
        X_train=X_train, X_test=X_test, y_train=y_train, y_test=y_test,
        train_scaled=train_scaled, test_scaled=test_scaled,
        train_trees=train_trees, test_trees=test_trees,
        feature_names=feature_names, trees_pipe=trees, prior=float(y_train.mean()),
    )

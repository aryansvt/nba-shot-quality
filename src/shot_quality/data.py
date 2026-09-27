"""loading and cleaning the raw sportvu shot logs."""
import io

import pandas as pd

from .config import RAW_CSV


def clock_to_sec(s: str) -> int:
    # game clock comes as "m:ss"
    mins, secs = s.split(":")
    return int(mins) * 60 + int(secs)


def load_raw(path=RAW_CSV) -> pd.DataFrame:
    return pd.read_csv(path)


def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["GAME_CLOCK_SEC"] = df["GAME_CLOCK"].apply(clock_to_sec)

    # flag before filling, missingness is informative (end of period shots)
    df["SHOT_CLOCK_MISSING"] = df["SHOT_CLOCK"].isna().astype(int)

    # negative touch times are sensor glitches on catch-and-shoot plays
    df.loc[df["TOUCH_TIME"] < 0, "TOUCH_TIME"] = 0.0

    df["player_name"] = df["player_name"].str.title()
    return df


def csv_roundtrip(df: pd.DataFrame) -> pd.DataFrame:
    """write a frame to csv text and read it back.

    the notebook saves and reloads csvs between steps. pandas' default float
    parser can land one ulp off the original value, which is enough to move a
    few lightgbm histogram bins. mirroring it reproduces the notebook exactly.
    """
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return pd.read_csv(buf)


def load_clean(path=RAW_CSV) -> pd.DataFrame:
    # same as the notebook's data/cleaned.csv
    return csv_roundtrip(clean(load_raw(path)))

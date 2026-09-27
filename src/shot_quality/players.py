"""per-player shot-making over expected."""
import numpy as np
import pandas as pd

from .config import MIN_SHOTS

# the source data has typos and title() mangles some names, display only
NAME_FIXES = {
    "Al Farouq Aminu": "Al-Farouq Aminu",
    "Alan Crabbe": "Allen Crabbe",
    "Amare Stoudemire": "Amar'e Stoudemire",
    "Ben Mclemore": "Ben McLemore",
    "Beno Urdih": "Beno Udrih",
    "Cj Mccollum": "CJ McCollum",
    "Cj Miles": "CJ Miles",
    "Cj Watson": "CJ Watson",
    "Danilo Gallinai": "Danilo Gallinari",
    "Deandre Jordan": "DeAndre Jordan",
    "Demarcus Cousins": "DeMarcus Cousins",
    "Demarre Carroll": "DeMarre Carroll",
    "Dirk Nowtizski": "Dirk Nowitzki",
    "Dj Augustin": "D.J. Augustin",
    "Dwayne Wade": "Dwyane Wade",
    "Jakarr Sampson": "JaKarr Sampson",
    "Jimmer Dredette": "Jimmer Fredette",
    "Jj Hickson": "J.J. Hickson",
    "Jj Redick": "JJ Redick",
    "Jon Ingles": "Joe Ingles",
    "Kj Mcdaniels": "K.J. McDaniels",
    "Kyle Oquinn": "Kyle O'Quinn",
    "Lamarcus Aldridge": "LaMarcus Aldridge",
    "Lebron James": "LeBron James",
    "Luc Mbah A Moute": "Luc Mbah a Moute",
    "Mnta Ellis": "Monta Ellis",
    "Nerles Noel": "Nerlens Noel",
    "Oj Mayo": "O.J. Mayo",
    "Pj Tucker": "P.J. Tucker",
    "Ray Mccallum": "Ray McCallum",
    "Steve Adams": "Steven Adams",
    "Time Hardaway Jr": "Tim Hardaway Jr.",
    "Zach Lavine": "Zach LaVine",
}


def display_name(name: str) -> str:
    return NAME_FIXES.get(name, name)


def player_residuals(shots: pd.DataFrame, min_shots: int = MIN_SHOTS) -> pd.DataFrame:
    """actual fg% minus expected fg% per player, like expected goals in soccer.

    se is the noise you'd see from shot-to-shot luck alone if the player were
    exactly average for their shot diet: sqrt(sum p(1-p)) / n.
    """
    shots = shots.assign(
        over_expected=shots["actual"] - shots["expected"],
        var=shots["expected"] * (1 - shots["expected"]),
    )
    stats = shots.groupby(["player_id", "player_name"]).agg(
        shots=("actual", "count"),
        actual_fg=("actual", "mean"),
        expected_fg=("expected", "mean"),
        over_expected=("over_expected", "mean"),
        var_sum=("var", "sum"),
    ).reset_index()
    stats["se"] = np.sqrt(stats["var_sum"]) / stats["shots"]
    qualified = stats[stats["shots"] >= min_shots].drop(columns="var_sum")
    return qualified.sort_values("over_expected", ascending=False).reset_index(drop=True)

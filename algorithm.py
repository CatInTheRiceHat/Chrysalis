"""
Testing different algorithms for the project.

Baseline: engagement-only ranking
Prototype: engagement (decayed) + diversity (Gini) + prosocial - risk (similarity mindset)
"""

from __future__ import annotations

from typing import Dict, List, Tuple
import pandas as pd
import numpy as np


# -----------------------------
# Presets / Modes
# -----------------------------

WEIGHTS: Dict[str, Dict[str, float]] = {
    "baseline": {"e": 1.00, "d": 0.00, "p": 0.00, "r": 0.00},
    "entertainment": {"e": 0.55, "d": 0.20, "p": 0.15, "r": 0.10},
    "inspiration": {"e": 0.30, "d": 0.40, "p": 0.20, "r": 0.10},
    "learning": {"e": 0.30, "d": 0.30, "p": 0.30, "r": 0.10},
}

NIGHT_MODE_K = 15


def night_mode_settings(w, risk_boost=0.05):
    w2 = dict(w)
    w2["r"] = w2.get("r", 0.0) + risk_boost

    total = sum(w2.values())
    if total != 0:
        for key in w2:
            w2[key] = w2[key] / total

    return w2, NIGHT_MODE_K


def get_mode_settings(preset, night_mode=False, k_default=100):
    if preset not in WEIGHTS:
        raise KeyError(
            f"Unknown preset: {preset}. Options: {list(WEIGHTS.keys())}")

    w = WEIGHTS[preset]
    k = k_default

    if night_mode:
        w, k = night_mode_settings(w)

    return w, k


# -----------------------------
# Dataset prep / validation
# -----------------------------

REQUIRED_COLUMNS = {"view_count", "topic", "channel", "prosocial", "risk", "appearance_comparison", "creator_trait"}

def validate_and_clean(df: pd.DataFrame) -> pd.DataFrame:
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(
            f"Dataset is missing required columns: {sorted(missing)}")

    out = df.copy()

    out["prosocial"] = pd.to_numeric(out["prosocial"], errors="coerce").fillna(0).clip(0, 1)
    out["risk"] = pd.to_numeric(out["risk"], errors="coerce").fillna(0).clip(0, 1)
    out["appearance_comparison"] = pd.to_numeric(out["appearance_comparison"], errors="coerce").fillna(0).clip(0, 1)

    return out


def add_engagement(df: pd.DataFrame) -> Tuple[pd.DataFrame, float]:
    out = df.copy()
    max_views = out["view_count"].max()
    if not max_views or max_views == 0:
        max_views = 1
    out["engagement"] = out["view_count"] / max_views
    return out, float(max_views)


# -----------------------------
# Scoring helpers
# -----------------------------

def calculate_gini(distribution: List[int]) -> float:
    """Calculates the Gini coefficient of a frequency distribution."""
    if not distribution or sum(distribution) == 0:
        return 0.0
    arr = np.sort(np.array(distribution, dtype=float))
    n = len(arr)
    index = np.arange(1, n + 1)
    return (np.sum((2 * index - n - 1) * arr)) / (n * np.sum(arr))

def score_parts(e: float, d: float, p: float, r: float, w: Dict[str, float],
                passive_streak: int = 0, similarity: float = 0.0,
                appearance_comp: float = 0.0) -> float:
    """
    Total score with new algorithm implementation.
    Decay engagement based on passive_streak.
    Adjust risk based on similarity mindset.
    """
    # 1. Decay Function
    decay_rate = 0.8
    e_weight = w["e"] * (decay_rate ** passive_streak)
    
    # 3. Similarity Mindset
    # If appearance comparison > 0.5, apply modifier
    r_effective = r
    if appearance_comp > 0.5:
        # If similar (1), risk is mitigated.
        # If not similar (-1), risk is doubled.
        r_effective = r * (1 - similarity)
        # ensure it doesn't go negative, though standard math keeps it >= 0 if similarity is 1.
        r_effective = max(0.0, r_effective)

    return (e * e_weight) + (d * w["d"]) + (p * w["p"]) - (r_effective * w["r"])


def would_break_streak(recent_list: List[str], candidate_value: str, max_streak: int = 2) -> bool:
    if len(recent_list) < max_streak:
        return False
    tail = recent_list[-max_streak:]
    return all(x == candidate_value for x in tail)


# -----------------------------
# Algorithms
# -----------------------------

def rank_baseline(df: pd.DataFrame, k: int = 100) -> pd.DataFrame:
    return df.sort_values("engagement", ascending=False).head(k)


def build_prototype_feed(
    df: pd.DataFrame,
    weights: Dict[str, float],
    user_profile: dict,
    k: int = 100,
    recent_window: int = 10,
    max_streak: int = 2,
) -> pd.DataFrame:
    """
    Prototype algorithm using Gini coefficient for diversity
    and user profile attributes for similarity and engagement decay.
    """
    remaining = df.copy().reset_index(drop=True)
    feed_rows: List[dict] = []

    recent_topics: List[str] = []
    recent_channels: List[str] = []
    
    # Pre-extract all possible topics for Gini distribution tracking
    all_topics = sorted(list(remaining["topic"].unique()))
    
    passive_streak = user_profile.get("passive_streak", 0)
    user_trait = user_profile.get("user_trait", "")

    for _ in range(k):
        if remaining.empty:
            break

        window_topics = recent_topics[-recent_window:]
        window_channels = recent_channels[-recent_window:]

        # Calculate base Gini across recent topics
        topic_counts = {t: 0 for t in all_topics}
        for t in window_topics:
            topic_counts[t] += 1
        base_gini = calculate_gini(list(topic_counts.values()))

        diversity_list: List[float] = []
        score_list: List[float] = []

        for row in remaining.itertuples(index=False):
            topic = getattr(row, "topic")
            channel = getattr(row, "channel")

            if (
                would_break_streak(recent_topics, topic, max_streak=max_streak)
                or would_break_streak(recent_channels, channel, max_streak=max_streak)
            ):
                diversity_list.append(0.0)
                score_list.append(float("-inf"))
                continue

            # 2. Gini Coefficient Diversity Score
            # Simulate adding this topic
            hypothetical_counts = dict(topic_counts)
            hypothetical_counts[topic] += 1
            new_gini = calculate_gini(list(hypothetical_counts.values()))
            
            # Improvement in equality (lower Gini = better)
            # We scale it with a multiplier so it has a reasonable magnitude like engagement
            serendipity_multiplier = 2.0 
            d = (base_gini - new_gini) * serendipity_multiplier
            # ensure diversity score is somewhat positive or bounded
            d = max(0.0, d + 0.1) 

            # Similarity Evaluation
            creator_trait = getattr(row, "creator_trait")
            similarity = 1.0 if creator_trait == user_trait else -1.0
            
            s = score_parts(
                e=getattr(row, "engagement"),
                d=d,
                p=getattr(row, "prosocial"),
                r=getattr(row, "risk"),
                w=weights,
                passive_streak=passive_streak,
                similarity=similarity,
                appearance_comp=getattr(row, "appearance_comparison")
            )
            diversity_list.append(d)
            score_list.append(s)

        remaining = remaining.copy()
        remaining["diversity"] = diversity_list
        remaining["score"] = score_list

        if remaining["score"].max() == float("-inf"):
            # Relax the streak rule for one pick
            diversity_list = []
            score_list = []
            for row in remaining.itertuples(index=False):
                topic = getattr(row, "topic")
                
                hypothetical_counts = dict(topic_counts)
                hypothetical_counts[topic] += 1
                new_gini = calculate_gini(list(hypothetical_counts.values()))
                d = max(0.0, (base_gini - new_gini) * 2.0 + 0.1)

                similarity = 1.0 if getattr(row, "creator_trait") == user_trait else -1.0
                
                s = score_parts(
                    e=getattr(row, "engagement"),
                    d=d,
                    p=getattr(row, "prosocial"),
                    r=getattr(row, "risk"),
                    w=weights,
                    passive_streak=passive_streak,
                    similarity=similarity,
                    appearance_comp=getattr(row, "appearance_comparison")
                )
                diversity_list.append(d)
                score_list.append(s)

            remaining["diversity"] = diversity_list
            remaining["score"] = score_list

        best_idx = remaining["score"].idxmax()
        best_row = remaining.loc[best_idx]

        feed_rows.append(best_row.to_dict())
        recent_topics.append(best_row["topic"])
        recent_channels.append(best_row["channel"])

        remaining = remaining.drop(index=best_idx).reset_index(drop=True)

    return pd.DataFrame(feed_rows)
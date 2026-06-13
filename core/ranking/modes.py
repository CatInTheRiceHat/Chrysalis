"""
Mode-specific ranking (v1).

Each reels mode is a plain config profile (mirroring the style of `WEIGHTS` in
core/algorithm.py) describing how to weigh the LabelSet, which risks are hard-capped,
and how strict the confidence/quality gate is. Ranking is label-based:

    mode_fit = Σ pos_weights·positive  −  Σ risk_weights·risk      (normalized to 0–1)

Gating drops anything below the mode's confidence floor, above any risk cap, or below
any required positive minimum. Flutter Feed additionally re-spreads topics for variety.

NOTE (v1 scope): this ranks over the real `videos` metadata table using labels only.
Reusing the richer engagement/Gini engine in core.algorithm.build_prototype_feed is a
later milestone (that engine expects CSV columns the videos table doesn't carry).
"""

from __future__ import annotations

from .. import algorithm as _alg  # reuse calculate_gini for the diversity proxy
from ..labeling.schema import LabelSet

MODES = ("daily-dew", "metamorphosis", "flutter-feed")


def is_valid_mode(mode: str) -> bool:
    return mode in MODE_PROFILES


# Each profile:
#   pos:  weights over positive dims
#   risk: weights over risk dims (subtracted)
#   caps: hard upper bounds — exceed any → gated out
#   min_pos: hard lower bounds on positive dims → below any → gated out
#   min_confidence: confidence floor
MODE_PROFILES: dict[str, dict] = {
    # Calm, grounding, low-risk. Strict on comparison / overstimulation / overall risk.
    "daily-dew": {
        "pos": {
            "calm": 0.30, "prosocial": 0.22, "self_love": 0.20,
            "reflection_value": 0.18, "educational": 0.07, "diversity": 0.03,
        },
        "risk": {
            "comparison_risk": 0.9, "overstimulation": 0.8, "overall_risk": 0.8,
            "appearance_focus": 0.8, "ragebait": 0.7, "shame_or_humiliation_risk": 0.7,
            "consumerism": 0.4, "age_safety_risk": 0.6, "misinformation_risk": 0.4,
        },
        "caps": {
            "comparison_risk": 0.3, "appearance_focus": 0.3, "ragebait": 0.3,
            "overstimulation": 0.3, "shame_or_humiliation_risk": 0.3, "overall_risk": 0.4,
        },
        "min_pos": {},
        "min_confidence": 0.25,
    },
    # Strictest. Only very-calm, very-low-risk real videos pass; novelty is penalized.
    # The frontend keeps synthetic pause cards primary; the backend supplies only a few.
    "metamorphosis": {
        "pos": {
            "calm": 0.50, "reflection_value": 0.20, "self_love": 0.15,
            "prosocial": 0.15, "educational": 0.05,
        },
        "risk": {
            "overstimulation": 1.0, "overall_risk": 1.0, "ragebait": 0.9,
            "comparison_risk": 0.9, "appearance_focus": 0.9, "shame_or_humiliation_risk": 0.9,
            "consumerism": 0.7, "age_safety_risk": 0.9, "misinformation_risk": 0.7,
            "novelty": 0.5,  # downrank addictive novelty/intensity
        },
        "caps": {
            "overall_risk": 0.2, "overstimulation": 0.2, "comparison_risk": 0.2,
            "appearance_focus": 0.2, "ragebait": 0.2, "shame_or_humiliation_risk": 0.2,
        },
        "min_pos": {"calm": 0.5},
        "min_confidence": 0.3,
    },
    # More variety/novelty allowed, but still downranks shame/comparison/ragebait/
    # appearance/overall risk. Closest to a normal feed.
    "flutter-feed": {
        "pos": {
            "prosocial": 0.18, "novelty": 0.18, "educational": 0.15, "calm": 0.15,
            "self_love": 0.12, "reflection_value": 0.12, "diversity": 0.10,
        },
        "risk": {
            "comparison_risk": 0.7, "ragebait": 0.7, "shame_or_humiliation_risk": 0.7,
            "appearance_focus": 0.6, "overall_risk": 0.6, "age_safety_risk": 0.6,
            "misinformation_risk": 0.5, "overstimulation": 0.5, "consumerism": 0.4,
        },
        "caps": {
            "overall_risk": 0.7, "comparison_risk": 0.6, "ragebait": 0.6,
            "appearance_focus": 0.6, "shame_or_humiliation_risk": 0.6, "overstimulation": 0.7,
        },
        "min_pos": {},
        "min_confidence": 0.15,
    },
}


def score_for_mode(labels: LabelSet, mode: str) -> float:
    """0–1 fit of a labeled video for a mode. Higher = better fit."""
    profile = MODE_PROFILES[mode]
    pos_w = profile["pos"]
    risk_w = profile["risk"]

    value = sum(w * getattr(labels, d, 0.0) for d, w in pos_w.items())
    risk = sum(w * getattr(labels, d, 0.0) for d, w in risk_w.items())

    norm = sum(pos_w.values()) or 1.0
    return _alg_clamp((value - risk) / norm)


def passes_gate(labels: LabelSet, mode: str) -> bool:
    """Hard filter: confidence floor, risk caps, and required positive minimums."""
    profile = MODE_PROFILES[mode]
    if labels.confidence < profile["min_confidence"]:
        return False
    for dim, cap in profile["caps"].items():
        if getattr(labels, dim, 0.0) > cap:
            return False
    for dim, floor in profile["min_pos"].items():
        if getattr(labels, dim, 0.0) < floor:
            return False
    return True


def rank_videos(items: list[dict], mode: str, k: int = 12) -> list[dict]:
    """
    Gate → score → sort → (Flutter Feed) topic-spread. Each input item must carry a
    `labels` LabelSet; the returned items are annotated with `mode_fit` and ordered.
    Inputs are not mutated.
    """
    scored: list[dict] = []
    for item in items:
        labels = item.get("labels")
        if not isinstance(labels, LabelSet):
            labels = LabelSet.from_dict(labels or {})
        if not passes_gate(labels, mode):
            continue
        annotated = dict(item)
        annotated["labels"] = labels
        annotated["mode_fit"] = score_for_mode(labels, mode)
        scored.append(annotated)

    scored.sort(key=lambda it: it["mode_fit"], reverse=True)

    if mode == "flutter-feed":
        scored = _spread_topics(scored)

    return scored[:k]


def _spread_topics(items: list[dict]) -> list[dict]:
    """
    Light diversity rerank: round-robin across topics (highest mode_fit first within
    each topic) so the top of the feed doesn't cluster on one topic. Preserves overall
    quality ordering within a topic.
    """
    if len(items) <= 2:
        return items

    buckets: dict[str, list[dict]] = {}
    order: list[str] = []
    for it in items:  # items already sorted by mode_fit desc
        topic = str(it.get("topic") or it.get("category") or "_")
        if topic not in buckets:
            buckets[topic] = []
            order.append(topic)
        buckets[topic].append(it)

    result: list[dict] = []
    while any(buckets[t] for t in order):
        for t in order:
            if buckets[t]:
                result.append(buckets[t].pop(0))
    return result


def _alg_clamp(v: float) -> float:
    if v < 0.0:
        return 0.0
    if v > 1.0:
        return 1.0
    return float(v)


# Touch the import so linters don't flag it; the diversity proxy below uses it.
def topic_gini(topics: list[str]) -> float:
    """Diversity proxy over a list of topics (0 = uniform spread … 1 = all one topic)."""
    if not topics:
        return 0.0
    counts: dict[str, int] = {}
    for t in topics:
        counts[t] = counts.get(t, 0) + 1
    return float(_alg.calculate_gini(list(counts.values())))

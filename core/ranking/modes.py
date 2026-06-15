"""
Shared feed ranking (v2).

All reels modes draw from the same safe, broad video pool. Mode-specific behavior
lives in the reflection/explanation layer, not in separate content pools. Ranking
therefore applies one shared safety gate, one shared relevance score, then balances
source metadata so no single ingestion query or category dominates the feed.
"""

from __future__ import annotations

from datetime import date
import hashlib
import os

from .. import algorithm as _alg  # reuse calculate_gini for the diversity proxy
from ..feed_integrity import DEFAULT_INTEGRITY_SCORE, INTEGRITY_MIN_SCORE
from ..labeling.schema import LabelSet
from ..public_signals.ranking import PublicSignalContext, evaluate_public_signal

MODES = ("daily-dew", "metamorphosis", "flutter-feed")


def is_valid_mode(mode: str) -> bool:
    return mode in MODE_PROFILES


SHARED_FEED_CAPS = {
    "overall_risk": 0.65,
    "comparison_risk": 0.65,
    "appearance_focus": 0.65,
    "shame_or_humiliation_risk": 0.45,
    "ragebait": 0.45,
    "age_safety_risk": 0.65,
    "misinformation_risk": 0.65,
    "overstimulation": 0.85,
}
SHARED_MIN_CONFIDENCE = 0.12


# Each profile:
#   pos:  weights over positive dims
#   risk: weights over risk dims (subtracted)
#   caps: hard upper bounds — exceed any → gated out
#   min_pos: hard lower bounds on positive dims → below any → gated out
#   min_any_pos: at least one named positive dim must meet a floor
#   min_confidence: confidence floor
#
# clip-fit hook (future): Daily Dew / Metamorphosis are short, clip-style feeds, so
# long-form videos (duration_seconds ≥ ~20 min, see _LONG_DURATION_S in
# core/labeling/metadata_scoring.py) are a weaker fit. A later pass can fold a soft
# clip-fit factor into score_for_mode (e.g. a small mode_fit multiplier for
# non-clip-like durations) — kept out of v1 so duration stays a scoring-only signal
# and never hard-gates a video purely for being long.
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
        "min_any_pos": {
            "dims": ("calm", "prosocial", "self_love", "reflection_value", "educational"),
            "floor": 0.3,
        },
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
        "min_any_pos": {},
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
        "min_any_pos": {},
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


def score_for_shared_feed(labels: LabelSet, ingest_score: float | None = None) -> float:
    """Shared 0-1 relevance score used for every reels mode's video source."""
    value = (
        0.18 * labels.prosocial
        + 0.17 * labels.educational
        + 0.16 * labels.novelty
        + 0.14 * labels.calm
        + 0.12 * labels.reflection_value
        + 0.10 * labels.self_love
        + 0.08 * labels.diversity
    )
    risk = (
        0.32 * labels.overall_risk
        + 0.18 * labels.ragebait
        + 0.16 * labels.shame_or_humiliation_risk
        + 0.12 * labels.comparison_risk
        + 0.10 * labels.appearance_focus
        + 0.08 * labels.misinformation_risk
        + 0.06 * labels.age_safety_risk
        + 0.04 * labels.overstimulation
    )
    label_score = _alg_clamp(value - risk + 0.35)
    if ingest_score is None:
        return label_score
    return _alg_clamp((0.62 * label_score) + (0.38 * ingest_score))


def passes_shared_feed_gate(labels: LabelSet) -> bool:
    """Shared safe/relevant filter used by all modes before balancing."""
    if labels.confidence < SHARED_MIN_CONFIDENCE:
        return False
    for dim, cap in SHARED_FEED_CAPS.items():
        if getattr(labels, dim, 0.0) > cap:
            return False
    return True


def passes_gate(labels: LabelSet, mode: str) -> bool:
    """Compatibility wrapper: all modes now use the same video-source gate."""
    if not is_valid_mode(mode):
        return False
    return passes_shared_feed_gate(labels)


def rank_videos(
    items: list[dict],
    mode: str,
    k: int = 12,
    public_signal_context: PublicSignalContext | None = None,
    public_signal_override: bool = False,
) -> list[dict]:
    """
    Shared gate → shared score → source balancing. Each input item must carry a
    `labels` LabelSet; returned items are annotated with `mode_fit` for API
    compatibility. Public-signal context can downrank, request review, or exclude
    only when the context policy requires it.
    """
    if not is_valid_mode(mode):
        return []

    scored: list[dict] = []
    for item in items:
        labels = item.get("labels")
        if not isinstance(labels, LabelSet):
            labels = LabelSet.from_dict(labels or {})
        if not passes_shared_feed_gate(labels):
            continue
        integrity_score = _safe_score(item.get("integrity_score"))
        if integrity_score is None:
            integrity_score = DEFAULT_INTEGRITY_SCORE
        if integrity_score < INTEGRITY_MIN_SCORE:
            continue

        public_eval = evaluate_public_signal(
            item,
            labels,
            context=public_signal_context,
            public_signal_override=public_signal_override,
        )
        if not public_eval.allowed:
            continue

        annotated = dict(item)
        annotated["labels"] = labels
        annotated["integrity_score"] = round(integrity_score, 4)
        annotated["mode_fit"] = _alg_clamp(
            (0.90 * score_for_shared_feed(labels, _safe_score(item.get("ingest_score"))))
            + (0.10 * integrity_score)
            + public_eval.score_delta
        )
        annotated.update(public_eval.to_item_fields())
        scored.append(annotated)

    return _balance_source_metadata(scored)[:k]


def _balance_source_metadata(items: list[dict]) -> list[dict]:
    """
    Round-robin source categories, with query/style/scale spread inside each
    category. Production style and creator scale are diversity metadata, not
    polish gates.
    """
    if len(items) <= 2:
        return sorted(items, key=_feed_sort_key)

    category_buckets: dict[str, list[dict]] = {}
    for item in sorted(items, key=_feed_sort_key):
        category = _source_value(item, "source_category", "topic", "category")
        category_buckets.setdefault(category, []).append(item)

    for category, bucket in category_buckets.items():
        category_buckets[category] = _spread_source_queries(bucket)

    category_order = sorted(
        category_buckets,
        key=lambda category: (
            -max(_item_score(item) for item in category_buckets[category]),
            _stable_random_value("category", category),
        ),
    )

    result: list[dict] = []
    while any(category_buckets[category] for category in category_order):
        for category in category_order:
            if category_buckets[category]:
                result.append(category_buckets[category].pop(0))
    return result


def _spread_source_queries(items: list[dict]) -> list[dict]:
    if len(items) <= 2:
        return _spread_style_and_scale(items)

    query_buckets: dict[str, list[dict]] = {}
    for item in sorted(items, key=_feed_sort_key):
        query = _source_value(item, "source_query")
        query_buckets.setdefault(query, []).append(item)

    for query, bucket in query_buckets.items():
        query_buckets[query] = _spread_style_and_scale(bucket)

    query_order = sorted(
        query_buckets,
        key=lambda query: (
            -max(_item_score(item) for item in query_buckets[query]),
            _stable_random_value("query", query),
        ),
    )

    result: list[dict] = []
    while any(query_buckets[query] for query in query_order):
        for query in query_order:
            if query_buckets[query]:
                result.append(query_buckets[query].pop(0))
    return result


def _spread_style_and_scale(items: list[dict]) -> list[dict]:
    balanced = _spread_metadata_field(items, "production_style", salt="production_style")
    return _spread_metadata_field(balanced, "creator_scale", salt="creator_scale")


def _spread_metadata_field(items: list[dict], field: str, *, salt: str) -> list[dict]:
    if len(items) <= 2:
        return sorted(items, key=_feed_sort_key)

    buckets: dict[str, list[dict]] = {}
    for item in sorted(items, key=_feed_sort_key):
        value = _source_value(item, field)
        buckets.setdefault(value, []).append(item)

    order = sorted(
        buckets,
        key=lambda value: (
            -max(_item_score(item) for item in buckets[value]),
            _stable_random_value(salt, value),
        ),
    )

    result: list[dict] = []
    while any(buckets[value] for value in order):
        for value in order:
            if buckets[value]:
                result.append(buckets[value].pop(0))
    return result


def _feed_sort_key(item: dict) -> tuple[float, float]:
    return (-round(_item_score(item), 2), _stable_random_value("item", _item_identity(item)))


def _item_score(item: dict) -> float:
    return float(item.get("mode_fit") or item.get("ingest_score") or 0.0)


def _source_value(item: dict, *fields: str) -> str:
    for field in fields:
        value = str(item.get(field) or "").strip().lower()
        if value:
            return value
    return "_"


def _item_identity(item: dict) -> str:
    return str(item.get("video_id") or item.get("youtube_id") or item.get("id") or "")


def _safe_score(value) -> float | None:
    try:
        if value is None:
            return None
        return _alg_clamp(float(value))
    except (TypeError, ValueError):
        return None


def _feed_random_seed() -> str:
    return os.environ.get("CHRYSALIS_FEED_RANDOM_SEED") or date.today().isoformat()


def _stable_random_value(*parts: str) -> float:
    raw = "|".join((_feed_random_seed(), *parts))
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12]
    return int(digest, 16) / float(0xFFFFFFFFFFFF)


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

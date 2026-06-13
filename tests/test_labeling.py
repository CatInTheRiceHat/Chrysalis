"""
Tests for the Chrysalis v1 video labeling + mode ranking system.

Verifies the core product guarantees with small hand-built metadata samples:
  - calm/grounding content scores well and survives Daily Dew
  - ragebait/shame content scores high-risk and is gated out everywhere
  - Metamorphosis blocks high-stimulation content but admits very-calm content
  - Flutter Feed keeps topic variety while filtering high-risk items
  - explanations only surface a concern when a real risk is present
"""

import pytest

from core.labeling.metadata_scoring import score_metadata
from core.labeling.explain import build_reasons
from core.ranking.modes import passes_gate, score_for_mode, rank_videos
from core.ranking.feed import build_feed


# ── Sample metadata ─────────────────────────────────────────────────────────
CALM = {
    "video_id": "calm1",
    "title": "Calm rain sounds for a gentle mental reset",
    "description": "Slow breathing, gratitude journaling, and soothing nature ambience.",
    "channel_title": "Quiet Forest",
    "topic": "music",
}
GRATITUDE = {
    "video_id": "calm2",
    "title": "One kind thought before you scroll — a gratitude reflection",
    "description": "A gentle reminder about self compassion and kindness.",
    "channel_title": "Soft Light",
    "topic": "education",
}
RAGEBAIT = {
    "video_id": "rage1",
    "title": "She got EXPOSED and DESTROYED!! you won't believe the drama",
    "description": "Cringe glow up, rating people, body check — pure drama.",
    "channel_title": "DramaDaily",
    "topic": "entertainment",
}
HYPER = {
    "video_id": "hyper1",
    "title": "INSANE extreme challenge gone wrong!!! shocking chaos",
    "description": "Non-stop wild rapid fire stunts, loudest craziest moments.",
    "channel_title": "MaxHype",
    "topic": "gaming",
}
LEARN = {
    "video_id": "learn1",
    "title": "How to study effectively — a calm explained guide",
    "description": "Learn a gentle study routine with reflection and breaks.",
    "channel_title": "StudyWithMe",
    "topic": "education",
}


# ── Scoring ──────────────────────────────────────────────────────────────────
def test_calm_scores_high_calm_low_risk():
    labels = score_metadata(CALM)
    assert labels.calm >= 0.6
    assert labels.overall_risk < 0.3
    assert labels.confidence > 0.3


def test_ragebait_scores_high_risk():
    labels = score_metadata(RAGEBAIT)
    assert labels.ragebait >= 0.3
    assert labels.shame_or_humiliation_risk >= 0.3
    assert labels.comparison_risk >= 0.2 or labels.appearance_focus >= 0.3
    assert labels.overall_risk >= 0.5


def test_negation_aware_scoring():
    meta = {"title": "Overcoming body image struggles with self compassion",
            "description": "healing and self love", "topic": "education"}
    labels = score_metadata(meta)
    # "body" appears but is negated by "overcoming"; self_love should dominate.
    assert labels.self_love >= 0.3
    assert labels.appearance_focus < 0.34


# ── Mode ranking ─────────────────────────────────────────────────────────────
def test_daily_dew_prefers_calm_over_ragebait():
    calm = score_metadata(CALM)
    rage = score_metadata(RAGEBAIT)
    assert passes_gate(calm, "daily-dew")
    assert not passes_gate(rage, "daily-dew")
    assert score_for_mode(calm, "daily-dew") > score_for_mode(rage, "daily-dew")


def test_ragebait_gated_out_of_every_mode():
    rage = score_metadata(RAGEBAIT)
    for mode in ("daily-dew", "metamorphosis", "flutter-feed"):
        assert not passes_gate(rage, mode), f"ragebait should fail {mode}"


def test_metamorphosis_blocks_high_stimulation_admits_calm():
    calm = score_metadata(CALM)
    hyper = score_metadata(HYPER)
    assert passes_gate(calm, "metamorphosis")
    assert not passes_gate(hyper, "metamorphosis")


def test_flutter_feed_keeps_variety_filters_risk():
    items = [
        {"labels": score_metadata(CALM), "topic": "music"},
        {"labels": score_metadata(LEARN), "topic": "education"},
        {"labels": score_metadata(GRATITUDE), "topic": "education"},
        {"labels": score_metadata(RAGEBAIT), "topic": "entertainment"},
        {"labels": score_metadata(HYPER), "topic": "gaming"},
    ]
    ranked = rank_videos(items, "flutter-feed", k=12)
    topics = [it["topic"] for it in ranked]
    # high-risk items dropped
    assert "entertainment" not in topics  # ragebait gone
    # variety preserved across the survivors
    assert len(set(topics)) >= 2


# ── Explanations ─────────────────────────────────────────────────────────────
def test_concern_reason_only_when_risk_present():
    calm = score_metadata(CALM)
    rage = score_metadata(RAGEBAIT)
    assert build_reasons(calm, "daily-dew")["concern_reason"] is None
    assert build_reasons(rage, "flutter-feed")["concern_reason"] is not None
    # ranking_reason always present
    assert build_reasons(calm, "daily-dew")["ranking_reason"]


# ── Feed builder (end-to-end shape) ──────────────────────────────────────────
def test_build_feed_shape_and_gating():
    rows = [CALM, GRATITUDE, RAGEBAIT, HYPER, LEARN]
    feed = build_feed(rows, "daily-dew", k=12)
    ids = {it["youtube_id"] for it in feed}
    assert "rage1" not in ids and "hyper1" not in ids
    assert "calm1" in ids
    item = feed[0]
    for key in ("youtube_id", "title", "thumbnail", "chrysalis_scores",
                "ranking_reason", "safety_reason", "concern_reason", "mode_fit",
                "public_signal", "source_safety_status", "public_signal_effect",
                "public_signal_reason"):
        assert key in item


def test_build_feed_unknown_mode_is_empty():
    assert build_feed([CALM], "nope", k=12) == []


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

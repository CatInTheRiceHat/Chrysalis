"""
Shared, pure feed builder (v1).

`build_feed` takes raw video rows (plain dicts, as read from either SQLite or
Postgres), applies the shared safe-feed ranking, and returns mode-specific
explanations over the same broad video pool. No DB or network here, so both API
files (api.py / api/index.py) and the unit tests call the exact same logic.
"""

from __future__ import annotations

import json

from ..labeling.schema import LabelSet, SCORING_VERSION
from ..labeling.metadata_scoring import (
    score_metadata,
    parse_duration_seconds,
    _normalize_tags,
)
from ..labeling.explain import build_reasons
from ..public_signals.ranking import PublicSignalContext
from .modes import rank_videos, is_valid_mode

_THUMB = "https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
_EMBED = "https://www.youtube-nocookie.com/embed/{vid}"
_WATCH = "https://www.youtube.com/watch?v={vid}"

# Cap tags surfaced to the client — enough to be useful, not a debug dump.
_MAX_API_TAGS = 15


def _labels_for_row(row: dict) -> LabelSet:
    """Reuse stored v1 scores when present and current; otherwise score on the fly."""
    stored = row.get("chrysalis_scores")
    version = row.get("scoring_version")
    if stored and version == SCORING_VERSION:
        if isinstance(stored, str):
            try:
                stored = json.loads(stored)
            except (ValueError, TypeError):
                stored = None
        if isinstance(stored, dict):
            return LabelSet.from_dict(stored)
    return score_metadata(row)


def label_row(row: dict) -> LabelSet:
    """Public helper (used by the backfill script): label one raw video row."""
    return _labels_for_row(row)


def build_feed(
    rows: list[dict],
    mode: str,
    k: int = 12,
    public_signal_context: PublicSignalContext | None = None,
    public_signal_override: bool = False,
) -> list[dict]:
    """
    Returns a list of API-ready items for `mode`:
      { youtube_id, title, source, description, thumbnail, embed_url, watch_url,
        duration_seconds, tags, channel_id, category_id, source_category,
        source_query,
        chrysalis_scores, ranking_reason, safety_reason, concern_reason, mode_fit,
        public_signal, source_safety_status, public_signal_effect,
        public_signal_reason }
    Empty input (or an unknown mode) yields an empty list. New metadata fields are
    null/empty for older rows that predate richer extraction.
    """
    if not is_valid_mode(mode) or not rows:
        return []

    candidates: list[dict] = []
    for row in rows:
        labels = _labels_for_row(row)
        candidates.append({
            "_row": row,
            "labels": labels,
            "topic": row.get("source_category") or row.get("topic") or row.get("category"),
            "source_category": row.get("source_category") or row.get("topic") or row.get("category"),
            "source_query": row.get("source_query") or "",
            "ingest_score": row.get("ingest_score"),
            "video_id": row.get("video_id") or row.get("youtube_id") or "",
            "channel_id": row.get("channel_id") or "",
            "channel_title": row.get("channel_title") or row.get("channel") or "",
        })

    ranked = rank_videos(
        candidates,
        mode,
        k=k,
        public_signal_context=public_signal_context,
        public_signal_override=public_signal_override,
    )

    items: list[dict] = []
    for cand in ranked:
        row = cand["_row"]
        labels = cand["labels"]
        # Reasons are mode-specific, so always compute for the requested mode.
        reasons = build_reasons(labels, mode)
        vid = row.get("video_id") or row.get("youtube_id") or ""
        tags = _normalize_tags(row.get("tags"))[:_MAX_API_TAGS]
        items.append({
            "youtube_id": vid,
            "title": row.get("title") or "",
            "source": row.get("channel_title") or row.get("channel") or "Chrysalis",
            "description": row.get("description") or "",
            "thumbnail": (
                row.get("thumbnail_url") or row.get("thumbnail")
                or (_THUMB.format(vid=vid) if vid else None)
            ),
            "embed_url": row.get("embed_url") or (_EMBED.format(vid=vid) if vid else None),
            "watch_url": row.get("watch_url") or (_WATCH.format(vid=vid) if vid else None),
            "duration_seconds": parse_duration_seconds(
                row.get("duration_seconds") if row.get("duration_seconds") is not None
                else row.get("duration")
            ),
            "tags": tags,
            "channel_id": row.get("channel_id") or "",
            "category_id": row.get("category_id") or row.get("category") or None,
            "source_category": row.get("source_category") or row.get("topic") or row.get("category") or None,
            "source_query": row.get("source_query") or None,
            "chrysalis_scores": labels.to_dict(),
            "ranking_reason": reasons["ranking_reason"],
            "safety_reason": reasons["safety_reason"],
            "concern_reason": reasons["concern_reason"],
            "mode_fit": round(cand["mode_fit"], 4),
            "public_signal": cand.get("public_signal"),
            "source_safety_status": cand.get("source_safety_status", "neutral"),
            "public_signal_effect": cand.get("public_signal_effect", "none"),
            "public_signal_reason": cand.get("public_signal_reason"),
        })
    return items

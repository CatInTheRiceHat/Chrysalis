"""Deterministic short-caption cleanup for feed videos."""

from __future__ import annotations

import re

DEFAULT_MIN_CAPTION_CHARS = 90
DEFAULT_MAX_CAPTION_CHARS = 140

_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
_WHITESPACE_RE = re.compile(r"\s+")
_HASHTAG_RE = re.compile(r"#[\w-]+")
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
_PROMO_RE = re.compile(
    r"\b("
    r"subscribe|like and comment|like,?\s*comment|follow me|check out my channel|"
    r"links? below|link in bio|turn on notifications|hit the bell|smash (that )?like|"
    r"comment below|follow for more"
    r")\b",
    re.IGNORECASE,
)


def build_short_description(
    description: str | None,
    *,
    min_chars: int = DEFAULT_MIN_CAPTION_CHARS,
    max_chars: int = DEFAULT_MAX_CAPTION_CHARS,
) -> str:
    """Create a compact social-feed caption from a raw YouTube description."""
    cleaned = _clean_description_text(description)
    if not cleaned:
        return ""

    parts = [part for part in _SENTENCE_SPLIT_RE.split(cleaned) if part.strip()]
    if not parts:
        parts = [cleaned]

    caption = ""
    truncated = False
    for part in parts:
        candidate = " ".join([caption, part]).strip() if caption else part.strip()
        if len(candidate) > max_chars:
            if not caption:
                caption = candidate
                truncated = True
            break
        caption = candidate
        if len(caption) >= min_chars:
            break

    if not caption:
        caption = cleaned

    if len(caption) > max_chars:
        caption = _truncate_at_word(caption, max_chars)
        truncated = True

    return _finish_caption(caption, truncated)


def _clean_description_text(description: str | None) -> str:
    text = str(description or "").strip()
    if not text:
        return ""

    text = _URL_RE.sub(" ", text)
    kept_lines: list[str] = []
    for raw_line in text.splitlines():
        line = raw_line.strip(" \t-_*|")
        if not line:
            continue
        if _is_hashtag_block(line):
            continue
        for part in _SENTENCE_SPLIT_RE.split(line):
            part = part.strip()
            if not part:
                continue
            if _PROMO_RE.search(part):
                continue
            if _is_hashtag_block(part):
                continue
            kept_lines.append(part)

    text = " ".join(kept_lines)
    text = _limit_hashtags(text, keep=2)
    text = _WHITESPACE_RE.sub(" ", text)
    return text.strip()


def _is_hashtag_block(line: str) -> bool:
    words = line.split()
    if len(words) < 3:
        return False
    hashtag_count = sum(1 for word in words if word.startswith("#"))
    return hashtag_count / len(words) >= 0.5


def _limit_hashtags(text: str, *, keep: int) -> str:
    count = 0

    def replace(match: re.Match) -> str:
        nonlocal count
        count += 1
        return match.group(0) if count <= keep else " "

    return _HASHTAG_RE.sub(replace, text)


def _truncate_at_word(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    limit = max(0, max_chars - 3)
    shortened = text[:limit].rstrip()
    if " " in shortened:
        shortened = shortened.rsplit(" ", 1)[0].rstrip()
    return shortened.rstrip(".,;:-")


def _finish_caption(caption: str, truncated: bool) -> str:
    caption = _WHITESPACE_RE.sub(" ", caption).strip()
    if not caption:
        return ""
    if truncated and not caption.endswith("..."):
        return f"{caption}..."
    return caption

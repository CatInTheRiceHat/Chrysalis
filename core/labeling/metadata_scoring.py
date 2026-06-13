"""
Layer 1 — cheap metadata scorer (v1).

Rule-based, deterministic, zero network/LLM. Reads whatever metadata is available
(title, description, tags, channel title, category/topic, duration, thumbnail) and
produces a normalized `LabelSet`.

This is intentionally simple and structured: each dimension is driven by a list of
keyword/phrase patterns in `POSITIVE_PATTERNS` / `RISK_PATTERNS`, so the signal can be
tuned by editing data, not logic. It does not need to be perfect — only structured and
easy to improve. Deeper layers (thumbnail vision, LLM) refine this later.
"""

from __future__ import annotations

import re

from .schema import (
    LabelSet,
    POSITIVE_DIMS,
    RISK_DIMS,
    clamp01,
)

# Phrases that, when they appear shortly BEFORE a matched keyword, flip its meaning
# ("overcoming body image issues" should not read as appearance pressure).
_NEGATION_PREFIXES = (
    "overcoming", "overcome", "recovering from", "recovery from", "healing from",
    "stop", "no more", "quitting", "letting go of", "unlearning", "beyond",
)

# ── Positive signal patterns, keyed by the dimension they raise ──────────────
POSITIVE_PATTERNS: dict[str, list[str]] = {
    "calm": [
        "calm", "calming", "relax", "relaxing", "soothing", "slow", "gentle",
        "breathe", "breathing", "meditat", "mindful", "asmr", "ambient", "lo-fi",
        "lofi", "nature", "rain", "ocean", "forest", "mental reset", "unwind",
        "wind down", "cozy", "peaceful", "stillness",
    ],
    "prosocial": [
        "kindness", "kind", "community", "together", "support", "help", "helping",
        "volunteer", "donate", "charity", "friendship", "friends", "empathy",
        "compassion", "wholesome", "uplifting", "give back", "good news",
    ],
    "educational": [
        "how to", "tutorial", "learn", "learning", "explain", "explained",
        "guide", "study", "study with me", "lesson", "education", "course",
        "science", "history", "documentary", "facts", "deep dive", "breakdown",
    ],
    "self_love": [
        "self love", "self-love", "self care", "self-care", "self compassion",
        "self worth", "you are enough", "affirmation", "confidence without comparison",
        "be yourself", "self acceptance", "worthy", "self esteem", "gentle reminder",
    ],
    "reflection_value": [
        "reflection", "reflect", "journal", "journaling", "gratitude", "grateful",
        "thankful", "perspective", "intention", "values", "meaning", "philosophy",
        "lessons learned", "thoughtful", "growth", "notice", "pause and",
    ],
    "novelty": [
        "you've never", "never seen", "rare", "unusual", "unexpected", "first time",
        "experiment", "what happens if", "weird", "obscure", "hidden gem",
        "creative", "art", "diy", "make", "build", "design",
    ],
}

# ── Risk signal patterns, keyed by the dimension they raise ──────────────────
RISK_PATTERNS: dict[str, list[str]] = {
    "comparison_risk": [
        "rating people", "rate my", "rate me", "hot or not", "ranking people",
        "who is prettier", "out of 10", "vs everyone", "am i pretty", "tier list of people",
        "richest", "compared to", "better than you", "leveling up", "status",
    ],
    "appearance_focus": [
        "glow up", "glow-up", "transformation", "before and after", "before & after",
        "body check", "body checking", "what i eat in a day", "snatched", "abs",
        "weight loss", "lose weight", "diet", "skincare routine", "my body",
        "perfect body", "summer body", "get ready with me to look",
    ],
    "shame_or_humiliation_risk": [
        "exposed", "exposing", "humiliat", "embarrass", "called out", "destroyed",
        "owned", "wrecked", "cringe", "ratio'd", "publicly shamed", "caught in 4k",
        "you won't believe what she did", "clowned",
    ],
    "ragebait": [
        "you won't believe", "gone wrong", "triggered", "rant", "worst", "hate",
        "outrage", "controversial", "drama", "beef", "exposed the truth", "destroyed",
        "owning", "clapback", "this will make you angry", "infuriating",
    ],
    "overstimulation": [
        "insane", "crazy", "extreme", "fastest", "loudest", "epic fail compilation",
        "tiktok compilation", "satisfying", "overload", "hyper", "chaotic", "!!!",
        "shocking", "wild", "non stop", "non-stop", "rapid fire",
    ],
    "consumerism": [
        "haul", "luxury", "designer", "unboxing", "shopping spree", "rich life",
        "expensive", "billionaire", "millionaire lifestyle", "what i bought",
        "must have", "tiktok made me buy", "amazon finds", "flexing", "net worth",
    ],
    "age_safety_risk": [
        "challenge gone", "dangerous", "do not try", "prank", "18+", "graphic",
        "disturbing", "nsfw", "risky", "stunt",
    ],
    "misinformation_risk": [
        "they don't want you to know", "the truth about", "conspiracy", "hoax",
        "secret cure", "doctors hate", "exposed the lie", "fake news", "miracle",
        "what they're hiding", "wake up",
    ],
}

# Risk dimensions that also contribute to overstimulation pressure when present.
_TOKEN_RE = re.compile(r"[a-z0-9']+")


def _count_hits(text: str, patterns: list[str]) -> int:
    """Count negation-aware keyword hits for one pattern list."""
    hits = 0
    for pat in patterns:
        idx = text.find(pat)
        if idx == -1:
            continue
        context = text[max(0, idx - 32): idx]
        if any(neg in context for neg in _NEGATION_PREFIXES):
            continue  # negated — skip
        hits += 1
    return hits


def _score_group(text: str, patterns: list[str], per_hit: float = 0.34) -> float:
    """Density-based 0–1 score: each distinct matching phrase adds `per_hit`."""
    return clamp01(_count_hits(text, patterns) * per_hit)


def _normalize_category(meta: dict) -> str:
    """Best-effort category/topic string for light category nudges."""
    return str(meta.get("category") or meta.get("topic") or "").lower()


def score_metadata(meta: dict) -> LabelSet:
    """
    Score a single video's metadata into a normalized LabelSet.

    `meta` keys used (all optional): title, description, tags (str|list),
    channel_title, category/topic, duration (seconds), thumbnail.
    Missing fields simply contribute no signal and lower confidence.
    """
    title = str(meta.get("title") or "")
    description = str(meta.get("description") or "")

    tags = meta.get("tags") or []
    if isinstance(tags, str):
        tags_text = tags
    else:
        tags_text = " ".join(str(t) for t in tags)

    channel = str(meta.get("channel_title") or meta.get("channel") or "")
    category = _normalize_category(meta)

    # Title carries the strongest signal, so weight it by repeating it.
    blob = " ".join([title, title, description, tags_text, channel, category]).lower()

    labels = LabelSet()

    # Positive dimensions
    for dim in POSITIVE_DIMS:
        if dim == "diversity":
            continue  # diversity is contextual — set at ranking time, not per-video
        patterns = POSITIVE_PATTERNS.get(dim, [])
        setattr(labels, dim, _score_group(blob, patterns))

    # Category nudges (cheap priors)
    if category in ("education",):
        labels.educational = clamp01(labels.educational + 0.35)
    if category in ("music",):
        labels.calm = clamp01(labels.calm + 0.1)

    # Risk dimensions (overall_risk computed after)
    for dim in RISK_DIMS:
        if dim == "overall_risk":
            continue
        patterns = RISK_PATTERNS.get(dim, [])
        setattr(labels, dim, _score_group(blob, patterns))

    # Exclamation-mark / all-caps overstimulation nudge from the title
    bangs = title.count("!")
    if bangs >= 2:
        labels.overstimulation = clamp01(labels.overstimulation + 0.2)
    letters = [c for c in title if c.isalpha()]
    if len(letters) >= 8:
        caps_ratio = sum(c.isupper() for c in letters) / len(letters)
        if caps_ratio > 0.6:
            labels.overstimulation = clamp01(labels.overstimulation + 0.15)
            labels.ragebait = clamp01(labels.ragebait + 0.1)

    # overall_risk: max-biased aggregate so one strong risk dominates, with a
    # contribution from the average so multiple moderate risks add up.
    component_risks = [getattr(labels, d) for d in RISK_DIMS if d != "overall_risk"]
    if component_risks:
        peak = max(component_risks)
        avg = sum(component_risks) / len(component_risks)
        labels.overall_risk = clamp01(0.7 * peak + 0.3 * avg)

    # Confidence: scales with how much usable text we had (short/empty → low).
    text_tokens = len(_TOKEN_RE.findall(f"{title} {description} {tags_text}"))
    text_conf = clamp01(text_tokens / 40.0)          # ~40 tokens → full text confidence
    any_signal = max(
        [getattr(labels, d) for d in POSITIVE_DIMS] +
        [getattr(labels, d) for d in RISK_DIMS]
    )
    # Confident when we either have plenty of text or a clear signal; floor of 0.2
    # whenever there's any text at all so totally-unscored items can be deprioritized.
    base = 0.2 if text_tokens > 0 else 0.0
    labels.confidence = clamp01(max(base, 0.55 * text_conf + 0.6 * any_signal))

    return labels.clamped()

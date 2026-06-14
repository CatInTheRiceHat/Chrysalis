from core.feed_captions import build_short_description


def test_short_description_removes_urls_promos_and_excess_hashtags():
    raw = """
    A quiet city guide with three tiny stops for your next weekend walk.
    Subscribe for more travel ideas!
    Watch the full map here: https://example.com/map
    #travel #city #weekend #guide #vlog
    """

    caption = build_short_description(raw)

    assert "http" not in caption
    assert "Subscribe" not in caption
    assert caption.count("#") <= 2
    assert caption.startswith("A quiet city guide")


def test_short_description_truncates_at_word_boundary_with_ellipsis():
    raw = (
        "This thoughtful explainer follows the strange history of a small online "
        "trend and why it keeps resurfacing across different communities today."
    )

    caption = build_short_description(raw, max_chars=90)

    assert caption.endswith("...")
    assert len(caption) <= 90
    assert not caption.endswith(" communities...")

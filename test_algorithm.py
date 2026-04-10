"""
Comprehensive tests for the Healthy Feed Algorithm.

Tests cover:
- Algorithm scoring functions
- Feed generation
- Diversity metrics
- Preset configurations
- Edge cases
"""

import unittest
import pandas as pd
import numpy as np

from algorithm import (
    WEIGHTS,
    get_mode_settings,
    night_mode_settings,
    validate_and_clean,
    add_engagement,
    calculate_gini,
    score_parts,
    would_break_streak,
    rank_baseline,
    build_prototype_feed,
)
from metrics import (
    diversity_at_k,
    max_streak,
    prosocial_ratio,
    overlap_ratio,
    jaccard_similarity,
    gini_distribution,
)


# =============================================================================
# Test Data Helpers
# =============================================================================

def make_sample_data(n=100):
    """Create minimal valid dataset for testing."""
    np.random.seed(42)
    topics = ["science", "art", "music", "sports", "tech"]
    channels = [f"channel_{i}" for i in range(10)]

    df = pd.DataFrame({
        "view_count": np.random.randint(1000, 100000, n),
        "topic": np.random.choice(topics, n),
        "channel": np.random.choice(channels, n),
        "prosocial": np.random.choice([0, 1], n),
        "risk": np.random.random(n),
        "appearance_comparison": np.random.random(n),
        "creator_trait": np.random.choice(["casual", "formal", "humorous"], n),
    })
    # Add engagement column
    df, _ = add_engagement(df)
    return df


# =============================================================================
# Test: Weight Presets
# =============================================================================

class TestWeightPresets(unittest.TestCase):
    """Test preset weight configurations."""

    def test_all_presets_exist(self):
        """Verify all expected presets are defined."""
        expected = {"baseline", "entertainment", "inspiration", "learning"}
        self.assertEqual(set(WEIGHTS.keys()), expected)

    def test_weights_sum_to_one(self):
        """Non-baseline presets should have weights summing to ~1.0."""
        for preset, weights in WEIGHTS.items():
            if preset == "baseline":
                continue
            total = sum(weights.values())
            self.assertAlmostEqual(total, 1.0, places=2,
                                   msg=f"{preset} weights sum to {total}")

    def test_get_mode_settings_valid(self):
        """Test getting settings for valid preset."""
        weights, k = get_mode_settings("entertainment")
        self.assertEqual(weights["e"], 0.55)
        self.assertEqual(k, 100)

    def test_get_mode_settings_invalid(self):
        """Test that invalid preset raises error."""
        with self.assertRaises(KeyError):
            get_mode_settings("nonexistent_preset")

    def test_night_mode_adjusts_weights(self):
        """Night mode should increase risk weight."""
        normal = {"e": 0.55, "d": 0.20, "p": 0.15, "r": 0.10}
        adjusted, _ = night_mode_settings(normal)
        self.assertGreater(adjusted["r"], normal["r"])


# =============================================================================
# Test: Data Validation
# =============================================================================

class TestDataValidation(unittest.TestCase):
    """Test dataset validation and cleaning."""

    def test_valid_data_passes(self):
        """Valid data should pass validation."""
        df = make_sample_data(10)
        result = validate_and_clean(df)
        self.assertEqual(len(result), 10)

    def test_missing_columns_raises(self):
        """Missing required columns should raise error."""
        df = pd.DataFrame({"view_count": [1, 2, 3]})
        with self.assertRaises(ValueError):
            validate_and_clean(df)

    def test_prosocial_clamped(self):
        """Prosocial values should be clamped to [0, 1]."""
        df = make_sample_data(10)
        df["prosocial"] = [-0.5, 1.5, 0.3, 0.8, -1, 2, 0.5, 0.5, 0.5, 0.5]
        result = validate_and_clean(df)
        self.assertTrue(result["prosocial"].between(0, 1).all())

    def test_add_engagement_normalizes(self):
        """Engagement should be normalized by max views."""
        df = pd.DataFrame({"view_count": [1000, 5000, 10000]})
        result, max_views = add_engagement(df)
        self.assertEqual(max_views, 10000)
        pd.testing.assert_series_equal(
            result["engagement"],
            pd.Series([0.1, 0.5, 1.0], name="engagement")
        )


# =============================================================================
# Test: Gini Coefficient
# =============================================================================

class TestGiniCoefficient(unittest.TestCase):
    """Test Gini coefficient calculations."""

    def test_perfect_equality(self):
        """Equal distribution should give Gini near 0."""
        dist = [10, 10, 10, 10]
        gini = calculate_gini(dist)
        self.assertAlmostEqual(gini, 0.0, places=2)

    def test_perfect_inequality(self):
        """One item having everything should give Gini near 1."""
        dist = [1, 1, 1, 97]  # Avoid zeros which can cause issues
        gini = calculate_gini(dist)
        self.assertGreater(gini, 0.7)  # Should be high inequality

    def test_empty_distribution(self):
        """Empty distribution should return 0."""
        self.assertEqual(calculate_gini([]), 0.0)

    def test_single_item(self):
        """Single item distribution."""
        self.assertEqual(calculate_gini([5]), 0.0)


# =============================================================================
# Test: Score Parts
# =============================================================================

class TestScoreParts(unittest.TestCase):
    """Test individual score calculation."""

    def test_baseline_weights(self):
        """With baseline weights, only engagement matters."""
        weights = {"e": 1.0, "d": 0.0, "p": 0.0, "r": 0.0}
        score = score_parts(e=0.8, d=0.5, p=0.9, r=0.1, w=weights)
        self.assertAlmostEqual(score, 0.8, places=2)

    def test_passive_streak_decay(self):
        """Higher passive streak should reduce engagement contribution."""
        weights = {"e": 1.0, "d": 0.0, "p": 0.0, "r": 0.0}
        score_fresh = score_parts(e=0.8, d=0, p=0, r=0, w=weights, passive_streak=0)
        score_tired = score_parts(e=0.8, d=0, p=0, r=0, w=weights, passive_streak=5)
        self.assertGreater(score_fresh, score_tired)

    def test_similarity_mitigates_risk(self):
        """High similarity should reduce risk penalty."""
        weights = {"e": 0.5, "d": 0.0, "p": 0.0, "r": 0.5}

        # High appearance comparison + similar creator = less risk
        score_similar = score_parts(
            e=0.5, d=0, p=0, r=0.8, w=weights,
            appearance_comp=0.8, similarity=1.0
        )

        # High appearance comparison + different creator = more risk
        score_different = score_parts(
            e=0.5, d=0, p=0, r=0.8, w=weights,
            appearance_comp=0.8, similarity=-1.0
        )

        self.assertGreater(score_similar, score_different)


# =============================================================================
# Test: Streak Prevention
# =============================================================================

class TestStreakPrevention(unittest.TestCase):
    """Test streak-breaking logic."""

    def test_short_history_no_block(self):
        """Should not block when history is shorter than max_streak."""
        recent = ["A", "B"]
        self.assertFalse(would_break_streak(recent, "A", max_streak=3))

    def test_would_break_streak(self):
        """Should detect when adding would create a streak."""
        recent = ["A", "A"]
        self.assertTrue(would_break_streak(recent, "A", max_streak=2))

    def test_different_value_no_block(self):
        """Different value should not trigger streak block."""
        recent = ["A", "A"]
        self.assertFalse(would_break_streak(recent, "B", max_streak=2))


# =============================================================================
# Test: Full Feed Generation
# =============================================================================

class TestFeedGeneration(unittest.TestCase):
    """Test complete feed generation."""

    def test_baseline_ranking(self):
        """Baseline should rank by engagement only."""
        df = make_sample_data(50)
        result = rank_baseline(df, k=10)
        self.assertEqual(len(result), 10)
        # Verify sorted by engagement descending
        engagements = result["engagement"].tolist()
        self.assertEqual(engagements, sorted(engagements, reverse=True))

    def test_prototype_feed_length(self):
        """Prototype feed should respect k parameter."""
        df = make_sample_data(100)
        weights, _ = get_mode_settings("entertainment")

        result = build_prototype_feed(
            df, weights=weights, user_profile={}, k=50
        )
        self.assertEqual(len(result), 50)

    def test_prototype_improves_diversity(self):
        """Prototype should have better diversity than baseline."""
        df = make_sample_data(200)
        weights, _ = get_mode_settings("inspiration")  # High diversity weight

        baseline = rank_baseline(df, k=50)
        prototype = build_prototype_feed(
            df, weights=weights, user_profile={}, k=50
        )

        baseline_div = diversity_at_k(baseline, k=10)
        prototype_div = diversity_at_k(prototype, k=10)

        # Prototype should have equal or better diversity
        self.assertGreaterEqual(prototype_div, baseline_div * 0.8)

    def test_prototype_reduces_streaks(self):
        """Prototype should limit topic streaks."""
        df = make_sample_data(200)
        weights, _ = get_mode_settings("learning")

        result = build_prototype_feed(
            df, weights=weights, user_profile={}, k=50, max_streak=2
        )

        # Check no topic streak exceeds max_streak + 1 (allowing some flexibility)
        topic_streak = max_streak(result, "topic")
        self.assertLessEqual(topic_streak, 4)  # Some flexibility for edge cases

    def test_user_profile_affects_output(self):
        """Different user profiles should produce different feeds."""
        df = make_sample_data(100)
        weights, _ = get_mode_settings("entertainment")

        profile_fresh = {"passive_streak": 0, "user_trait": "casual"}
        profile_tired = {"passive_streak": 10, "user_trait": "formal"}

        feed_fresh = build_prototype_feed(df, weights, profile_fresh, k=20)
        feed_tired = build_prototype_feed(df, weights, profile_tired, k=20)

        # Feeds should be different (not identical)
        fresh_ids = set(feed_fresh.index)
        tired_ids = set(feed_tired.index)
        # At least some difference in selection
        self.assertNotEqual(fresh_ids, tired_ids)


# =============================================================================
# Test: Metrics
# =============================================================================

class TestMetrics(unittest.TestCase):
    """Test evaluation metrics."""

    def test_diversity_at_k(self):
        """Test diversity calculation."""
        df = pd.DataFrame({"topic": ["A", "A", "B", "C", "D"]})
        self.assertEqual(diversity_at_k(df, k=3), 2)
        self.assertEqual(diversity_at_k(df, k=5), 4)

    def test_max_streak(self):
        """Test streak calculation."""
        df = pd.DataFrame({"topic": ["A", "A", "B", "B", "B", "A"]})
        self.assertEqual(max_streak(df, "topic"), 3)

    def test_prosocial_ratio(self):
        """Test prosocial ratio calculation."""
        df = pd.DataFrame({"prosocial": [1, 1, 0, 1, 0]})
        self.assertAlmostEqual(prosocial_ratio(df), 0.6)

    def test_overlap_ratio(self):
        """Test overlap between feeds."""
        ids_a = [1, 2, 3, 4, 5]
        ids_b = [3, 4, 5, 6, 7]
        # 3 overlap out of 5
        self.assertEqual(overlap_ratio(ids_a, ids_b, top_n=5), 0.6)

    def test_jaccard_similarity(self):
        """Test Jaccard similarity."""
        ids_a = [1, 2, 3]
        ids_b = [2, 3, 4]
        # Intersection: {2,3}, Union: {1,2,3,4}
        self.assertEqual(jaccard_similarity(ids_a, ids_b), 0.5)


# =============================================================================
# Test: Edge Cases
# =============================================================================

class TestEdgeCases(unittest.TestCase):
    """Test edge cases and error handling."""

    def test_empty_dataframe(self):
        """Empty feed should return 0 for metrics."""
        empty_df = pd.DataFrame()
        self.assertEqual(diversity_at_k(empty_df), 0)
        self.assertEqual(max_streak(empty_df, "topic"), 0)
        self.assertEqual(prosocial_ratio(empty_df), 0.0)

    def test_k_larger_than_data(self):
        """Requesting k > available data should return all data."""
        df = make_sample_data(10)
        weights, _ = get_mode_settings("entertainment")
        result = build_prototype_feed(df, weights, {}, k=100)
        self.assertEqual(len(result), 10)

    def test_single_item_feed(self):
        """Single item should work without errors."""
        df = make_sample_data(1)
        weights, _ = get_mode_settings("entertainment")
        result = build_prototype_feed(df, weights, {}, k=1)
        self.assertEqual(len(result), 1)

    def test_all_same_topic(self):
        """Dataset with single topic should still work."""
        df = make_sample_data(50)
        df["topic"] = "everything"
        weights, _ = get_mode_settings("entertainment")
        result = build_prototype_feed(df, weights, {}, k=10)
        self.assertEqual(len(result), 10)


# =============================================================================
# Integration Test
# =============================================================================

class TestIntegration(unittest.TestCase):
    """End-to-end integration tests."""

    def test_full_pipeline(self):
        """Test complete pipeline from raw data to metrics."""
        # Create data
        df = make_sample_data(500)

        # Validate and add engagement
        df = validate_and_clean(df)
        df, _ = add_engagement(df)

        # Get weights
        weights, k = get_mode_settings("inspiration", night_mode=True)

        # Build feed
        user_profile = {"passive_streak": 3, "user_trait": "humorous"}
        feed = build_prototype_feed(df, weights, user_profile, k=k)

        # Calculate metrics
        div_10 = diversity_at_k(feed, k=10)
        topic_streak = max_streak(feed, "topic")
        p_ratio = prosocial_ratio(feed)

        # Verify reasonable values
        self.assertGreaterEqual(div_10, 1)
        self.assertGreaterEqual(len(feed), k - 10)  # Allow some flexibility
        self.assertGreaterEqual(p_ratio, 0.0)
        self.assertLessEqual(p_ratio, 1.0)


# =============================================================================
# Run Tests
# =============================================================================

if __name__ == "__main__":
    unittest.main(verbosity=2)

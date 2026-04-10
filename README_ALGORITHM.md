# MorphoMedia: Core Algorithm Logic

This document consolidates the key mathematical formulas and ranking functions used within the `algorithm.py` Recommender System engine. This reference is designed for external UX/UI and Design firms (e.g., Flames.blue) to map visual feedback systems and transparency tags accurately to the underlying mathematics.

---

## 1. The Passive Consumption Decay

**Purpose**: To detect and forcefully interrupt infinite doomscrolling.

**Mechanic**: If a user consumes $N$ consecutive videos passively (without explicit engagement triggers like liking, sharing, or tapping into the comments), the baseline engagement potential weight ($W_e$) is algorithmically decayed.

### Equation

Let $W_e$ be the baseline engagement weight (typically ~0.55).
Let $N_{passive}$ be the current consecutive count of passively consumed feeds (the "passive streak").
Let $\text{Decay Rate}$ = 0.8.

The effective engagement weight $W_e'$ is calculated as:

$$ W_e' = W_e \times (\text{Decay Rate})^{N_{passive}} $$

### Code Implementation (`algorithm.py: score_parts`)

```python
# Decay Function
decay_rate = 0.8
e_weight = w["e"] * (decay_rate ** passive_streak)
```

*UI Impact: As the passive streak increases, $W_e'$ approaches zero, forcing the algorithm to aggressively prioritize high-diversity (Serendipity) or highly Prosocial content to break the loop.*

---

## 2. The Similarity Mindset / Upward Comparison Modifier

**Purpose**: To protect youth from upward comparison envy (e.g., body image issues or wealth gaps) by neutralizing highly "idealized" content if it clashes with the user's demographic traits.

### Equation

Let $r$ be the baseline risk score of the video (0 to 1).
Let $C_{appearance}$ be the algorithm's calculation of "appearance comparison triggers" within the video (0 to 1).
Let $S$ be the Similarity Coefficient between the Creator and the User. If they share a demographic trait, $S = 1$. If they differ, $S = -1$.

If $C_{appearance} > 0.5$:

$$ R_{effective} = r \times (1 - S) $$

### Code Implementation (`algorithm.py: score_parts`)

```python
r_effective = r
if appearance_comp > 0.5:
    # If similar (1), risk is mitigated (1 - 1 = 0).
    # If not similar (-1), risk is doubled (1 - -1 = 2).
    r_effective = r * (1 - similarity)
    r_effective = max(0.0, r_effective)
```

*UI Impact: When connected to the UI's "Similarity Mindset Mod" slider, increasing the weight punishes $R_{effective}$ harshly. A video featuring high appearance ideals from an unrelatable creator ($S=-1$) will dramatically lower its final recommendation score.*

---

## 3. The Gini Coefficient (Serendipity / Diversity Engine)

**Purpose**: To prevent restrictive "Filter Bubbles" by forcing mathematical content equality.

### Equation

The platform evaluates the rolling history of topics ($N_{recent} = 10$). The Gini coefficient ($G$) measures the inequality of this distribution. Lower values indicate higher diversity.

When considering a new video candidate ($V_{new}$):

$$ \Delta G = G_{current} - G_{hypothetical\_with\_V} $$

### Code Implementation

```python
def calculate_gini(distribution: List[int]) -> float:
    if not distribution or sum(distribution) == 0:
        return 0.0
    arr = np.sort(np.array(distribution, dtype=float))
    n = len(arr)
    index = np.arange(1, n + 1)
    return (np.sum((2 * index - n - 1) * arr)) / (n * np.sum(arr))

# Diversity Score (d) calculation:
d = (base_gini - new_gini) * serendipity_multiplier
```

*UI Impact: The UI's "Serendipity" slider acts as the final multiplier for $d$. Higher Serendipity artificially inflates the value of videos that break the user out of their filter bubble.*

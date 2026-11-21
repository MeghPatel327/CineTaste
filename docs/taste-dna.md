# Taste DNA & Preference Profiling

CineTaste's Taste DNA engine ([src/features/profile/tasteDnaService.ts](file:///d:/My_Codes/Project/CineTaste/src/features/profile/tasteDnaService.ts)) derives user viewing preferences directly from authentic library behavior—ratings, personal reviews, watch orders, and dropped titles.

---

## Core Principles

1. **Strict Mutual Exclusivity**: A genre must NEVER appear in both Strong Affinities and Dislikes ($A \cap B = \emptyset$).
2. **Evidence-Backed Weighting**: High ratings reinforce positive affinity; low ratings and dropped titles penalize genres mathematically.
3. **Unambiguous Classification**: Mixed signals or insufficient data produce *unclassified* genres, avoiding speculative AI hallucinations.
4. **Shared Preference Core**: The same analytical output feeds the Taste DNA narrative, Profile chips, Recommendation engine scoring, and Chatbot system prompt.

---

## Rating Weights & Net Score Formula

Each user interaction contributes a signed weight to a genre's cumulative net score:

| Rating / Action | Weight Value | Significance |
|---|---|---|
| **10 / 10** | `+2.0` | Standout cinematic masterpiece |
| **9 / 10** | `+1.5` | Strong positive affinity |
| **8 / 10** | `+1.0` | Definite positive preference |
| **7 / 10** | `+0.5` | Mild positive engagement |
| **6 / 10** | `0.0` | Neutral baseline |
| **5 / 10** | `-0.25` | Mildly below expectation |
| **4 / 10** | `-0.5` | Disliked element |
| **3 / 10** | `-1.0` | Definite negative reaction |
| **2 / 10** | `-1.5` | Strong negative reaction |
| **1 / 10** | `-2.0` | Complete aversion |
| **Dropped** | `-2.0` | Decisive negative tolerance |

---

## Classification Rules

For every genre tracked across completed and dropped titles:

### Single Standout Title (`count === 1`)
- **Emerging Favorite**: $\text{avg} \ge 9.0 \land \text{netScore} \ge 1.5 \land \text{lowCount} = 0$. Classified as an emerging standout preference.
- **Isolated Dislike**: $\text{avg} \le 3.0 \lor \text{netScore} \le -1.5$. Classified as a dislike candidate.
- **Insufficient Evidence**: Any other rating (e.g. single 7 or 8) remains unclassified to prevent over-fitting.

### Multi-Title Analysis (`count >= 2`)
- **Strong Affinity**:
  $$\text{avg} \ge 7.0 \land \text{netScore} > 0 \land \text{highCount} > \text{lowCount} \land \left(\frac{\text{lowCount}}{\text{count}} \le 0.35 \lor \text{highCount} \ge 2.5 \cdot \text{lowCount}\right)$$
- **Dislike**:
  $$\text{avg} \le 5.0 \land \text{netScore} < 0 \land \text{lowCount} > \text{highCount} \land (\text{highCount} = 0 \lor \text{lowCount} \ge 2 \cdot \text{highCount})$$
- **Mixed / Ambiguous**:
  Genres that do not meet either strict condition (e.g., 3 high ratings and 2 low ratings with average 6.2) are classified as *Mixed* and omitted from both likes and dislikes.

---

## Storytelling Styles & Tropes

The Taste DNA engine inspects personal reviews and keyword tags to detect recurring narrative patterns:

| Pattern | Detection Criteria |
|---|---|
| **Complex Non-Linear Narratives** | High affinity for Mystery / Sci-Fi combined with reviews mentioning *twist, puzzle, timeline, non-linear* |
| **Character-Driven Dramas** | High affinity for Drama combined with high ratings on slow-burn character pieces |
| **High-Concept Speculative Fiction** | High ratings across Sci-Fi / Fantasy titles exceeding 8.0 average |
| **High-Octane Adrenaline** | High ratings on Action / Thriller with short-to-medium runtimes |
| **Dark Psychological Tension** | High affinity for Psychological / Crime / Horror with reviews noting *tension, gritty, dark* |

---

## Narrative Synthesis & Regeneration

When `/profile` is visited or a movie is added/edited:
1. `analyzeUserTaste(movies)` calculates the exact metrics.
2. A coherent, non-contradictory summary paragraph is synthesized.
3. If the user's persisted profile in Baserow is missing or on an older engine version (`< 4.0`), `generateProfileAsync` is dispatched in the background to upgrade and synchronize Baserow.

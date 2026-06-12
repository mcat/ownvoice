"""Generate figures for the ICU-AAC literature review.

Figure 1: evidence identification/selection flow (two streams).
Figure 2: taxonomy of ICU communication interventions with evidence maturity.

Colorblind-safe single-hue (indigo) ramp + neutral grays, per project a11y ethos.
"""
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from pathlib import Path

OUT = Path(__file__).parent
INDIGO = ["#eef0fb", "#c7cdf0", "#8b96dd", "#5364c4", "#33409c", "#1f2766"]
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10})


def box(ax, x, y, w, h, text, fc=INDIGO[0], ec=INDIGO[4], fs=9.5, bold=False, tc="#16181d"):
    ax.add_patch(mpatches.FancyBboxPatch(
        (x, y), w, h, boxstyle="round,pad=0.012",
        facecolor=fc, edgecolor=ec, linewidth=1.3))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center",
            fontsize=fs, color=tc, fontweight="bold" if bold else "normal",
            linespacing=1.35)


def arrow(ax, x1, y1, x2, y2):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="-|>", color="#444a55", lw=1.4,
                                shrinkA=2, shrinkB=2))


# ---------------------------------------------------------------- Figure 1
fig, ax = plt.subplots(figsize=(9.2, 7.0))
ax.set_xlim(0, 100); ax.set_ylim(0, 100); ax.axis("off")

ax.text(26, 97.5, "Stream 1 — Pre-assembled corpus", ha="center",
        fontsize=11, fontweight="bold", color=INDIGO[5])
ax.text(74, 97.5, "Stream 2 — Database searches", ha="center",
        fontsize=11, fontweight="bold", color=INDIGO[5])

# Stream 1 (left)
box(ax, 6, 84, 40, 10, "35 full-text documents\n(citation chaining from VidaTalk trial\nbibliography, 5 topic groups)", fc=INDIGO[1])
box(ax, 6, 66, 40, 12, "31 unique documents\n(4 duplicate files removed:\n3× Shin 2021, 2× Choi & Tate 2021,\n2× Dind 2021)", fs=9)
box(ax, 6, 49, 40, 11, "Full-text extraction (n = 31)\nverified citations, design, sample,\nfindings, limitations, quality note")
box(ax, 6, 31, 40, 12, "30 included\n(26 peer-reviewed + 4 grey literature;\nPatton 1999 retained as\nmethods reference only)", fs=9)

arrow(ax, 26, 84, 26, 78.4)
arrow(ax, 26, 66, 26, 60.4)
arrow(ax, 26, 49, 26, 43.4)

# Stream 2 (right)
box(ax, 54, 84, 40, 10, "137 records identified\nPubMed / NCBI E-utilities\n7 queries (Q1–Q7), 2026-06-12", fc=INDIGO[1])
box(ax, 54, 66, 40, 12, "Title screening against\ninclusion criteria\n(records may match >1 query)")
box(ax, 54, 49, 40, 11, "39 abstracts reviewed in full")
box(ax, 54, 31, 40, 12, "33 included as\nsupplementary evidence", fs=9.5)

arrow(ax, 74, 84, 74, 78.4)
arrow(ax, 74, 66, 74, 60.4)
arrow(ax, 74, 49, 74, 43.4)

# Exclusion side notes
ax.text(96.5, 60, "excluded: out of scope\n(pediatric, BCI, unrelated\nvoice-tech, duplicates\nof corpus)", fontsize=8, color="#555c68", ha="left", va="center")
ax.set_xlim(0, 118)

# Merge
box(ax, 30, 14, 40, 10, "63 sources synthesized\n(6 themes + systematic-review\ncross-reading)", fc=INDIGO[4], ec=INDIGO[5], tc="white", bold=True, fs=10.5)
arrow(ax, 26, 31, 42, 24.6)
arrow(ax, 74, 31, 58, 24.6)

ax.text(50, 8, "Of the 63: 7 systematic/scoping reviews · 3 RCTs + 1 RCT protocol · "
               "8 quasi-experimental / controlled · feasibility, qualitative,\n"
               "usability and development studies · 4 grey-literature context documents",
        ha="center", fontsize=8.5, color="#555c68")

fig.suptitle("Figure 1. Evidence identification and selection", fontsize=13,
             fontweight="bold", y=0.995)
fig.tight_layout(rect=(0, 0, 1, 0.97))
fig.savefig(OUT / "evidence-flow.png", dpi=200, bbox_inches="tight",
            facecolor="white")
plt.close(fig)

# ---------------------------------------------------------------- Figure 2
fig, ax = plt.subplots(figsize=(11.5, 7.2))
ax.set_xlim(0, 100); ax.set_ylim(0, 100); ax.axis("off")

cols = [
    ("Unaided\nstrategies",
     ["Mouthing (63% of\nobserved attempts)", "Gesture (25%)",
      "Yes/no signals,\nhead nods"],
     "Dominant in practice;\nfailure-prone, partner-\ndependent",
     INDIGO[1]),
    ("Low-tech\naided AAC",
     ["Communication boards\n(mixed content preferred)", "Writing / alphabet\nboards",
      "Partner-assisted\nscanning"],
     "↑ satisfaction, ↑ ease,\n↓ anxiety, ↓ cortisol;\nrestrictive, underused",
     INDIGO[2]),
    ("Partner / system\ninterventions",
     ["SPEACS-2 nurse training\n+ SLP rounds", "Communication\nfacilitators (family)",
      "Service-delivery models,\nEMR triggers"],
     "↑ pain communication,\n↓ difficulty; scales to\n385 nurses / 5 ICUs",
     INDIGO[3]),
    ("High-tech AAC:\nSGDs & tablet apps",
     ["VOCAs / SGDs\n(feasible from day 1)", "iPad apps (9 commercial;\nVidaTalk, YoDoc, …)",
      "Frustration −2.68 (p<.001),\nsatisfaction +0.59"],
     "Strongest experience\nevidence; availability &\ntraining are the constraint",
     INDIGO[4]),
    ("Alternative access\n& voice-enabling",
     ["Eye-gaze: beats boards\nin randomized crossover", "Speaking valves: voice\n11 days sooner (RCT)",
      "Electrolarynx, talking\ntracheostomy tubes"],
     "Extends reach to weak /\nrestrained patients;\ntracheostomy-specific",
     INDIGO[4]),
    ("Personalized voice\n(emerging)",
     ["Message & voice banking\n(MND/ALS practice)", "AI voice cloning:\nself-voice RCT (2026),\nfamily-voice SVCC trial",
      "Patient-voiced AAC\nin ICU: NO STUDIES"],
     "Mature outside ICU;\nclinician→patient only;\npatient-initiated gap",
     INDIGO[5]),
]

w, gap, x0 = 14.8, 1.6, 1.2
for i, (title, items, verdict, color) in enumerate(cols):
    x = x0 + i * (w + gap)
    box(ax, x, 84, w, 9.5, title, fc=color, ec="#16181d",
        tc="white" if i >= 2 else "#16181d", bold=True, fs=9.5)
    y = 78
    for it in items:
        n = it.count("\n") + 1
        h = 4.4 + 3.3 * n
        box(ax, x, y - h, w, h, it, fc="white", ec=color, fs=7.8)
        y -= h + 1.6
    box(ax, x, 14, w, 16, verdict, fc=INDIGO[0], ec=color, fs=7.8)

ax.annotate("", xy=(99, 7.5), xytext=(1, 7.5),
            arrowprops=dict(arrowstyle="-|>", color=INDIGO[5], lw=2.2))
ax.text(50, 3.6, "increasing technology  ·  increasing personalization  ·  decreasing evidence maturity",
        ha="center", fontsize=10, color=INDIGO[5], style="italic")

fig.suptitle("Figure 2. Taxonomy of ICU communication interventions and evidence maturity",
             fontsize=13, fontweight="bold", y=0.99)
fig.tight_layout(rect=(0, 0, 1, 0.965))
fig.savefig(OUT / "intervention-taxonomy.png", dpi=200, bbox_inches="tight",
            facecolor="white")
plt.close(fig)

print("figures written:", [p.name for p in OUT.glob("*.png")])

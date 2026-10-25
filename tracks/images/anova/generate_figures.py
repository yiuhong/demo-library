#!/usr/bin/env python3
"""Draw the ANOVA track figures.

Black-on-white matplotlib diagrams. Run from any directory:

    python3 tracks/images/anova/generate_figures.py
"""

from __future__ import annotations

import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.lines import Line2D
from matplotlib.transforms import Bbox
from statistics import NormalDist

OUT = Path(__file__).resolve().parent

# Shared within-group pattern for the two-group and three-group sketches.
WITHIN_Z = np.array([-1.15, -0.65, -0.25, 0.05, 0.35, 0.75, 1.20])
WITHIN_SD = 8.0

# Default scores in statistics/partitioning_sum_of_squares_anova.html.
SS_GROUPS = {
    "A": np.array([70, 80, 90], dtype=float),
    "B": np.array([50, 60, 70], dtype=float),
    "C": np.array([90, 100, 110], dtype=float),
}

# Default cell means in statistics/two_way_anova.html. Male − female = 8 in
# both groups, and group 2 − group 1 = 10 for both genders, so the lines are parallel.
PARALLEL_CELLS = {
    "female": (38.0, 48.0),
    "male": (46.0, 56.0),
}
# A crossing pattern on the same scale: the group gap changes sign across gender.
CROSSING_CELLS = {
    "female": (38.0, 56.0),
    "male": (56.0, 38.0),
}

QQ_N = 36
ASSUMPTION_SEED = 19


def _style() -> None:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "font.size": 12,
            "axes.titlesize": 13,
            "axes.labelsize": 12,
            "xtick.labelsize": 11,
            "ytick.labelsize": 11,
            "axes.unicode_minus": False,
            "figure.facecolor": "white",
            "savefig.facecolor": "white",
            "axes.facecolor": "white",
            "text.color": "black",
            "axes.labelcolor": "black",
            "xtick.color": "black",
            "ytick.color": "black",
            "axes.edgecolor": "black",
            "axes.linewidth": 0.9,
            "xtick.major.width": 0.9,
            "ytick.major.width": 0.9,
        }
    )


def _assert_text_readable(fig: plt.Figure) -> None:
    fig.canvas.draw()
    renderer = fig.canvas.get_renderer()
    boxes: list[tuple[str, object]] = []
    width = fig.bbox.width
    height = fig.bbox.height
    for text in fig.findobj(match=plt.Text):
        content = text.get_text().replace("\n", " ").strip()
        if not content or not text.get_visible():
            continue
        bbox = text.get_window_extent(renderer=renderer)
        if bbox.width <= 0 or bbox.height <= 0:
            continue
        canvas = Bbox([[0, 0], [width, height]])
        if not bbox.overlaps(canvas):
            continue
        visible = Bbox.intersection(bbox, canvas)
        visible_area = visible.width * visible.height
        if visible_area < 0.98 * bbox.width * bbox.height:
            raise SystemExit(
                f"text falls outside the figure: {content!r} "
                f"box=({bbox.x0:.1f},{bbox.y0:.1f},{bbox.x1:.1f},{bbox.y1:.1f}) "
                f"canvas={width:.0f}x{height:.0f}"
            )
        boxes.append((content, bbox.padded(1.0)))
    for i, (left, left_box) in enumerate(boxes):
        for right, right_box in boxes[i + 1 :]:
            if left_box.overlaps(right_box):
                raise SystemExit(f"overlapping text: {left!r} and {right!r}")


def _save(fig: plt.Figure, name: str) -> None:
    _assert_text_readable(fig)
    path = OUT / name
    fig.savefig(path, dpi=130, bbox_inches="tight", pad_inches=0.22, facecolor="white")
    plt.close(fig)
    print(f"wrote {name}")


def _partition(groups: dict[str, np.ndarray]) -> dict[str, float]:
    arrays = [np.asarray(v, dtype=float) for v in groups.values()]
    all_values = np.concatenate(arrays)
    grand = float(all_values.mean())
    ss_total = float(np.sum((all_values - grand) ** 2))
    ss_between = float(sum(len(a) * (float(a.mean()) - grand) ** 2 for a in arrays))
    ss_within = float(sum(np.sum((a - a.mean()) ** 2) for a in arrays))
    df_between = len(arrays) - 1
    df_within = len(all_values) - len(arrays)
    ms_between = ss_between / df_between
    ms_within = ss_within / df_within
    return {
        "ss_total": ss_total,
        "ss_between": ss_between,
        "ss_within": ss_within,
        "df_between": df_between,
        "df_within": df_within,
        "ms_between": ms_between,
        "ms_within": ms_within,
        "F": ms_between / ms_within,
    }


def _two_group_t_and_f(a: np.ndarray, b: np.ndarray) -> tuple[float, float]:
    """Student's t and the two-group F, which satisfy t² = F."""
    n_a, n_b = len(a), len(b)
    ss_within = float(np.sum((a - a.mean()) ** 2) + np.sum((b - b.mean()) ** 2))
    df_within = n_a + n_b - 2
    sp2 = ss_within / df_within
    se = math.sqrt(sp2 * (1 / n_a + 1 / n_b))
    t_stat = float((a.mean() - b.mean()) / se)
    grand = float(np.concatenate([a, b]).mean())
    ss_between = float(n_a * (a.mean() - grand) ** 2 + n_b * (b.mean() - grand) ** 2)
    f_stat = (ss_between / 1) / (ss_within / df_within)
    return t_stat, f_stat


def _draw_groups(ax: plt.Axes, means: list[float], labels: list[str]) -> None:
    jitter = np.linspace(-0.12, 0.12, len(WITHIN_Z))
    for i, (mean, label) in enumerate(zip(means, labels)):
        values = mean + WITHIN_Z * WITHIN_SD
        ax.scatter(np.full(len(values), i) + jitter, values, s=28, c="black", zorder=3)
        ax.plot([i - 0.24, i + 0.24], [mean, mean], color="black", linewidth=1.7, zorder=4)
    ax.set_xticks(range(len(labels)), labels)
    ax.set_xlim(-0.55, len(means) - 0.45)
    ax.set_ylabel("score")


def draw_t_to_anova() -> None:
    two = [40.0 + WITHIN_Z * WITHIN_SD, 60.0 + WITHIN_Z * WITHIN_SD]
    t_stat, f_stat = _two_group_t_and_f(two[0], two[1])
    if abs(t_stat ** 2 - f_stat) > 1e-8:
        raise SystemExit(f"t² and F diverged: t={t_stat}, F={f_stat}")

    fig, axes = plt.subplots(1, 2, figsize=(8.2, 4.6), sharey=True, constrained_layout=True)
    _draw_groups(axes[0], [40.0, 60.0], ["group 1", "group 2"])
    _draw_groups(axes[1], [30.0, 50.0, 70.0], ["group 1", "group 2", "group 3"])
    axes[0].set_title("Two means")
    axes[1].set_title("Three means")
    axes[1].set_ylabel("")
    for ax in axes:
        ax.set_ylim(12, 88)
    fig.suptitle("Same within-group scatter", fontsize=13)
    _save(fig, "01-two-means-three-means.png")
    print(f"  two-group t={t_stat:.4f} t²={t_stat ** 2:.4f} F={f_stat:.4f}")


def draw_partition() -> None:
    stats = _partition(SS_GROUPS)
    expected = {
        "ss_total": 3000.0,
        "ss_between": 2400.0,
        "ss_within": 600.0,
        "F": 12.0,
    }
    for key, value in expected.items():
        if abs(stats[key] - value) > 1e-8:
            raise SystemExit(f"{key}={stats[key]} expected {value}")
    if abs(stats["ss_between"] + stats["ss_within"] - stats["ss_total"]) > 1e-8:
        raise SystemExit("sums of squares do not add")

    fig, ax = plt.subplots(figsize=(7.6, 3.8), constrained_layout=True)
    ax.barh(
        0,
        stats["ss_between"],
        height=0.55,
        facecolor="white",
        edgecolor="black",
        hatch="///",
        linewidth=1.1,
        zorder=2,
    )
    ax.barh(
        0,
        stats["ss_within"],
        left=stats["ss_between"],
        height=0.55,
        facecolor="white",
        edgecolor="black",
        linewidth=1.1,
        zorder=2,
    )
    ax.text(1200, 0.48, "between = 2400", ha="center", va="bottom", fontsize=12)
    ax.text(2700, 0.48, "within = 600", ha="center", va="bottom", fontsize=12)
    ax.text(1500, -0.62, "total = 3000     F = 12", ha="center", va="top", fontsize=12)
    ax.set_xlim(-80, 3800)
    ax.set_xticks([0, 1000, 2000, 3000])
    ax.set_ylim(-0.95, 1.15)
    ax.set_yticks([])
    ax.set_xlabel("sum of squares")
    ax.set_title("Total variation splits into between and within")
    _save(fig, "02-sum-of-squares.png")
    print("  ss", {k: stats[k] for k in ("ss_between", "ss_within", "ss_total", "F")})


def _cell_lines(ax: plt.Axes, cells: dict[str, tuple[float, float]]) -> None:
    female = cells["female"]
    male = cells["male"]
    ax.plot([0, 1], female, color="black", marker="o", linewidth=1.6, markersize=7, zorder=2)
    ax.plot([0, 1], male, color="black", linestyle="dashed", marker="^", linewidth=1.6, markersize=7, zorder=2)
    ax.set_xticks([0, 1], ["group 1", "group 2"])
    ax.set_xlim(-0.25, 1.25)
    ax.set_ylim(30, 66)
    ax.set_ylabel("cell mean")


def draw_two_way() -> None:
    f_slope = PARALLEL_CELLS["female"][1] - PARALLEL_CELLS["female"][0]
    m_slope = PARALLEL_CELLS["male"][1] - PARALLEL_CELLS["male"][0]
    if abs(f_slope - m_slope) > 1e-9:
        raise SystemExit("parallel panel is not parallel")
    c_f = CROSSING_CELLS["female"][1] - CROSSING_CELLS["female"][0]
    c_m = CROSSING_CELLS["male"][1] - CROSSING_CELLS["male"][0]
    if c_f * c_m >= 0:
        raise SystemExit("crossing panel should change sign")

    fig, axes = plt.subplots(1, 2, figsize=(8.2, 4.6), sharey=True, constrained_layout=True)
    _cell_lines(axes[0], PARALLEL_CELLS)
    _cell_lines(axes[1], CROSSING_CELLS)
    axes[0].set_title("Main effects: lines stay parallel")
    axes[1].set_title("Interaction: the lines cross")
    axes[1].set_ylabel("")
    fig.legend(
        handles=[
            Line2D([0], [0], color="black", marker="o", linewidth=1.6, label="female"),
            Line2D([0], [0], color="black", linestyle="dashed", marker="^", linewidth=1.6, label="male"),
        ],
        frameon=True,
        edgecolor="black",
        fancybox=False,
        loc="outside lower center",
        ncol=2,
    )
    _save(fig, "03-two-way.png")
    print(f"  parallel slope={f_slope:.1f} crossing slopes={c_f:.1f}, {c_m:.1f}")


def draw_assumptions() -> None:
    group_rng = np.random.default_rng(ASSUMPTION_SEED)
    means = (20.0, 32.0, 44.0)
    groups = [mean + group_rng.normal(0.0, 4.0, QQ_N // 3) for mean in means]
    sds = [float(g.std(ddof=1)) for g in groups]
    centers = [float(g.mean()) for g in groups]
    if max(sds) / min(sds) > 1.35:
        raise SystemExit(f"group spreads diverged: {sds}")

    raw = np.concatenate([g - g.mean() for g in groups])
    residuals = np.sort(raw / float(raw.std(ddof=1)))
    probs = (np.arange(1, len(residuals) + 1) - 0.5) / len(residuals)
    theo = np.array([NormalDist().inv_cdf(float(p)) for p in probs])
    qq_gap = float(np.max(np.abs(residuals - theo)))
    if qq_gap > 0.65:
        raise SystemExit(f"residual Q–Q sample is too far from the line ({qq_gap:.3f})")

    fig, axes = plt.subplots(1, 2, figsize=(8.4, 4.6), constrained_layout=True)

    ax = axes[0]
    limit = 2.8
    ax.plot([-limit, limit], [-limit, limit], color="black", linewidth=1.1, zorder=1)
    ax.scatter(theo, residuals, s=26, facecolors="white", edgecolors="black", linewidths=0.9, zorder=2)
    ax.set_xlim(-limit, limit)
    ax.set_ylim(-limit, limit)
    ax.set_xticks([-2, -1, 0, 1, 2])
    ax.set_yticks([-2, -1, 0, 1, 2])
    ax.set_aspect("equal", adjustable="box")
    ax.set_xlabel("normal theoretical quantile")
    ax.set_ylabel("residual quantile")
    ax.set_title("Residuals near a straight line")

    ax = axes[1]
    for i, values in enumerate(groups):
        jitter = group_rng.uniform(-0.12, 0.12, len(values))
        ax.scatter(np.full(len(values), i) + jitter, values, s=22, c="black", zorder=3)
        center = float(values.mean())
        ax.plot([i - 0.22, i + 0.22], [center, center], color="black", linewidth=1.5, zorder=4)
    ax.set_xticks([0, 1, 2], ["group A", "group B", "group C"])
    ax.set_xlim(-0.55, 2.55)
    low = min(float(v.min()) for v in groups)
    high = max(float(v.max()) for v in groups)
    ax.set_ylim(low - 6, high + 6)
    ax.set_yticks([t for t in (10, 20, 30, 40, 50, 60) if low - 2 < t < high + 2])
    ax.set_ylabel("score")
    ax.set_title("Similar spread in each group")

    _save(fig, "04-assumptions.png")
    print(
        "  assumption means={means} sds={sds} qq_gap={gap:.3f}".format(
            means=[round(c, 2) for c in centers],
            sds=[round(s, 2) for s in sds],
            gap=qq_gap,
        )
    )


def main() -> None:
    _style()
    draw_t_to_anova()
    draw_partition()
    draw_two_way()
    draw_assumptions()


if __name__ == "__main__":
    main()

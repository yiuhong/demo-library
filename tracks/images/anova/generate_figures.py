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

# Opening sliders in statistics/partitioning_sum_of_squares_anova.html:
# between-subjects, one factor, symmetric view.
SS_FACTOR_LEVELS = 3
SS_PER_GROUP = 10

# Preset 1 (baseline noise trap) in statistics/mixed_anova_2x2.html, lens 2.
# Five subjects per group. The u and v vectors are the page's orthogonal basis
# (sum 0, sum of squares 4).
MIXED_GRAND = 50.0
MIXED_GROUP = 4.0
MIXED_TIME = 6.0
MIXED_INT = 9.0
MIXED_SIGMA_B = 13.5
MIXED_SIGMA_W = 1.8
MIXED_U = np.array([-1.264911064, -0.632455532, 0.0, 0.632455532, 1.264911064])
MIXED_VA = np.array([0.632455532, -1.264911064, 1.264911064, -0.632455532, 0.0])
MIXED_VB = np.array([-0.632455532, 1.264911064, -1.264911064, 0.0, 0.632455532])


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

    # The live one-factor bar is proportional to degrees of freedom, not to a
    # numeric sum of squares. a = 3 and n = 10 give df_A = 2 and df_{S/A} = 27.
    a = SS_FACTOR_LEVELS
    n_per = SS_PER_GROUP
    df_a = a - 1
    df_error = a * (n_per - 1)
    df_total = a * n_per - 1
    if df_a != 2 or df_error != 27 or df_a + df_error != df_total:
        raise SystemExit(f"df partition drifted: {df_a} + {df_error} != {df_total}")

    fig, ax = plt.subplots(figsize=(7.6, 3.6), constrained_layout=True)
    ax.barh(
        0,
        df_a,
        height=0.5,
        facecolor="white",
        edgecolor="black",
        hatch="///",
        linewidth=1.1,
        zorder=2,
    )
    ax.barh(
        0,
        df_error,
        left=df_a,
        height=0.5,
        facecolor="white",
        edgecolor="black",
        linewidth=1.1,
        zorder=2,
    )
    ax.text(df_a / 2.0, 0.48, "SS_A\ndf = 2", ha="center", va="bottom", fontsize=12)
    ax.text(
        df_a + df_error / 2.0,
        0.48,
        "subjects within A\ndf = 27",
        ha="center",
        va="bottom",
        fontsize=12,
    )
    ax.text(
        df_total / 2.0,
        -0.62,
        "F = MS_A  /  MS of subjects within A",
        ha="center",
        va="top",
        fontsize=12,
    )
    ax.set_xlim(-1.2, 32.5)
    ax.set_xticks([0, 2, 29])
    ax.set_ylim(-1.15, 1.45)
    ax.set_yticks([])
    ax.set_xlabel("degrees of freedom,   a = 3 groups,   n = 10")
    ax.set_title("Between-subjects, one factor")
    _save(fig, "02-sum-of-squares.png")
    print("  ss", {k: stats[k] for k in ("ss_between", "ss_within", "ss_total", "F")})
    print(f"  bricks df_A={df_a} df_error={df_error}")


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


def _mixed_cells() -> dict[str, float]:
    """Cell means from the page's orthogonal contrasts. Group effect is B − A."""
    g = MIXED_GROUP
    t = MIXED_TIME
    x = MIXED_INT
    mid_a = MIXED_GRAND - g / 2.0
    mid_b = MIXED_GRAND + g / 2.0
    change_a = t - x / 2.0
    change_b = t + x / 2.0
    cells = {
        "A_pre": mid_a - change_a / 2.0,
        "A_post": mid_a + change_a / 2.0,
        "B_pre": mid_b - change_b / 2.0,
        "B_post": mid_b + change_b / 2.0,
        "A_mid": mid_a,
        "B_mid": mid_b,
        "change_a": change_a,
        "change_b": change_b,
    }
    if abs(cells["A_pre"] - 47.25) > 1e-9 or abs(cells["B_post"] - 57.25) > 1e-9:
        raise SystemExit(f"mixed cell means drifted: {cells}")
    return cells


def _mixed_sums() -> dict[str, float]:
    """Same closed forms as statistics/mixed_anova_2x2.html."""
    ss_group = 5.0 * MIXED_GROUP**2
    ss_time = 5.0 * MIXED_TIME**2
    ss_int = 1.25 * MIXED_INT**2
    ss_err_b = 16.0 * MIXED_SIGMA_B**2
    ss_err_w = 16.0 * MIXED_SIGMA_W**2
    stats = {
        "ss_group": ss_group,
        "ss_time": ss_time,
        "ss_int": ss_int,
        "ss_err_b": ss_err_b,
        "ss_err_w": ss_err_w,
        "ss_between": ss_group + ss_err_b,
        "ss_within": ss_time + ss_int + ss_err_w,
        "F_group": ss_group / (ss_err_b / 8.0),
        "F_time": ss_time / (ss_err_w / 8.0),
        "F_int": ss_int / (ss_err_w / 8.0),
    }
    expected = {
        "ss_group": 80.0,
        "ss_time": 180.0,
        "ss_int": 101.25,
        "ss_err_b": 2916.0,
        "ss_err_w": 51.84,
        "ss_between": 2996.0,
        "ss_within": 333.09,
        "F_group": 80.0 / 364.5,
        "F_time": 180.0 / 6.48,
        "F_int": 101.25 / 6.48,
    }
    for key, value in expected.items():
        if abs(stats[key] - value) > 1e-6:
            raise SystemExit(f"mixed {key}={stats[key]} expected {value}")
    return stats


def _mixed_subjects(cells: dict[str, float]) -> tuple[np.ndarray, np.ndarray]:
    """Pre and post for group A (rows 0–4) then group B (rows 5–9)."""
    pre = np.empty(10)
    post = np.empty(10)
    for i, (u, v) in enumerate(zip(MIXED_U, MIXED_VA)):
        shift = MIXED_SIGMA_B * u
        wobble = MIXED_SIGMA_W * v
        pre[i] = cells["A_pre"] + shift - wobble
        post[i] = cells["A_post"] + shift + wobble
    for i, (u, v) in enumerate(zip(MIXED_U, MIXED_VB)):
        shift = MIXED_SIGMA_B * u
        wobble = MIXED_SIGMA_W * v
        pre[5 + i] = cells["B_pre"] + shift - wobble
        post[5 + i] = cells["B_post"] + shift + wobble
    mids = 0.5 * (pre + post)
    # The within wobble cancels in the average, leaving the between-subject shift.
    if abs(float(mids[0]) - (cells["A_mid"] + MIXED_SIGMA_B * MIXED_U[0])) > 1e-6:
        raise SystemExit("subject averages should ignore within-subject wobble")
    if float(np.max(post) - np.min(pre)) < 40:
        raise SystemExit("between-subject fan should dwarf the group gap of 4")
    return pre, post


def draw_mixed() -> None:
    """Lens 2 of the 2×2 mixed page, on the baseline-noise preset.

    Group means barely differ, and each person's average sits far from the
    group midpoint. The within-subject slopes are tight, so time and the
    interaction are large next to their own error.
    """
    cells = _mixed_cells()
    stats = _mixed_sums()
    pre, post = _mixed_subjects(cells)
    mids = 0.5 * (pre + post)

    fig = plt.figure(figsize=(9.8, 5.5), constrained_layout=True)
    grid = fig.add_gridspec(2, 2, width_ratios=[1.28, 1.0], height_ratios=[1.0, 1.0])
    ax = fig.add_subplot(grid[:, 0])
    ax_b = fig.add_subplot(grid[0, 1])
    ax_w = fig.add_subplot(grid[1, 1])

    ax.axvspan(1.42, 1.98, color="#f2f2f2", zorder=0)
    for i in range(5):
        ax.plot([0, 1], [pre[i], post[i]], color="black", linewidth=0.75, zorder=2)
    for i in range(5, 10):
        ax.plot([0, 1], [pre[i], post[i]], color="black", linestyle="dashed", linewidth=0.75, zorder=2)
    ax.plot(
        [0, 1],
        [cells["A_pre"], cells["A_post"]],
        color="black",
        linewidth=2.2,
        marker="o",
        markerfacecolor="white",
        markersize=7,
        zorder=4,
    )
    ax.plot(
        [0, 1],
        [cells["B_pre"], cells["B_post"]],
        color="black",
        linestyle="dashed",
        linewidth=2.2,
        marker="^",
        markerfacecolor="white",
        markersize=7,
        zorder=4,
    )
    ax.scatter(
        np.full(5, 1.7),
        mids[:5],
        s=30,
        facecolors="white",
        edgecolors="black",
        linewidths=0.9,
        marker="o",
        zorder=3,
    )
    ax.scatter(
        np.full(5, 1.7),
        mids[5:],
        s=34,
        facecolors="white",
        edgecolors="black",
        linewidths=0.9,
        marker="^",
        zorder=3,
    )
    ax.plot([1.58, 1.82], [cells["A_mid"], cells["A_mid"]], color="black", linewidth=1.7, zorder=4)
    ax.plot(
        [1.58, 1.82],
        [cells["B_mid"], cells["B_mid"]],
        color="black",
        linestyle="dashed",
        linewidth=1.7,
        zorder=4,
    )
    ax.legend(
        handles=[
            Line2D([0], [0], color="black", marker="o", markerfacecolor="white", linewidth=2.0, label="group A"),
            Line2D(
                [0],
                [0],
                color="black",
                linestyle="dashed",
                marker="^",
                markerfacecolor="white",
                linewidth=2.0,
                label="group B",
            ),
        ],
        frameon=True,
        edgecolor="black",
        fancybox=False,
        loc="upper left",
    )
    low = float(min(pre.min(), post.min()))
    high = float(max(pre.max(), post.max()))
    ax.set_xlim(-0.28, 2.08)
    ax.set_xticks([0, 1, 1.7], ["pre", "post", "averages"])
    ax.set_ylim(low - 4, high + 14)
    ax.set_ylabel("score")
    ax.set_title("Ten subjects, pre to post")

    def _stratum(ax_s: plt.Axes, parts: list[tuple[str, float, str | None]], total: float, title: str) -> None:
        left = 0.0
        for _name, width, hatch in parts:
            ax_s.barh(
                0,
                width,
                left=left,
                height=0.48,
                facecolor="white",
                edgecolor="black",
                hatch=hatch,
                linewidth=1.0,
                zorder=2,
            )
            left += width
        if abs(left - total) > 1e-6:
            raise SystemExit(f"{title} parts sum to {left}, expected {total}")
        ax_s.set_xlim(-0.03 * total, total * 1.06)
        ax_s.set_ylim(-0.85, 1.25)
        ax_s.set_yticks([])
        ax_s.set_title(title)

    between = stats["ss_between"]
    _stratum(
        ax_b,
        [("group", stats["ss_group"], "///"), ("error", stats["ss_err_b"], None)],
        between,
        "Between subjects,  SS = 2996",
    )
    ax_b.text(0, 0.55, "group 80", ha="left", va="bottom", fontsize=11)
    ax_b.text(between / 2.0, 0, "error 2916", ha="center", va="center", fontsize=12)
    ax_b.set_xticks([0, 1500, 2996])
    ax_b.set_xlabel("F group = 0.22")

    within = stats["ss_within"]
    _stratum(
        ax_w,
        [
            ("time", stats["ss_time"], "///"),
            ("interaction", stats["ss_int"], "\\\\\\"),
            ("error", stats["ss_err_w"], None),
        ],
        within,
        "Within subjects,  SS = 333.09",
    )
    time_mid = stats["ss_time"] / 2.0
    int_mid = stats["ss_time"] + stats["ss_int"] / 2.0
    err_mid = stats["ss_time"] + stats["ss_int"] + stats["ss_err_w"] / 2.0
    ax_w.text(time_mid, 0.42, "time 180", ha="center", va="bottom", fontsize=11)
    ax_w.text(int_mid, 0.88, "G×T 101.25", ha="center", va="bottom", fontsize=11)
    ax_w.text(err_mid, 0.42, "error 51.84", ha="center", va="bottom", fontsize=11)
    ax_w.set_xticks([0, 100, 200, 333])
    ax_w.set_xlabel("F time = 27.78,    F interaction = 15.62")

    _save(fig, "03b-mixed-anova.png")
    print(
        "  mixed between={between:.1f} within={within:.2f} F=({fg:.2f}, {ft:.2f}, {fi:.2f})".format(
            between=between,
            within=within,
            fg=stats["F_group"],
            ft=stats["F_time"],
            fi=stats["F_int"],
        )
    )


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
    draw_mixed()
    draw_assumptions()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Draw the describing-data track figures.

Black-on-white matplotlib diagrams. Run from any directory:

    python3 tracks/images/describing-data/generate_figures.py
"""

from __future__ import annotations

import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.lines import Line2D
from matplotlib.patches import FancyBboxPatch, Rectangle
from matplotlib.transforms import Bbox
from statistics import NormalDist

OUT = Path(__file__).resolve().parent

# Positive-skew preset from statistics/mean_mode_median_dot_plot.html.
POSITIVE_SKEW = [
    2, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6,
    7, 7, 7, 7, 8, 8, 8, 9, 9, 10, 11, 12, 14, 16, 19,
]

# One small sample for the moment schematic. Right tail at 9.
MOMENT_SAMPLE = np.array([1, 2, 3, 4, 5, 9], dtype=float)

# Integer sample for the linked histogram and boxplot. One peak, a longer
# right tail, and every point inside the Tukey fences.
HIST_SAMPLE = (
    [3] * 3
    + [4] * 6
    + [5] * 9
    + [6] * 8
    + [7] * 6
    + [8] * 4
    + [9] * 3
    + [10] * 2
    + [11] * 2
    + [12] * 1
)

# Quartiles of this set are 20, 30, and 40, so the fences fall at -10 and 70
# and 80 is the only outlier. Checked in draw_fences().
FENCE_SAMPLE = [12, 16, 20, 24, 28, 30, 32, 36, 40, 44, 80]

# Lognormal parameters for the skew-density figure (natural log scale).
SKEW_MU = 0.0
SKEW_SIGMA = 0.85

# Bessel simulation matches the demo's population spread (sd 10, variance 100).
BESSEL_N = 10
BESSEL_REPS = 8000
BESSEL_MEAN = 50.0
BESSEL_SD = 10.0
BESSEL_SEED = 20261025

QQ_N = 40
QQ_SEED = 24


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
    """Fail if labels collide or fall outside the canvas."""
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


def _median(sorted_values: np.ndarray) -> float:
    n = len(sorted_values)
    mid = n // 2
    if n % 2:
        return float(sorted_values[mid])
    return float(sorted_values[mid - 1] + sorted_values[mid]) / 2.0


def quartiles(values) -> dict:
    """Quartiles as in statistics/boxplot_outliers.html.

    Median of the sorted values, then the median of each half. An odd-length
    sample leaves the middle value out of both halves.
    """
    sorted_values = np.sort(np.asarray(values, dtype=float))
    n = len(sorted_values)
    q2 = _median(sorted_values)
    lower = sorted_values[: n // 2]
    upper = sorted_values[(n + 1) // 2 :]
    q1 = _median(lower)
    q3 = _median(upper)
    iqr = q3 - q1
    lower_fence = q1 - 1.5 * iqr
    upper_fence = q3 + 1.5 * iqr
    inside = sorted_values[(sorted_values >= lower_fence) & (sorted_values <= upper_fence)]
    outliers = sorted_values[(sorted_values < lower_fence) | (sorted_values > upper_fence)]
    return {
        "sorted": sorted_values,
        "q1": q1,
        "q2": q2,
        "q3": q3,
        "iqr": iqr,
        "lower_fence": lower_fence,
        "upper_fence": upper_fence,
        "whisker_low": float(inside.min()),
        "whisker_high": float(inside.max()),
        "outliers": outliers,
    }


def _mean_median_mode(values) -> tuple[float, float, float]:
    arr = np.asarray(values, dtype=float)
    mean = float(arr.mean())
    median = _median(np.sort(arr))
    uniq, counts = np.unique(arr, return_counts=True)
    max_count = counts.max()
    if max_count == 1:
        raise SystemExit("sample has no mode")
    modes = uniq[counts == max_count]
    if len(modes) != 1:
        raise SystemExit(f"expected one mode, got {modes}")
    return mean, median, float(modes[0])


def draw_mean_median_mode() -> None:
    mean, median, mode = _mean_median_mode(POSITIVE_SKEW)
    if not (mode < median < mean):
        raise SystemExit(f"expected mode < median < mean, got {mode}, {median}, {mean}")

    counts: dict[int, int] = {}
    for value in POSITIVE_SKEW:
        counts[value] = counts.get(value, 0) + 1
    max_count = max(counts.values())

    fig, ax = plt.subplots(figsize=(7.4, 4.6), constrained_layout=True)
    for value, count in sorted(counts.items()):
        ys = np.arange(1, count + 1)
        ax.scatter(
            np.full(count, value),
            ys,
            s=46,
            c="black",
            zorder=3,
            linewidths=0,
        )

    styles = [(0, (1, 1.15)), (0, (5, 2)), "solid"]
    marks = [
        (mode, "mode = 5", styles[0]),
        (median, "median = 6", styles[1]),
        (mean, f"mean = {mean:.2f}", styles[2]),
    ]
    for x, _label, style in marks:
        ax.axvline(x, color="black", linestyle=style, linewidth=1.25, zorder=4)
    legend_handles = [
        Line2D([0], [0], color="black", linestyle=style, linewidth=1.25, label=label)
        for _x, label, style in marks
    ]
    ax.legend(
        handles=legend_handles,
        frameon=True,
        edgecolor="black",
        fancybox=False,
        loc="upper right",
        title="mode < median < mean",
    )

    ax.set_xlim(1, 20)
    ax.set_ylim(0, max_count + 1.6)
    ax.set_xlabel("value")
    ax.set_ylabel("count")
    ax.set_title("Mild right skew: the three averages pull apart")
    ax.set_xticks(range(2, 21, 2))
    ax.set_yticks(range(0, max_count + 1, 2))
    _save(fig, "01-mean-median-mode.png")
    print(f"  mean={mean:.4f} median={median:.4f} mode={mode:.4f}")


def draw_moments() -> None:
    sample = MOMENT_SAMPLE
    mean = float(sample.mean())
    dev = sample - mean
    squares = dev ** 2
    cubes = dev ** 3
    m2 = float(squares.mean())
    m3 = float(cubes.mean())
    if mean != 4 or m3 <= 0:
        raise SystemExit(f"unexpected moments mean={mean} m3={m3}")

    fig, axes = plt.subplots(3, 1, figsize=(7.4, 8.0), constrained_layout=True)
    fig.get_layout_engine().set(h_pad=0.35, hspace=0.06)
    xs = np.arange(len(sample))
    labels = [str(int(v)) for v in sample]

    ax = axes[0]
    ax.axhline(0, color="black", linewidth=0.8)
    ax.scatter(xs, np.zeros_like(xs), s=55, c="black", zorder=3)
    mean_index = int(np.where(sample == mean)[0][0])
    ax.plot([mean_index, mean_index], [-0.28, 0.45], color="black", linestyle="dashed", linewidth=1.15)
    ax.text(mean_index + 0.18, 0.72, r"$m_1=\bar{x}=4$", ha="left", va="center", fontsize=12)
    ax.set_ylim(-0.55, 1.25)
    ax.set_yticks([])
    ax.set_title("1st moment: center")
    for spine in ("left", "top", "right"):
        ax.spines[spine].set_visible(False)

    ax = axes[1]
    ax.bar(xs, squares, width=0.62, facecolor="white", edgecolor="black", linewidth=1.0, zorder=2)
    for x, height in zip(xs, squares):
        label_y = 1.1 if height == 0 else height + 0.7
        ax.text(x, label_y, f"{height:.0f}", ha="center", va="bottom", fontsize=10)
    ax.set_ylim(0, 36)
    ax.set_yticks([0, 10, 20, 30])
    ax.text(
        0.02,
        0.92,
        rf"$m_2=$ average $= {m2:.2f}$",
        transform=ax.transAxes,
        ha="left",
        va="top",
        fontsize=12,
    )
    ax.set_ylabel(r"$(x-\bar{x})^2$")
    ax.set_title("2nd moment: spread")

    ax = axes[2]
    ax.axhline(0, color="black", linewidth=0.8)
    ax.bar(xs, cubes, width=0.62, facecolor="white", edgecolor="black", linewidth=1.0, zorder=2)
    for x, height in zip(xs, cubes):
        if height == 0:
            ax.text(x, 6, "0", ha="center", va="bottom", fontsize=10)
            continue
        va = "bottom" if height > 0 else "top"
        offset = 4 if height > 0 else -4
        ax.text(x, height + offset, f"{height:.0f}", ha="center", va=va, fontsize=10)
    ax.set_ylim(-50, 155)
    ax.set_yticks([-50, 0, 50, 100, 150])
    ax.text(
        0.02,
        0.92,
        rf"$m_3=$ average $= {m3:.0f}$",
        transform=ax.transAxes,
        ha="left",
        va="top",
        fontsize=12,
    )
    ax.set_ylabel(r"$(x-\bar{x})^3$")
    ax.set_title("3rd moment: skew — the long tail dominates the cubes")

    for ax in axes:
        ax.set_xticks(xs, labels)
        ax.set_xlim(-0.6, len(sample) - 0.4)
    for ax in axes[:-1]:
        ax.tick_params(axis="x", labelbottom=False)
    axes[2].set_xlabel("one sample:  1,  2,  3,  4,  5,  9")
    _save(fig, "02-moments.png")
    print(f"  m1={mean:.4f} m2={m2:.4f} m3={m3:.4f}")


def draw_bessel() -> None:
    rng = np.random.default_rng(BESSEL_SEED)
    samples = rng.normal(BESSEL_MEAN, BESSEL_SD, size=(BESSEL_REPS, BESSEL_N))
    centered = samples - samples.mean(axis=1, keepdims=True)
    ss = np.square(centered).sum(axis=1)
    by_n = ss / BESSEL_N
    by_nm1 = ss / (BESSEL_N - 1)
    avg_n = float(by_n.mean())
    avg_nm1 = float(by_nm1.mean())
    truth = BESSEL_SD ** 2
    if not (avg_n < truth and abs(avg_nm1 - truth) < abs(avg_n - truth)):
        raise SystemExit(f"Bessel figure failed: /n={avg_n}, /(n-1)={avg_nm1}, truth={truth}")
    if abs(avg_nm1 - truth) > 2 or abs(avg_n - truth * (BESSEL_N - 1) / BESSEL_N) > 2:
        raise SystemExit(f"Bessel averages too far from theory: {avg_n}, {avg_nm1}")

    fig, ax = plt.subplots(figsize=(7.2, 4.5), constrained_layout=True)
    positions = [0, 1]
    heights = [avg_n, avg_nm1]
    bars = ax.bar(
        positions,
        heights,
        width=0.58,
        facecolor="white",
        edgecolor="black",
        linewidth=1.15,
        zorder=2,
    )
    bars[0].set_hatch("///")
    ax.axhline(truth, color="black", linestyle="dashed", linewidth=1.25, zorder=3)
    ax.text(
        -0.55,
        truth + 2.2,
        rf"true $\sigma^2 = {truth:.0f}$",
        ha="left",
        va="bottom",
        fontsize=12,
    )
    for x, height in zip(positions, heights):
        ax.text(
            x,
            height / 2,
            f"{height:.1f}",
            ha="center",
            va="center",
            fontsize=13,
            bbox={"facecolor": "white", "edgecolor": "none", "pad": 1.6},
            zorder=4,
        )
    ax.set_xlim(-0.7, 1.7)
    ax.set_ylim(0, truth + 18)
    ax.set_xticks(positions, ["divide by n", "divide by n − 1"])
    ax.set_ylabel(f"average variance estimate  ({BESSEL_REPS} samples)")
    ax.set_title(f"Sample size n = {BESSEL_N}. Dividing by n − 1 lands on the true variance.")
    _save(fig, "03-bessels-correction.png")
    print(f"  avg/n={avg_n:.3f} avg/(n-1)={avg_nm1:.3f} truth={truth}")


def _lognormal_pdf(x: np.ndarray, mu: float, sigma: float) -> np.ndarray:
    return np.exp(-((np.log(x) - mu) ** 2) / (2 * sigma ** 2)) / (
        x * sigma * math.sqrt(2 * math.pi)
    )


def draw_skew() -> None:
    mu, sigma = SKEW_MU, SKEW_SIGMA
    mode = math.exp(mu - sigma ** 2)
    median = math.exp(mu)
    mean = math.exp(mu + 0.5 * sigma ** 2)
    if not (mode < median < mean):
        raise SystemExit(f"skew order failed: {mode}, {median}, {mean}")

    # Confirm the closed-form mode is the peak of this pdf.
    grid = np.linspace(0.05, 8, 4000)
    pdf = _lognormal_pdf(grid, mu, sigma)
    peak = float(grid[np.argmax(pdf)])
    if abs(peak - mode) > 0.02:
        raise SystemExit(f"mode {mode} disagrees with pdf peak {peak}")

    x = np.linspace(0.02, 5.2, 600)
    y = _lognormal_pdf(x, mu, sigma)
    fig, ax = plt.subplots(figsize=(7.4, 4.6), constrained_layout=True)
    ax.fill_between(x, y, color="#f2f2f2", zorder=1)
    ax.plot(x, y, color="black", linewidth=1.6, zorder=2)

    styles = [(0, (1, 1.15)), (0, (5, 2)), "solid"]
    marks = [
        (mode, f"mode = {mode:.2f}", styles[0]),
        (median, f"median = {median:.2f}", styles[1]),
        (mean, f"mean = {mean:.2f}", styles[2]),
    ]
    y_top = float(y.max())
    for xpos, _label, style in marks:
        ax.axvline(xpos, color="black", linestyle=style, linewidth=1.15, zorder=3)
    legend_handles = [
        Line2D([0], [0], color="black", linestyle=style, linewidth=1.25, label=label)
        for _x, label, style in marks
    ]
    ax.legend(
        handles=legend_handles,
        frameon=True,
        edgecolor="black",
        fancybox=False,
        loc="upper right",
        title="mode < median < mean",
    )
    ax.set_xlim(0, 5.2)
    ax.set_xticks([0, 1, 2, 3, 4, 5])
    ax.set_ylim(0, y_top * 1.08)
    ax.set_xlabel("value")
    ax.set_ylabel("density")
    ax.set_title("Right skew: the mean is pulled into the long tail")
    _save(fig, "04-skew.png")
    print(f"  mode={mode:.4f} median={median:.4f} mean={mean:.4f}")


def draw_histogram_box() -> None:
    stats = quartiles(HIST_SAMPLE)
    if len(stats["outliers"]):
        raise SystemExit(f"histogram sample has outliers: {stats['outliers']}")
    upper = stats["whisker_high"] - stats["q3"]
    lower = stats["q1"] - stats["whisker_low"]
    if upper <= lower:
        raise SystemExit(f"expected a longer upper whisker, upper={upper} lower={lower}")
    values, counts = np.unique(stats["sorted"], return_counts=True)
    peak = float(values[np.argmax(counts)])
    if peak > stats["q2"]:
        raise SystemExit("histogram peak should sit at or left of the median")

    fig, (ax_hist, ax_box) = plt.subplots(
        2,
        1,
        figsize=(7.4, 5.4),
        sharex=True,
        gridspec_kw={"height_ratios": [3.1, 1.15]},
        constrained_layout=True,
    )
    ax_hist.bar(
        values,
        counts,
        width=0.86,
        align="center",
        facecolor="white",
        edgecolor="black",
        linewidth=1.0,
        zorder=2,
    )
    for xpos, name in (
        (stats["q1"], r"$Q_1$"),
        (stats["q2"], r"$Q_2$"),
        (stats["q3"], r"$Q_3$"),
    ):
        ax_hist.axvline(xpos, color="black", linestyle="dashed", linewidth=0.9, zorder=1)
        ax_box.axvline(xpos, color="black", linestyle="dashed", linewidth=0.9, zorder=1)
        ax_hist.text(xpos, counts.max() + 0.35, name, ha="center", va="bottom", fontsize=11)

    _draw_horizontal_box(ax_box, stats)
    ax_hist.set_ylim(0, counts.max() + 2.4)
    ax_hist.set_yticks(list(range(0, int(counts.max()) + 1, 2)))
    ax_hist.set_ylabel("count")
    ax_hist.set_title("Same sample: the pile in the histogram is the box below")
    ax_box.set_xlabel("value")
    ax_box.set_yticks([])
    ax_box.set_ylabel("box")
    ax_hist.set_xlim(1.5, 14.5)
    _save(fig, "05-boxplot-histogram.png")
    print(
        "  hist n={n} q1={q1} q2={q2} q3={q3} whiskers={lo}..{hi} peak={peak}".format(
            n=len(HIST_SAMPLE),
            q1=stats["q1"],
            q2=stats["q2"],
            q3=stats["q3"],
            lo=stats["whisker_low"],
            hi=stats["whisker_high"],
            peak=peak,
        )
    )


def _draw_horizontal_box(ax: plt.Axes, stats: dict) -> None:
    y = 0.0
    box_h = 0.55
    ax.plot(
        [stats["whisker_low"], stats["whisker_high"]],
        [y, y],
        color="black",
        linewidth=1.2,
        zorder=2,
    )
    for edge in (stats["whisker_low"], stats["whisker_high"]):
        ax.plot([edge, edge], [y - 0.16, y + 0.16], color="black", linewidth=1.2, zorder=2)
    ax.add_patch(
        Rectangle(
            (stats["q1"], y - box_h / 2),
            stats["q3"] - stats["q1"],
            box_h,
            facecolor="white",
            edgecolor="black",
            linewidth=1.2,
            zorder=3,
        )
    )
    ax.plot(
        [stats["q2"], stats["q2"]],
        [y - box_h / 2, y + box_h / 2],
        color="black",
        linewidth=2.0,
        zorder=4,
    )
    if len(stats["outliers"]):
        ax.scatter(
            stats["outliers"],
            np.full(len(stats["outliers"]), y),
            s=36,
            facecolors="black",
            edgecolors="black",
            zorder=5,
        )
    ax.set_ylim(-1.05, 1.05)


def _gaussian_kde(values: np.ndarray, grid: np.ndarray, bandwidth: float) -> np.ndarray:
    """Gaussian kernel density, f̂(x) = (1/(n h)) Σ K((x − xᵢ)/h)."""
    sample = np.asarray(values, dtype=float)
    scale = bandwidth * math.sqrt(2 * math.pi)
    z = (grid[None, :] - sample[:, None]) / bandwidth
    return np.exp(-0.5 * z * z).sum(axis=0) / (len(sample) * scale)


def draw_kde() -> None:
    """Same 44 values as the histogram card, with a Gaussian kernel on top.

    Bandwidth is Silverman's rule, rounded to two decimals:
    h = 0.9 * min(s, IQR/1.34) * n^(−1/5), with s the sample standard deviation.
    """
    sample = np.asarray(HIST_SAMPLE, dtype=float)
    n = len(sample)
    stats = quartiles(sample)
    sd = float(sample.std(ddof=1))
    silverman = 0.9 * min(sd, stats["iqr"] / 1.34) * n ** (-0.2)
    bandwidth = round(silverman, 2)
    if not 0.4 <= bandwidth <= 1.6:
        raise SystemExit(f"KDE bandwidth {bandwidth} is outside the teaching range")

    values, counts = np.unique(sample, return_counts=True)
    bin_width = 1.0
    density = counts / (n * bin_width)
    peak_x = float(values[int(np.argmax(counts))])
    if peak_x != 5:
        raise SystemExit(f"expected the histogram peak at 5, got {peak_x}")

    grid = np.linspace(1.5, 14.2, 700)
    curve = _gaussian_kde(sample, grid, bandwidth)
    # A Gaussian kernel integrates to 1, so the estimate should too.
    area = float(np.sum((curve[:-1] + curve[1:]) * 0.5 * np.diff(grid)))
    if abs(area - 1) > 0.04:
        raise SystemExit(f"KDE area {area} is not near 1")
    mode_x = float(grid[int(np.argmax(curve))])
    if not 4.2 <= mode_x <= 6.2:
        raise SystemExit(f"KDE mode {mode_x} does not sit on the histogram peak")
    # The right tail of the bars is lower than the peak; the curve should agree.
    tail = float(curve[np.argmin(np.abs(grid - 12))])
    if tail >= float(curve.max()) * 0.45:
        raise SystemExit("KDE tail is not lower than the peak")

    fig, ax = plt.subplots(figsize=(7.6, 4.9))
    fig.subplots_adjust(left=0.12, right=0.98, top=0.90, bottom=0.14)
    ax.bar(
        values,
        density,
        width=0.86,
        align="center",
        facecolor="white",
        edgecolor="black",
        linewidth=1.0,
        zorder=2,
        label="histogram, width 1",
    )
    ax.plot(
        grid,
        curve,
        color="black",
        linewidth=1.7,
        zorder=3,
        label=f"Gaussian KDE,  h = {bandwidth:.2f}",
    )

    y_top = max(float(density.max()), float(curve.max()))
    ax.set_xlim(1.5, 14.6)
    ax.set_ylim(0, y_top * 1.32)
    ax.set_xlabel("value")
    ax.set_ylabel("density")
    ax.set_title("Same sample: the pile, drawn without bin edges")
    ax.legend(
        frameon=True,
        edgecolor="black",
        fancybox=False,
        loc="upper right",
    )
    _save(fig, "06-kernel-density.png")
    print(
        f"  kde n={n} h={bandwidth:.2f} silverman={silverman:.4f} "
        f"mode={mode_x:.2f} peak_bar={peak_x:.0f} area={area:.3f} "
        f"max_density={float(curve.max()):.3f}"
    )


def draw_fences() -> None:
    stats = quartiles(FENCE_SAMPLE)
    expected = {
        "q1": 20.0,
        "q2": 30.0,
        "q3": 40.0,
        "iqr": 20.0,
        "lower_fence": -10.0,
        "upper_fence": 70.0,
        "whisker_low": 12.0,
        "whisker_high": 44.0,
    }
    for key, value in expected.items():
        if abs(stats[key] - value) > 1e-9:
            raise SystemExit(f"fence sample {key}={stats[key]} expected {value}")
    if list(stats["outliers"]) != [80.0]:
        raise SystemExit(f"expected one outlier at 80, got {stats['outliers']}")

    fig, ax = plt.subplots(figsize=(6.6, 6.6), constrained_layout=True)
    x = 0.0
    box_w = 0.46
    ax.plot(
        [x, x],
        [stats["whisker_low"], stats["whisker_high"]],
        color="black",
        linewidth=1.25,
        zorder=2,
    )
    for edge in (stats["whisker_low"], stats["whisker_high"]):
        ax.plot([x - 0.12, x + 0.12], [edge, edge], color="black", linewidth=1.25, zorder=2)
    ax.add_patch(
        FancyBboxPatch(
            (x - box_w / 2, stats["q1"]),
            box_w,
            stats["q3"] - stats["q1"],
            boxstyle="square,pad=0",
            facecolor="white",
            edgecolor="black",
            linewidth=1.3,
            zorder=3,
        )
    )
    ax.plot(
        [x - box_w / 2, x + box_w / 2],
        [stats["q2"], stats["q2"]],
        color="black",
        linewidth=2.2,
        zorder=4,
    )
    for fence in (stats["lower_fence"], stats["upper_fence"]):
        ax.plot(
            [x - 0.72, x + 0.72],
            [fence, fence],
            color="black",
            linestyle="dashed",
            linewidth=1.05,
            zorder=1,
        )
    ax.scatter(
        [x],
        stats["outliers"],
        s=42,
        c="black",
        zorder=5,
    )

    # IQR bracket on the left of the box, and the 1.5 IQR step up to the fence.
    x_iqr = x - 0.62
    ax.plot([x_iqr, x_iqr], [stats["q1"], stats["q3"]], color="black", linewidth=1.0)
    ax.plot([x_iqr - 0.06, x_iqr + 0.06], [stats["q1"], stats["q1"]], color="black", linewidth=1.0)
    ax.plot([x_iqr - 0.06, x_iqr + 0.06], [stats["q3"], stats["q3"]], color="black", linewidth=1.0)
    ax.text(x_iqr - 0.1, (stats["q1"] + stats["q3"]) / 2, "IQR", ha="right", va="center", fontsize=11)

    x_step = x + 0.78
    ax.annotate(
        "",
        xy=(x_step, stats["upper_fence"]),
        xytext=(x_step, stats["q3"]),
        arrowprops={"arrowstyle": "<->", "color": "black", "lw": 0.9},
    )
    ax.text(
        x_step + 0.08,
        (stats["q3"] + stats["upper_fence"]) / 2,
        r"$1.5\times$ IQR",
        ha="left",
        va="center",
        fontsize=11,
    )

    labels = [
        (stats["lower_fence"], "lower fence = −10", x - 0.78, "right"),
        (stats["q1"], r"$Q_1=20$", x + 0.32, "left"),
        (stats["q2"], r"median $Q_2=30$", x + 0.32, "left"),
        (stats["q3"], r"$Q_3=40$", x + 0.32, "left"),
        (stats["whisker_high"], "whisker ends at 44", x - 0.2, "right"),
        (stats["upper_fence"], "upper fence = 70", x - 0.78, "right"),
        (float(stats["outliers"][0]), "outlier", x + 0.16, "left"),
    ]
    for y, text, xpos, ha in labels:
        ax.text(xpos, y, text, ha=ha, va="center", fontsize=11)

    ax.set_xlim(-1.85, 1.85)
    ax.set_ylim(-22, 92)
    ax.set_xticks([])
    ax.set_ylabel("value")
    ax.set_title("Tukey fences: a point past 1.5 IQR is an outlier")
    _save(fig, "07-boxplot-fences.png")
    print("  fences ok", {key: stats[key] for key in expected})


def draw_qq() -> None:
    seed = QQ_SEED
    rng = np.random.default_rng(seed)
    sample = np.sort(rng.normal(0.0, 1.0, QQ_N))
    probs = (np.arange(1, QQ_N + 1) - 0.5) / QQ_N
    theo = np.array([NormalDist().inv_cdf(float(p)) for p in probs])
    residual = np.abs(sample - theo)
    if float(residual.max()) > 0.55:
        raise SystemExit(f"Q-Q sample is not nearly linear (max residual {residual.max()})")

    limit = max(float(np.abs(theo).max()), float(np.abs(sample).max())) + 0.35
    fig, ax = plt.subplots(figsize=(6.3, 6.3), constrained_layout=True)
    ax.plot([-limit, limit], [-limit, limit], color="black", linewidth=1.15, linestyle="solid", zorder=1)
    ax.scatter(theo, sample, s=28, facecolors="white", edgecolors="black", linewidths=1.0, zorder=2)
    ax.text(
        -limit + 0.15,
        limit - 0.28,
        "reference line",
        ha="left",
        va="top",
        fontsize=12,
    )
    ax.set_xlim(-limit, limit)
    ax.set_ylim(-limit, limit)
    ax.set_aspect("equal", adjustable="box")
    ax.set_xlabel(r"theoretical normal quantile,  $\Phi^{-1}((i-0.5)/n)$")
    ax.set_ylabel("sample quantile (ordered value)")
    ax.set_title(f"One nearly normal sample (n = {QQ_N})")
    _save(fig, "08-qq-plot.png")
    print(f"  qq seed={seed} max|residual|={float(residual.max()):.3f}")


def main() -> None:
    _style()
    draw_mean_median_mode()
    draw_moments()
    draw_bessel()
    draw_skew()
    draw_histogram_box()
    draw_kde()
    draw_fences()
    draw_qq()


if __name__ == "__main__":
    main()

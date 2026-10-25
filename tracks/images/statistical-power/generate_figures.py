#!/usr/bin/env python3
"""Draw the statistical-power track figures.

Black-on-white matplotlib diagrams. Run from any directory:

    python3 tracks/images/statistical-power/generate_figures.py
"""

from __future__ import annotations

import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.lines import Line2D
from matplotlib.patches import Patch
from matplotlib.transforms import Bbox
from scipy.stats import t as student_t
from statistics import NormalDist

OUT = Path(__file__).resolve().parent

# Opening state of statistics/statistical_power.html: one-tailed, α = 0.05,
# μ0 = 0, μ1 = 2, σ = 5, n = 30.
POWER_MU0 = 0.0
POWER_MU1 = 2.0
POWER_SD = 5.0
POWER_N = 30
POWER_ALPHA = 0.05

# Opening state of statistics/power_curve.html: two-sided Student's t,
# equal groups, Cohen's d = 0.50, α = 0.05, target power 0.80.
CURVE_D = 0.50
CURVE_RATIO = 1.0
CURVE_ALPHA = 0.05
CURVE_TARGET = 0.80


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


def _normal_pdf(x: np.ndarray, mu: float, sigma: float) -> np.ndarray:
    return np.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * math.sqrt(2 * math.pi))


def demo_power(n_total: int, d: float = CURVE_D, ratio: float = CURVE_RATIO, alpha: float = CURVE_ALPHA) -> float:
    """Shifted central-t power, copied from statistics/power_curve.html.

    Two-sided independent-samples Student's t, equal variances.
    lambda = d * sqrt(N * r / (1 + r)^2), df = N - 2.
    """
    if n_total <= 2:
        return 0.0
    df = n_total - 2
    t_alpha = abs(float(student_t.ppf(alpha / 2.0, df)))
    modifier = ratio / (1.0 + ratio) ** 2
    lam = d * math.sqrt(n_total * modifier)
    power = (1.0 - float(student_t.cdf(t_alpha - lam, df))) + float(student_t.cdf(-t_alpha - lam, df))
    return power


def _required_n(target: float = CURVE_TARGET) -> int:
    found = None
    for n in range(4, 3001):
        if demo_power(n) >= target:
            found = n
            break
    if found is None:
        raise SystemExit("no N reached the target power")
    if found > 4 and demo_power(found - 1) >= target:
        raise SystemExit("required N is not the smallest")
    return found


def draw_power() -> None:
    se = POWER_SD / math.sqrt(POWER_N)
    z_crit = NormalDist().inv_cdf(1.0 - POWER_ALPHA)
    cutoff = POWER_MU0 + z_crit * se
    null = NormalDist(POWER_MU0, se)
    alt = NormalDist(POWER_MU1, se)
    alpha = 1.0 - null.cdf(cutoff)
    power = 1.0 - alt.cdf(cutoff)
    if abs(alpha - POWER_ALPHA) > 1e-6:
        raise SystemExit(f"alpha region should be 0.05, got {alpha}")
    if not (0.65 < power < 0.80):
        raise SystemExit(f"power out of the expected band: {power}")

    x = np.linspace(-3.4, 6.2, 800)
    y0 = _normal_pdf(x, POWER_MU0, se)
    y1 = _normal_pdf(x, POWER_MU1, se)
    fig, ax = plt.subplots(figsize=(7.5, 4.8), constrained_layout=True)
    ax.plot(x, y0, color="black", linewidth=1.7, zorder=3)
    ax.plot(x, y1, color="black", linestyle="dashed", linewidth=1.7, zorder=3)
    right = x >= cutoff
    ax.fill_between(x[right], y1[right], color="#d9d9d9", zorder=1)
    ax.axvline(cutoff, color="black", linestyle=(0, (1.2, 1.2)), linewidth=1.15, zorder=4)

    ax.legend(
        handles=[
            Line2D([0], [0], color="black", linewidth=1.7, label="null"),
            Line2D([0], [0], color="black", linestyle="dashed", linewidth=1.7, label="alternative"),
            Line2D([0], [0], color="black", linestyle=(0, (1.2, 1.2)), linewidth=1.15, label=f"cutoff = {cutoff:.2f}"),
            Patch(facecolor="#d9d9d9", edgecolor="black", label=f"power = {power:.0%}"),
        ],
        frameon=True,
        edgecolor="black",
        fancybox=False,
        loc="upper right",
        title="α = 5%, one-tailed",
    )
    ax.set_xlim(-3.4, 6.2)
    ax.set_xticks([-2, 0, 2, 4, 6])
    ax.set_ylim(0, 0.64)
    ax.set_yticks([0, 0.2, 0.4])
    ax.set_xlabel("sample mean")
    ax.set_ylabel("density")
    ax.set_title("Power is the alternative curve past the null cutoff")
    _save(fig, "01-power-regions.png")
    print(f"  se={se:.4f} cutoff={cutoff:.4f} alpha={alpha:.4f} power={power:.4f}")


def draw_curve() -> None:
    required = _required_n()
    ns = np.arange(10, 241)
    ys = np.array([demo_power(int(n)) for n in ns])
    if not np.all(np.diff(ys) > -1e-9):
        raise SystemExit("power should rise with N for this effect")
    # A larger effect at the same N sits higher: SE shrinks like 1/√n, and |effect| moves the curve.
    if demo_power(required, d=0.8) <= demo_power(required, d=CURVE_D):
        raise SystemExit("power should rise with |effect|")

    marked = demo_power(required)
    fig, ax = plt.subplots(figsize=(7.4, 4.7), constrained_layout=True)
    ax.plot(ns, ys, color="black", linewidth=1.7, zorder=2)
    ax.axhline(CURVE_TARGET, color="black", linestyle="dashed", linewidth=1.0, zorder=1)
    ax.axvline(required, color="black", linestyle=(0, (1.2, 1.2)), linewidth=1.05, zorder=1)
    ax.scatter([required], [marked], s=42, c="black", zorder=3)
    ax.text(28, 0.90, f"operating point\nN = {required},  power = 0.80", ha="left", va="top", fontsize=11)
    ax.text(168, 0.62, "d = 0.50", ha="left", va="center", fontsize=12)
    ax.set_xlim(10, 240)
    ax.set_xticks([50, 100, 150, 200])
    ax.set_ylim(0, 1.05)
    ax.set_yticks([0.2, 0.4, 0.6, 0.8, 1.0])
    ax.set_xlabel("total sample size, N")
    ax.set_ylabel("power")
    ax.set_title("Larger N lifts power. Equal groups, α = 0.05")
    _save(fig, "02-power-curve.png")
    print(f"  required N={required} power={marked:.4f} power(N-1)={demo_power(required - 1):.4f}")


def main() -> None:
    _style()
    draw_power()
    draw_curve()


if __name__ == "__main__":
    main()

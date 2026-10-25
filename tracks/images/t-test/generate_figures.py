#!/usr/bin/env python3
"""Draw the t-test track figures.

Black-on-white matplotlib diagrams. Run from any directory:

    python3 tracks/images/t-test/generate_figures.py
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

OUT = Path(__file__).resolve().parent

# Independent-samples schematic. Equal within-group sums of squares, so the
# pooled standard error in statistics/independent_t_test_simulation.html
# (the demo's default, Student's t) is the natural SE.
GROUP_1 = np.array([42, 46, 48, 50, 50, 52, 54, 58], dtype=float)
GROUP_2 = np.array([54, 58, 60, 62, 62, 64, 66, 70], dtype=float)

# Paired schematic. Difference scores average to 5, near the demo's μ_D = 5.
# s_d uses the sample divisor n − 1, as in statistics/paired_t_test_simulation.html.
PRE = np.array([46, 52, 48, 61, 50, 57, 49, 55], dtype=float)
DIFF = np.array([8, 2, 7, 1, 9, 0, 6, 7], dtype=float)


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


def _legend(ax: plt.Axes, handles, **kwargs) -> None:
    ax.legend(
        handles=handles,
        frameon=True,
        edgecolor="black",
        fancybox=False,
        **kwargs,
    )


def _normal_pdf(x: np.ndarray, mu: float, sigma: float) -> np.ndarray:
    return np.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * math.sqrt(2 * math.pi))


def _t_pdf(x: np.ndarray, df: float) -> np.ndarray:
    c = math.gamma((df + 1) / 2) / (math.sqrt(df * math.pi) * math.gamma(df / 2))
    return c * (1.0 + (x ** 2) / df) ** (-(df + 1) / 2)


def _sample_sd(values: np.ndarray) -> float:
    return float(np.sqrt(np.sum((values - values.mean()) ** 2) / (len(values) - 1)))


def draw_z_vs_t() -> None:
    df = 4
    x = np.linspace(-4.6, 4.6, 700)
    z = _normal_pdf(x, 0.0, 1.0)
    t = _t_pdf(x, df)
    tail_x = 3.0
    z_tail = float(_normal_pdf(np.array([tail_x]), 0.0, 1.0)[0])
    t_tail = float(_t_pdf(np.array([tail_x]), df)[0])
    if not (t_tail > 3 * z_tail and t[len(t) // 2] < z[len(z) // 2]):
        raise SystemExit(f"expected heavier t tails: t={t_tail}, z={z_tail}")

    fig, axes = plt.subplots(1, 2, figsize=(8.2, 4.5), constrained_layout=True)
    ax = axes[0]
    ax.plot(x, z, color="black", linewidth=1.7, zorder=2)
    ax.plot(x, t, color="black", linestyle="dashed", linewidth=1.7, zorder=2)
    _legend(
        ax,
        [
            Line2D([0], [0], color="black", linewidth=1.7, label="z,  known σ"),
            Line2D([0], [0], color="black", linestyle="dashed", linewidth=1.7, label="t,  df = 4"),
        ],
        loc="upper right",
    )
    ax.set_xlim(-4.6, 4.6)
    ax.set_xticks([-4, -2, 0, 2, 4])
    ax.set_ylim(0, 0.50)
    ax.set_yticks([0, 0.1, 0.2, 0.3, 0.4])
    ax.set_xlabel("statistic")
    ax.set_ylabel("density")
    ax.set_title("Full curve")

    ax = axes[1]
    zoom = (x >= 2.0) & (x <= 4.4)
    ax.plot(x[zoom], z[zoom], color="black", linewidth=1.7, zorder=2)
    ax.plot(x[zoom], t[zoom], color="black", linestyle="dashed", linewidth=1.7, zorder=2)
    ax.set_xlim(2.0, 4.5)
    ax.set_xticks([2.5, 3.0, 3.5, 4.0])
    ax.set_ylim(0, 0.08)
    ax.set_yticks([0, 0.02, 0.04, 0.06])
    ax.set_xlabel("statistic")
    ax.set_ylabel("density")
    ax.set_title("Right tail: t stays higher")
    fig.suptitle("Replacing σ with s fattens the tails", fontsize=13)
    _save(fig, "01-z-vs-t.png")
    print(f"  tail at 3: z={z_tail:.5f} t4={t_tail:.5f}")


def draw_independent() -> None:
    g1, g2 = GROUP_1, GROUP_2
    m1, m2 = float(g1.mean()), float(g2.mean())
    s1, s2 = _sample_sd(g1), _sample_sd(g2)
    n1, n2 = len(g1), len(g2)
    sp2 = ((n1 - 1) * s1 ** 2 + (n2 - 1) * s2 ** 2) / (n1 + n2 - 2)
    se = math.sqrt(sp2 * (1 / n1 + 1 / n2))
    t_stat = (m1 - m2) / se
    if abs(m1 - 50) > 1e-9 or abs(m2 - 62) > 1e-9:
        raise SystemExit(f"unexpected means {m1}, {m2}")
    if abs(s1 - s2) > 1e-9:
        raise SystemExit("within-group spreads should match")

    fig, ax = plt.subplots(figsize=(7.2, 5.0), constrained_layout=True)
    jitter = np.array([-0.10, -0.04, 0.02, 0.08, -0.08, 0.04, -0.02, 0.10])
    ax.scatter(0 + jitter, g1, s=42, c="black", zorder=3)
    ax.scatter(1 + jitter, g2, s=42, facecolors="white", edgecolors="black", linewidths=1.15, zorder=3)

    for x, mean in ((0, m1), (1, m2)):
        ax.plot([x - 0.28, x + 0.28], [mean, mean], color="black", linewidth=1.8, zorder=4)

    # Within-group sample spread, one bracket per group.
    for x, mean, side in ((0, m1, -1), (1, m2, 1)):
        xb = x + side * 0.42
        ax.plot([xb, xb], [mean - s1, mean + s1], color="black", linewidth=1.05, zorder=2)
        ax.plot([xb - 0.05, xb + 0.05], [mean - s1, mean - s1], color="black", linewidth=1.05)
        ax.plot([xb - 0.05, xb + 0.05], [mean + s1, mean + s1], color="black", linewidth=1.05)

    ax.annotate(
        "",
        xy=(0.55, m2),
        xytext=(0.55, m1),
        arrowprops={"arrowstyle": "<->", "color": "black", "lw": 1.05},
    )
    ax.text(0.62, (m1 + m2) / 2, "difference = 12", ha="left", va="center", fontsize=12)
    ax.text(-0.62, m1, "s = 4.9", ha="center", va="center", fontsize=11)
    ax.text(1.62, m2, "s = 4.9", ha="center", va="center", fontsize=11)

    ax.set_xlim(-1.05, 2.05)
    ax.set_ylim(34, 78)
    ax.set_xticks([0, 1], ["group 1", "group 2"])
    ax.set_ylabel("score")
    ax.set_title("Two separate groups: means against the within-group spread")
    _save(fig, "02-independent-t.png")
    print(f"  independent means={m1:.1f},{m2:.1f} s={s1:.4f} SE={se:.4f} t={t_stat:.4f} df={n1 + n2 - 2}")


def draw_paired() -> None:
    pre = PRE
    diff = DIFF
    post = pre + diff
    d_bar = float(diff.mean())
    s_d = _sample_sd(diff)
    n = len(diff)
    t_stat = d_bar / (s_d / math.sqrt(n))
    if abs(d_bar - 5.0) > 1e-9:
        raise SystemExit(f"mean difference should be 5, got {d_bar}")

    fig, axes = plt.subplots(1, 2, figsize=(8.2, 4.8), constrained_layout=True)

    ax = axes[0]
    for a, b in zip(pre, post):
        ax.plot([0, 1], [a, b], color="black", linewidth=1.0, zorder=1)
    ax.scatter(np.zeros(n), pre, s=36, c="black", zorder=2)
    ax.scatter(np.ones(n), post, s=36, facecolors="white", edgecolors="black", linewidths=1.1, zorder=2)
    ax.set_xlim(-0.35, 1.35)
    ax.set_xticks([0, 1], ["before", "after"])
    ax.set_ylabel("score")
    ax.set_title("Each person, twice")
    ax.set_ylim(40, 70)
    ax.set_yticks([45, 50, 55, 60, 65])

    ax = axes[1]
    # Stack ties so both 7s stay visible.
    stacked: dict[float, int] = {}
    xs = []
    ys = []
    for value in diff:
        k = stacked.get(float(value), 0)
        stacked[float(value)] = k + 1
        xs.append(k)
        ys.append(float(value))
    ax.scatter(xs, ys, s=42, c="black", zorder=3)
    ax.axhline(d_bar, color="black", linestyle="dashed", linewidth=1.15, zorder=2)
    ax.text(0.72, d_bar + 0.55, "mean difference = 5", ha="left", va="bottom", fontsize=11)
    ax.set_xlim(-0.55, 1.7)
    ax.set_ylim(-1.5, 12.0)
    ax.set_yticks([0, 2, 4, 6, 8, 10])
    ax.set_xticks([])
    ax.set_xlabel("difference scores")
    ax.set_ylabel("after − before")
    ax.set_title("The pairs become one distribution")

    _save(fig, "03-paired-t.png")
    print(f"  paired d_bar={d_bar:.2f} s_d={s_d:.4f} t={t_stat:.4f} df={n - 1}")


def main() -> None:
    _style()
    draw_z_vs_t()
    draw_independent()
    draw_paired()


if __name__ == "__main__":
    main()

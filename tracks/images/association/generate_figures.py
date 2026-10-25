#!/usr/bin/env python3
"""Draw the association track figures.

Black-on-white matplotlib diagrams. Run from any directory:

    python3 tracks/images/association/generate_figures.py
"""

from __future__ import annotations

import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.transforms import Bbox

OUT = Path(__file__).resolve().parent

# One cloud for covariance and for the straight-line share of variance.
# Sample covariance and correlation use the divisor n − 1, as in
# statistics/covariance_and_correlation.html.
CLOUD_SEED = 8
CLOUD_N = 36

# Independent variances at the demo's opening state, ρ = 0:
# statistics/additivity_of_variance.html sets both variances to 1.
VAR_X = 1.0
VAR_Y = 1.0


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


def _cloud() -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(CLOUD_SEED)
    x = rng.normal(0.0, 1.0, CLOUD_N)
    y = 0.85 * x + rng.normal(0.0, 0.55, CLOUD_N)
    return x, y


def _association(x: np.ndarray, y: np.ndarray) -> dict[str, float]:
    n = len(x)
    x_bar = float(x.mean())
    y_bar = float(y.mean())
    cov = float(np.sum((x - x_bar) * (y - y_bar)) / (n - 1))
    s_x = float(np.sqrt(np.sum((x - x_bar) ** 2) / (n - 1)))
    s_y = float(np.sqrt(np.sum((y - y_bar) ** 2) / (n - 1)))
    r = cov / (s_x * s_y)
    # Straight-line fit. R² = SS_line / SS_total, and that equals r².
    slope = cov / (s_x ** 2)  # sample slope, since cov and s_x² share the n − 1 divisor
    intercept = y_bar - slope * x_bar
    fitted = intercept + slope * x
    ss_total = float(np.sum((y - y_bar) ** 2))
    ss_line = float(np.sum((fitted - y_bar) ** 2))
    r2 = ss_line / ss_total
    return {
        "n": n,
        "x_bar": x_bar,
        "y_bar": y_bar,
        "cov": cov,
        "s_x": s_x,
        "s_y": s_y,
        "r": r,
        "slope": slope,
        "intercept": intercept,
        "ss_total": ss_total,
        "ss_line": ss_line,
        "r2": r2,
    }


def draw_correlation() -> None:
    x, y = _cloud()
    stats = _association(x, y)
    if stats["r"] < 0.7:
        raise SystemExit(f"expected a clear positive r, got {stats['r']}")
    if abs(stats["r2"] - stats["r"] ** 2) > 1e-10:
        raise SystemExit("R² and r² diverged")

    fig, ax = plt.subplots(figsize=(6.6, 5.4), constrained_layout=True)
    ax.scatter(x, y, s=32, facecolors="white", edgecolors="black", linewidths=1.0, zorder=3)
    ax.axvline(stats["x_bar"], color="black", linestyle="dashed", linewidth=1.0, zorder=1)
    ax.axhline(stats["y_bar"], color="black", linestyle="dashed", linewidth=1.0, zorder=1)
    ax.text(
        0.04,
        0.96,
        f"r = {stats['r']:.2f}\nunit-free",
        transform=ax.transAxes,
        ha="left",
        va="top",
        fontsize=12,
        bbox={"facecolor": "white", "edgecolor": "black", "pad": 4},
    )
    ax.set_xlim(-2.9, 2.2)
    ax.set_ylim(-3.1, 2.3)
    ax.set_xticks([-2, -1, 0, 1, 2])
    ax.set_yticks([-2, -1, 0, 1, 2])
    ax.set_xlabel("x")
    ax.set_ylabel("y")
    ax.set_title("Positive association. r has no units")
    _save(fig, "01-correlation.png")
    print(
        "  r={r:.4f} cov={cov:.4f} sx={s_x:.4f} sy={s_y:.4f}".format(**stats)
    )


def draw_variance_explained() -> None:
    x, y = _cloud()
    stats = _association(x, y)
    fitted = stats["intercept"] + stats["slope"] * x
    share = stats["r2"]
    if not (0.55 < share < 0.90):
        raise SystemExit(f"R² not in a readable range: {share}")

    fig, axes = plt.subplots(1, 2, figsize=(8.4, 4.7), constrained_layout=True)
    ax = axes[0]
    ax.scatter(x, y, s=28, facecolors="white", edgecolors="black", linewidths=0.95, zorder=3)
    order = np.argsort(x)
    ax.plot(x[order], fitted[order], color="black", linewidth=1.6, zorder=2)
    for xv, yv, yhat in zip(x, y, fitted):
        ax.plot([xv, xv], [yv, yhat], color="black", linewidth=0.6, linestyle=(0, (1, 1.2)), zorder=1)
    ax.set_xlim(-2.9, 2.2)
    ax.set_ylim(-3.1, 2.3)
    ax.set_xticks([-2, -1, 0, 1, 2])
    ax.set_yticks([-2, -1, 0, 1, 2])
    ax.set_xlabel("x")
    ax.set_ylabel("y")
    ax.set_title("Straight-line link")

    ax = axes[1]
    shared = share * 100
    left = 100 - shared
    ax.bar(
        0,
        shared,
        width=0.62,
        facecolor="white",
        edgecolor="black",
        hatch="///",
        linewidth=1.1,
    )
    ax.bar(
        0,
        left,
        bottom=shared,
        width=0.62,
        facecolor="white",
        edgecolor="black",
        linewidth=1.1,
    )
    ax.text(0, shared / 2, f"shared\n{shared:.0f}%", ha="center", va="center", fontsize=12)
    ax.text(0, shared + left / 2, f"remaining\n{left:.0f}%", ha="center", va="center", fontsize=12)
    ax.set_xlim(-0.7, 0.7)
    ax.set_ylim(0, 128)
    ax.set_yticks([0, 25, 50, 75, 100])
    ax.set_xticks([])
    ax.set_ylabel("variance in y  (%)")
    ax.set_title(f"R² = {stats['r2']:.2f}")

    _save(fig, "02-variance-explained.png")
    print(f"  R2={stats['r2']:.4f} r2={stats['r'] ** 2:.4f} ss_line={stats['ss_line']:.3f} ss_total={stats['ss_total']:.3f}")


def draw_additivity() -> None:
    total = VAR_X + VAR_Y
    if abs(total - 2.0) > 1e-12:
        raise SystemExit("independent variances should add to 2")

    fig, ax = plt.subplots(figsize=(7.2, 4.6), constrained_layout=True)
    ax.bar(0, VAR_X, width=0.62, facecolor="white", edgecolor="black", hatch="///", linewidth=1.1, zorder=2)
    ax.bar(1, VAR_Y, width=0.62, facecolor="white", edgecolor="black", linewidth=1.1, zorder=2)
    ax.bar(2, VAR_X, width=0.62, facecolor="white", edgecolor="black", hatch="///", linewidth=1.1, zorder=2)
    ax.bar(2, VAR_Y, bottom=VAR_X, width=0.62, facecolor="white", edgecolor="black", linewidth=1.1, zorder=2)
    ax.text(0, VAR_X + 0.08, "1", ha="center", va="bottom", fontsize=13)
    ax.text(1, VAR_Y + 0.08, "1", ha="center", va="bottom", fontsize=13)
    ax.text(
        2,
        0.5,
        "1",
        ha="center",
        va="center",
        fontsize=13,
        bbox={"facecolor": "white", "edgecolor": "none", "pad": 1.4},
        zorder=4,
    )
    ax.text(2, 1.5, "1", ha="center", va="center", fontsize=13)
    ax.text(2, total + 0.08, "2", ha="center", va="bottom", fontsize=13)
    ax.text(0.0, 2.45, "covariance term = 0", ha="left", va="center", fontsize=12)
    ax.set_xlim(-0.6, 2.6)
    ax.set_ylim(0, 2.85)
    ax.set_yticks([0, 1, 2])
    ax.set_xticks([0, 1, 2], ["Var(X)", "Var(Y)", "Var(X+Y)"])
    ax.set_ylabel("variance")
    ax.set_title("Independent sources: the two variances stack")
    _save(fig, "03-additivity.png")
    print(f"  var x={VAR_X} var y={VAR_Y} total={total}")


def main() -> None:
    _style()
    draw_correlation()
    draw_variance_explained()
    draw_additivity()


if __name__ == "__main__":
    main()

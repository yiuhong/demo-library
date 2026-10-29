#!/usr/bin/env python3
"""Draw the statistical-reasoning track figures.

Black-on-white matplotlib diagrams. Run from any directory:

    python3 tracks/images/statistical-reasoning/generate_figures.py
"""

from __future__ import annotations

import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.lines import Line2D
from matplotlib.patches import Rectangle
from matplotlib.transforms import Bbox

OUT = Path(__file__).resolve().parent

# Horowitz (1974) classroom simulation, as in
# statistics/horowitz_1974_simulation_CLT.html: 96 students, each drawing
# n = 10 scores from a population of about N(50, 15.8).
HOROWITZ_N = 10
HOROWITZ_STUDENTS = 96
HOROWITZ_MEAN = 50.0
HOROWITZ_SD = 15.8
HOROWITZ_SEED = 1974

# Schematic 95% intervals. Half-width is z* * SE with z* = 1.96 and SE = 1,
# so a shot covers 0 exactly when its center sits inside ±1.96.
CI_Z = 1.96
CI_HALF = CI_Z * 1.0

# Galton board defaults in statistics/galton_board.html: 12 peg rows, fair coin.
GALTON_ROWS = 12
GALTON_P = 0.5

# Coin-flip defaults in statistics/binomial_bernoulli.html: 10 coins, fair coin.
BINOMIAL_N = 10
BINOMIAL_P = 0.5


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


def _gamma_pdf(x: np.ndarray, shape: float, scale: float) -> np.ndarray:
    """Gamma density. Sampling distribution of an exponential mean is Gamma(n, 1/n)."""
    out = np.zeros_like(x, dtype=float)
    mask = x > 0
    xm = x[mask]
    log = (
        (shape - 1.0) * np.log(xm)
        - xm / scale
        - math.lgamma(shape)
        - shape * math.log(scale)
    )
    out[mask] = np.exp(log)
    return out


def _chi2_pdf(x: np.ndarray, df: float) -> np.ndarray:
    return _gamma_pdf(x, shape=df / 2.0, scale=2.0)


def _binomial_pmf(n: int, p: float) -> np.ndarray:
    """Exact binomial probabilities, multiplied forward so the terms stay finite."""
    if not 0.0 < p < 1.0:
        raise SystemExit(f"binomial p should sit between 0 and 1, got {p}")
    probs = np.empty(n + 1, dtype=float)
    probs[0] = (1.0 - p) ** n
    for k in range(n):
        probs[k + 1] = probs[k] * (n - k) / (k + 1) * p / (1.0 - p)
    return probs


def draw_normal() -> None:
    x = np.linspace(-4.2, 4.2, 600)
    y = _normal_pdf(x, 0.0, 1.0)
    peak = float(y.max())
    fig, ax = plt.subplots(figsize=(7.4, 4.6), constrained_layout=True)
    ax.fill_between(x, y, color="#f2f2f2", zorder=1)
    ax.plot(x, y, color="black", linewidth=1.7, zorder=2)
    ax.axvline(0.0, color="black", linestyle="dashed", linewidth=1.15, zorder=3)
    for xpos in (-1.0, 1.0):
        ax.axvline(xpos, color="black", linestyle=(0, (1.2, 1.2)), linewidth=1.15, zorder=3)
    _legend(
        ax,
        [
            Line2D([0], [0], color="black", linestyle="dashed", linewidth=1.15, label="μ = 0"),
            Line2D([0], [0], color="black", linestyle=(0, (1.2, 1.2)), linewidth=1.15, label="μ ± σ  =  ±1"),
        ],
        loc="upper right",
        title="standard normal",
    )
    ax.set_xlim(-4.2, 4.2)
    ax.set_xticks([-4, -2, 0, 2, 4])
    ax.set_ylim(0, 0.52)
    ax.set_yticks([0, 0.1, 0.2, 0.3, 0.4])
    ax.set_xlabel("x")
    ax.set_ylabel("density")
    ax.set_title("Center μ and spread σ fix the normal curve")
    _save(fig, "01-normal-density.png")
    print(f"  normal peak={peak:.4f}")


def draw_clt() -> None:
    # Exponential parent with mean 1 and sd 1. The mean of n draws is Gamma(n, scale=1/n).
    ns = (2, 8, 32)
    styles = [(0, (1.2, 1.2)), (0, (5, 2)), "solid"]
    x = np.linspace(0.001, 3.6, 900)
    curves = []
    for n in ns:
        y = _gamma_pdf(x, shape=float(n), scale=1.0 / n)
        curves.append(y)
        skew = 2.0 / math.sqrt(n)  # skewness of Gamma(shape=n)
        se = 1.0 / math.sqrt(n)
        print(f"  clt n={n} se={se:.4f} peak={float(y.max()):.3f} skew={skew:.3f}")
    if not (curves[0].max() < curves[1].max() < curves[2].max()):
        raise SystemExit("larger n should make the sampling curve taller")
    # n = 2 is visibly skewed (mode below the mean); n = 32 is nearly symmetric.
    mode_n2 = float(x[np.argmax(curves[0])])
    mode_n32 = float(x[np.argmax(curves[2])])
    if not (mode_n2 < 0.7 and abs(mode_n32 - 1.0) < 0.08):
        raise SystemExit(f"CLT modes unexpected: n2={mode_n2}, n32={mode_n32}")

    fig, ax = plt.subplots(figsize=(7.4, 4.7), constrained_layout=True)
    for y, style in zip(curves, styles):
        ax.plot(x, y, color="black", linestyle=style, linewidth=1.6, zorder=2)
    ax.axvline(1.0, color="black", linestyle="dashed", linewidth=1.0, zorder=1)
    handles = [
        Line2D([0], [0], color="black", linestyle=style, linewidth=1.6, label=f"n = {n}")
        for n, style in zip(ns, styles)
    ]
    handles.append(Line2D([0], [0], color="black", linestyle="dashed", linewidth=1.0, label="μ = 1"))
    _legend(ax, handles, loc="upper right", title="SE = 1 / √n")
    ax.set_xlim(0, 3.6)
    ax.set_xticks([0, 1, 2, 3])
    ax.set_ylim(0, 3.05)
    ax.set_yticks([0, 1, 2])
    ax.set_xlabel("sample mean")
    ax.set_ylabel("density")
    ax.set_title("Means from a skewed population settle toward a normal curve")
    _save(fig, "02-clt-sampling.png")


def draw_binomial() -> None:
    """Ten fair tosses, then the binomial probabilities of the head count.

    The sequence is five heads followed by five tails, so k = 5. The bars are
    Binomial(10, 1/2). The curve is N(μ, σ²) with μ = np = 5 and
    σ = √(np(1 − p)) = √2.5.
    """
    n = BINOMIAL_N
    p = BINOMIAL_P
    mu = n * p
    sigma = math.sqrt(n * p * (1.0 - p))
    probs = _binomial_pmf(n, p)
    if abs(float(probs.sum()) - 1.0) > 1e-9:
        raise SystemExit(f"binomial probabilities sum to {probs.sum()}")
    if int(np.argmax(probs)) != int(mu):
        raise SystemExit(f"binomial mode should be {mu}, got {int(np.argmax(probs))}")
    if abs(sigma - math.sqrt(2.5)) > 1e-9:
        raise SystemExit(f"sigma should be √2.5, got {sigma}")
    normal_peak = float(_normal_pdf(np.array([mu]), mu, sigma)[0])
    if abs(float(probs[int(mu)]) - normal_peak) / normal_peak > 0.05:
        raise SystemExit(
            f"normal curve should sit near the binomial peak: "
            f"P(X={int(mu)})={probs[int(mu)]:.4f} normal={normal_peak:.4f}"
        )

    # Five heads, then five tails. The count of heads is the mean.
    faces = ["H"] * (n // 2) + ["T"] * (n // 2)
    if faces.count("H") != int(mu):
        raise SystemExit("highlighted sequence should contain μ heads")

    fig, (ax_coins, ax_hist) = plt.subplots(
        1,
        2,
        figsize=(7.8, 4.9),
        constrained_layout=True,
        gridspec_kw={"width_ratios": [1.05, 1.22]},
    )

    coin_y = 0.42
    ax_coins.scatter(
        np.arange(n),
        np.full(n, coin_y),
        s=430,
        facecolors="white",
        edgecolors="black",
        linewidths=1.15,
        zorder=3,
    )
    for i, face in enumerate(faces):
        ax_coins.text(
            i,
            coin_y,
            face,
            ha="center",
            va="center",
            fontsize=11,
            color="black",
            zorder=4,
        )
    bracket_y = -0.22
    ax_coins.plot([0, n - 1], [bracket_y, bracket_y], color="black", linewidth=1.05, zorder=2)
    ax_coins.plot([0, 0], [bracket_y - 0.16, bracket_y + 0.16], color="black", linewidth=1.05, zorder=2)
    ax_coins.plot(
        [n - 1, n - 1],
        [bracket_y - 0.16, bracket_y + 0.16],
        color="black",
        linewidth=1.05,
        zorder=2,
    )
    ax_coins.text(
        (n - 1) / 2.0,
        -0.78,
        "X = 5 heads",
        ha="center",
        va="center",
        fontsize=12,
        color="black",
    )
    ax_coins.set_xlim(-0.85, n - 1 + 0.85)
    ax_coins.set_ylim(-1.55, 1.55)
    ax_coins.set_xticks([])
    ax_coins.set_yticks([])
    ax_coins.set_xlabel("five heads, then five tails")
    ax_coins.set_title("10 independent tosses")

    ks = np.arange(n + 1)
    ax_hist.bar(
        ks,
        probs,
        width=0.78,
        facecolor="white",
        edgecolor="black",
        linewidth=1.0,
        zorder=2,
    )
    xs = np.linspace(-0.35, n + 0.35, 500)
    ax_hist.plot(xs, _normal_pdf(xs, mu, sigma), color="black", linewidth=1.7, zorder=3)
    ax_hist.axvline(mu, color="black", linestyle="dashed", linewidth=1.15, zorder=1)
    for xpos in (mu - sigma, mu + sigma):
        ax_hist.axvline(xpos, color="black", linestyle=(0, (1.2, 1.2)), linewidth=1.15, zorder=1)
    _legend(
        ax_hist,
        [
            Rectangle((0, 0), 1, 1, facecolor="white", edgecolor="black", label="P(X = k)"),
            Line2D([0], [0], color="black", linewidth=1.7, label="normal curve"),
            Line2D([0], [0], color="black", linestyle="dashed", linewidth=1.15, label="μ = 5"),
            Line2D(
                [0],
                [0],
                color="black",
                linestyle=(0, (1.2, 1.2)),
                linewidth=1.15,
                label="μ ± σ",
            ),
        ],
        loc="upper right",
        title="n = 10,  p = 1/2",
    )
    ax_hist.set_xlim(-0.7, n + 0.7)
    ax_hist.set_xticks([0, 2, 4, 6, 8, 10])
    ax_hist.set_ylim(0, 0.40)
    ax_hist.set_yticks([0, 0.1, 0.2, 0.3])
    ax_hist.set_xlabel("number of heads,  k")
    ax_hist.set_ylabel("probability")
    ax_hist.set_title("Follows a binomial distribution")

    _save(fig, "03-binomial-bernoulli.png")
    print(
        f"  binomial n={n} p={p} mu={mu:.1f} sigma={sigma:.3f} "
        f"Pmax={float(probs[int(mu)]):.4f} normal_peak={normal_peak:.4f}"
    )


def draw_galton() -> None:
    """Peg board plus the binomial counts those bounces fill.

    One path takes six right bounces, then six left bounces, so it ends in
    bin 6. The bars are Binomial(12, 1/2). The curve is N(μ, σ²) with
    μ = np = 6 and σ = √(np(1 − p)) = √3.
    """
    n = GALTON_ROWS
    p = GALTON_P
    mu = n * p
    sigma = math.sqrt(n * p * (1.0 - p))
    probs = _binomial_pmf(n, p)
    if abs(float(probs.sum()) - 1.0) > 1e-9:
        raise SystemExit(f"binomial probabilities sum to {probs.sum()}")
    if int(np.argmax(probs)) != int(mu):
        raise SystemExit(f"binomial mode should be {mu}, got {int(np.argmax(probs))}")
    normal_peak = float(_normal_pdf(np.array([mu]), mu, sigma)[0])
    if abs(float(probs[int(mu)]) - normal_peak) / normal_peak > 0.05:
        raise SystemExit(
            f"normal curve should sit near the binomial peak: "
            f"P(X={int(mu)})={probs[int(mu)]:.4f} normal={normal_peak:.4f}"
        )

    # Six right bounces, then six left. The bin is the right-bounce count.
    rights = [1] * (n // 2) + [0] * (n // 2)
    if sum(rights) != int(mu):
        raise SystemExit("highlighted path should end on the mean bin")
    peg_x: list[float] = []
    peg_y: list[float] = []
    for row in range(n):
        for col in range(row + 1):
            peg_x.append(col - row / 2.0 + n / 2.0)
            peg_y.append(float(n - row))

    path_x: list[float] = []
    path_y: list[float] = []
    col = 0
    for row, go_right in enumerate(rights):
        path_x.append(col - row / 2.0 + n / 2.0)
        path_y.append(float(n - row))
        col += go_right
    if col != int(mu):
        raise SystemExit(f"path ended in bin {col}, expected {int(mu)}")
    path_x.append(float(col))
    path_y.append(0.42)

    fig, (ax_board, ax_hist) = plt.subplots(
        1,
        2,
        figsize=(7.8, 4.9),
        constrained_layout=True,
        gridspec_kw={"width_ratios": [1.05, 1.22]},
    )

    for row in range(n - 1):
        for col_i in range(row + 1):
            x0 = col_i - row / 2.0 + n / 2.0
            y0 = float(n - row)
            for step in (0, 1):
                x1 = (col_i + step) - (row + 1) / 2.0 + n / 2.0
                y1 = float(n - (row + 1))
                ax_board.plot(
                    [x0, x1],
                    [y0, y1],
                    color="black",
                    linewidth=0.55,
                    solid_capstyle="round",
                    zorder=1,
                )
    ax_board.plot(path_x, path_y, color="black", linewidth=1.7, solid_capstyle="round", zorder=3)
    ax_board.scatter(peg_x, peg_y, s=9, c="black", linewidths=0, zorder=2)
    ax_board.scatter(
        [path_x[0], path_x[-1]],
        [path_y[0] + 0.62, path_y[-1]],
        s=36,
        facecolors="white",
        edgecolors="black",
        linewidths=1.15,
        zorder=4,
    )
    # Drop the opening segment from the top bead onto the first peg.
    ax_board.plot(
        [path_x[0], path_x[0]],
        [path_y[0] + 0.62, path_y[0]],
        color="black",
        linewidth=1.7,
        solid_capstyle="round",
        zorder=3,
    )
    _legend(
        ax_board,
        [Line2D([0], [0], color="black", linewidth=1.7, label="one bead")],
        loc="upper left",
    )
    ax_board.set_xlim(-0.85, n + 0.85)
    ax_board.set_ylim(-0.35, n + 1.55)
    ax_board.set_xticks([0, 6, 12])
    ax_board.set_yticks([])
    ax_board.set_xlabel("bin  k")
    ax_board.set_title("12 rows of pegs")

    ks = np.arange(n + 1)
    ax_hist.bar(
        ks,
        probs,
        width=0.78,
        facecolor="white",
        edgecolor="black",
        linewidth=1.0,
        zorder=2,
    )
    xs = np.linspace(-0.2, n + 0.2, 500)
    ax_hist.plot(xs, _normal_pdf(xs, mu, sigma), color="black", linewidth=1.7, zorder=3)
    ax_hist.axvline(mu, color="black", linestyle="dashed", linewidth=1.15, zorder=1)
    for xpos in (mu - sigma, mu + sigma):
        ax_hist.axvline(xpos, color="black", linestyle=(0, (1.2, 1.2)), linewidth=1.15, zorder=1)
    _legend(
        ax_hist,
        [
            Rectangle((0, 0), 1, 1, facecolor="white", edgecolor="black", label="binomial counts"),
            Line2D([0], [0], color="black", linewidth=1.7, label="normal curve"),
            Line2D([0], [0], color="black", linestyle="dashed", linewidth=1.15, label="μ = 6"),
            Line2D(
                [0],
                [0],
                color="black",
                linestyle=(0, (1.2, 1.2)),
                linewidth=1.15,
                label="μ ± σ",
            ),
        ],
        loc="upper right",
        title="n = 12,  p = 1/2",
    )
    ax_hist.set_xlim(-0.85, n + 0.85)
    ax_hist.set_xticks([0, 2, 4, 6, 8, 10, 12])
    ax_hist.set_ylim(0, 0.40)
    ax_hist.set_yticks([0, 0.1, 0.2, 0.3])
    ax_hist.set_xlabel("right bounces,  k")
    ax_hist.set_ylabel("probability")
    ax_hist.set_title("Those counts pile into a bell")

    for text in fig.findobj(match=plt.Text):
        lowered = text.get_text().lower()
        if "clt" in lowered or "central limit" in lowered:
            raise SystemExit(f"Galton figure must not say CLT: {text.get_text()!r}")

    _save(fig, "04-galton-board.png")
    print(
        f"  galton n={n} p={p} mu={mu:.1f} sigma={sigma:.3f} "
        f"Pmax={float(probs[int(mu)]):.4f} normal_peak={normal_peak:.4f}"
    )


def draw_horowitz() -> None:
    rng = np.random.default_rng(HOROWITZ_SEED)
    samples = rng.normal(HOROWITZ_MEAN, HOROWITZ_SD, size=(HOROWITZ_STUDENTS, HOROWITZ_N))
    means = samples.mean(axis=1)
    mean_of_means = float(means.mean())
    emp_se = float(means.std(ddof=1))
    theory_se = HOROWITZ_SD / math.sqrt(HOROWITZ_N)
    if abs(theory_se - 5.0) > 0.01:
        raise SystemExit(f"theoretical SE should be about 5, got {theory_se}")
    if abs(mean_of_means - HOROWITZ_MEAN) > 0.8 or abs(emp_se - theory_se) > 0.7:
        raise SystemExit(
            f"Horowitz sample is a poor classroom draw: mean={mean_of_means:.3f} se={emp_se:.3f}"
        )

    bin_width = 2.0
    bins = np.arange(34.0, 66.0 + bin_width, bin_width)
    fig, ax = plt.subplots(figsize=(7.4, 4.7), constrained_layout=True)
    ax.hist(
        means,
        bins=bins,
        facecolor="white",
        edgecolor="black",
        linewidth=1.0,
        zorder=2,
    )
    xs = np.linspace(bins[0], bins[-1], 400)
    curve = _normal_pdf(xs, HOROWITZ_MEAN, theory_se) * HOROWITZ_STUDENTS * bin_width
    ax.plot(xs, curve, color="black", linewidth=1.7, zorder=3)
    _legend(
        ax,
        [
            Rectangle((0, 0), 1, 1, facecolor="white", edgecolor="black", label="96 sample means"),
            Line2D([0], [0], color="black", linewidth=1.7, label="N(50,  5²)"),
        ],
        loc="upper right",
    )
    ax.set_xlim(34, 66)
    ax.set_xlabel("sample mean")
    ax.set_ylabel("count")
    ax.set_title("Classroom draws: n = 10 from N(50, 15.8)")
    _save(fig, "05-horowitz-clt.png")
    print(
        f"  horowitz mean_of_means={mean_of_means:.3f} emp_se={emp_se:.3f} theory_se={theory_se:.3f}"
    )


def draw_chi_square() -> None:
    dfs = (1, 3, 5)
    styles = [(0, (1.2, 1.2)), (0, (5, 2)), "solid"]
    x = np.linspace(0.02, 16.0, 900)
    curves = [_chi2_pdf(x, float(df)) for df in dfs]
    # df = 1 diverges at 0; df = 3 and 5 have finite modes at df − 2.
    mode3 = float(x[np.argmax(np.where(x > 0.2, curves[1], 0.0))])
    mode5 = float(x[np.argmax(curves[2])])
    if not (abs(mode3 - 1.0) < 0.15 and abs(mode5 - 3.0) < 0.2):
        raise SystemExit(f"chi-square modes unexpected: df3={mode3}, df5={mode5}")
    if not (curves[1].max() > curves[2].max()):
        raise SystemExit("df = 3 should peak higher than df = 5")

    fig, ax = plt.subplots(figsize=(7.4, 4.7), constrained_layout=True)
    for y, style in zip(curves, styles):
        ax.plot(x, y, color="black", linestyle=style, linewidth=1.6, zorder=2)
    handles = [
        Line2D([0], [0], color="black", linestyle=style, linewidth=1.6, label=f"df = {df}")
        for df, style in zip(dfs, styles)
    ]
    _legend(ax, handles, loc="upper right", title="df = 1 spikes at 0")
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 0.48)
    ax.set_xlabel("value")
    ax.set_ylabel("density")
    ax.set_title("Chi-square: a sum of squared standard normals")
    _save(fig, "06-chi-square.png")
    print(f"  chi2 mode df3={mode3:.3f} df5={mode5:.3f} peak3={curves[1].max():.3f}")


def draw_intervals() -> None:
    hits = np.linspace(-1.55, 1.55, 19)
    miss = np.array([2.55])
    centers = np.concatenate([hits, miss])
    order = np.argsort(centers)
    centers = centers[order]
    covers = np.abs(centers) <= CI_HALF
    if int(covers.sum()) != 19 or int((~covers).sum()) != 1:
        raise SystemExit(f"expected 19 hits and 1 miss, got {int(covers.sum())} hits")

    fig, ax = plt.subplots(figsize=(7.4, 5.4), constrained_layout=True)
    ax.axvline(0.0, color="black", linestyle="dashed", linewidth=1.25, zorder=1)
    for i, (center, cover) in enumerate(zip(centers, covers)):
        y = i
        style = "solid" if cover else (0, (1.4, 1.1))
        width = 1.15 if cover else 1.7
        x0, x1 = center - CI_HALF, center + CI_HALF
        ax.plot([x0, x1], [y, y], color="black", linestyle=style, linewidth=width, zorder=2)
        cap = 0.28
        ax.plot([x0, x0], [y - cap, y + cap], color="black", linewidth=width, zorder=2)
        ax.plot([x1, x1], [y - cap, y + cap], color="black", linewidth=width, zorder=2)
        ax.scatter([center], [y], s=12, c="black", zorder=3)

    _legend(
        ax,
        [
            Line2D([0], [0], color="black", linestyle="dashed", linewidth=1.25, label="true value"),
            Line2D([0], [0], color="black", linestyle="solid", linewidth=1.15, label="covers  (19)"),
            Line2D([0], [0], color="black", linestyle=(0, (1.4, 1.1)), linewidth=1.7, label="misses  (1)"),
        ],
        loc="upper left",
    )
    miss_y = int(np.flatnonzero(~covers)[0])
    ax.text(4.65, miss_y, "miss", ha="left", va="center", fontsize=12)
    ax.set_xlim(-4.3, 5.7)
    ax.set_xticks([-4, -2, 0, 2, 4])
    ax.set_ylim(-1.1, 20.6)
    ax.set_yticks([])
    ax.set_xlabel("interval  =  estimate  ±  1.96 · SE")
    ax.set_title("Nineteen of these twenty shots cover the true value")
    _save(fig, "07-confidence-intervals.png")
    print(f"  ci hits={int(covers.sum())} half-width={CI_HALF:.2f}")


def main() -> None:
    _style()
    draw_normal()
    draw_clt()
    draw_binomial()
    draw_galton()
    draw_horowitz()
    draw_chi_square()
    draw_intervals()
    # Step order is normal, CLT, binomial, Galton, Horowitz, chi-square, intervals.
    for name in (
        "03-horowitz-clt.png",
        "03-galton-board.png",
        "04-chi-square.png",
        "04-horowitz-clt.png",
        "05-confidence-intervals.png",
        "05-chi-square.png",
        "06-confidence-intervals.png",
    ):
        stale = OUT / name
        if stale.exists():
            stale.unlink()
            print(f"removed {name}")


if __name__ == "__main__":
    main()

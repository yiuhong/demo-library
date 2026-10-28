# Describing-data figures

These PNGs are drawn by `generate_figures.py` with Matplotlib. They are black-on-white diagrams. Regenerate them from the repo root with `python3 tracks/images/describing-data/generate_figures.py` (NumPy and Matplotlib).

## Skew formula

The track writes skew the way `statistics/moments_as_averages.html` does: the standardized third moment

`skew = (1/n) Σ ((xᵢ − x̄) / σ)³`, with `σ² = Σ (xᵢ − x̄)² / n`.

Step 2 defines `m₃` as that average of cubes, so this is `m₃ / σ³`. It is not `(m₃ / n) / s³`, which would divide by `n` a second time, and it does not use Bessel’s divisor `n − 1`. The skewed-distribution demonstration changes a skew-normal shape parameter; it does not show a different sample-skewness formula.

## Quartiles, fences, and the Q–Q plot

The boxplot figures follow `statistics/boxplot_outliers.html`. Sort the values, take the median, then the median of each half. When the count is odd, the middle value is left out of both halves. `IQR = Q₃ − Q₁`. The fences are `Q₁ − 1.5 × IQR` and `Q₃ + 1.5 × IQR`. Whiskers stop at the last values still inside the fences.

The Q–Q figure uses the same plotting position as `statistics/q_q_plot.html`: the normal quantile at `(i − 0.5) / n` for each ordered value, with the reference line `y = x`.

## Kernel density

The KDE figure uses the same 44 integers as the histogram. The curve is a Gaussian kernel density estimate,

`f̂(x) = (1/(n h)) Σ K((x − xᵢ) / h)`,

with `K` the standard normal density. The bandwidth is Silverman’s rule, `h = 0.9 × min(s, IQR/1.34) × n^(−1/5)`, rounded to two decimals. `s` is the sample standard deviation. The bars are densities with width 1, so a bar’s height is its count divided by `n`.

## Samples

1. Dot plot: the positive-skew preset in `statistics/mean_mode_median_dot_plot.html` (mode 5, median 6, mean 6.94).
2. Moments: the values 1, 2, 3, 4, 5, 9 (`m₁ = 4`, `m₂ = 6.67`, `m₃ = 15`).
3. Bessel: 8000 samples of size 10 from a normal population with mean 50 and variance 100, as in the demonstration’s population spread.
4. Density: lognormal with `μ = 0` and `σ = 0.85` on the natural-log scale (mode 0.49, median 1, mean 1.44).
5. Histogram and box: 44 integer values, peak at 5, quartiles 5, 6, and 8, whiskers from 3 to 12, no points outside the fences.
6. Fences: 12, 16, 20, 24, 28, 30, 32, 36, 40, 44, 80. Quartiles 20, 30, 40; fences −10 and 70; the only outlier is 80.
7. Kernel density: those same 44 values, with a Gaussian kernel at the Silverman bandwidth.
8. Q–Q: 40 standard normal draws (NumPy seed 24).

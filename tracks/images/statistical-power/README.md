# Statistical-power figures

These PNGs are drawn by `generate_figures.py` with Matplotlib. They are black-on-white diagrams. Regenerate them from the repo root with `python3 tracks/images/statistical-power/generate_figures.py` (NumPy, SciPy, and Matplotlib).

## Null, alternative, and power

The region figure uses the opening state of `statistics/statistical_power.html`: one-tailed, `α = 0.05`, null mean 0, alternative mean 2, `σ = 5`, `n = 30`. The standard error is `σ / √n ≈ 0.913`. The cutoff is `0 + z_{0.95} × SE ≈ 1.50`. The shaded region is the alternative curve to the right of that cutoff, and its area is the power, about 71%. The `α = 5%` slice is the same cutoff read under the null.

## Power against sample size

`statistics/power_curve.html` plots power against total sample size for a two-sided, equal-variance, independent-samples t test. The figure uses that page’s opening choices: Cohen’s `d = 0.50`, allocation ratio 1, `α = 0.05`, and target power 0.80.

The curve is the same shifted central-t calculation as the demonstration. With `df = N − 2` and `λ = d √(N / 4)` for equal groups,

`power = 1 − F(t_{α/2} − λ) + F(−t_{α/2} − λ)`,

where `F` is the central t distribution function. The marked point is the smallest total `N` at which that power is at least 0.80, which is `N = 128` (power about 0.801; at 127 it is about 0.798).

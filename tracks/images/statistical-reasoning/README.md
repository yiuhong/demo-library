# Statistical-reasoning figures

These PNGs are drawn by `generate_figures.py` with Matplotlib. They are black-on-white diagrams. Regenerate them from the repo root with `python3 tracks/images/statistical-reasoning/generate_figures.py` (NumPy and Matplotlib).

## Normal curve

The density is the final formula in `statistics/building_normal_distribution.html`:

`f(x) = (1 / (σ√(2π))) exp(−(x − μ)² / (2σ²))`.

The figure is the standard normal, `μ = 0` and `σ = 1`.

## Sampling distributions

The central-limit figure uses an exponential population with mean 1 and standard deviation 1. The mean of `n` draws then follows a gamma distribution with shape `n` and scale `1/n`. The curves are `n = 2`, `n = 8`, and `n = 32`. The standard error is `σ / √n`, the formula in `statistics/central_limit_theorem.html`.

The Horowitz figure follows `statistics/horowitz_1974_simulation_CLT.html`: 96 sample means, each of size 10, from a normal population with mean 50 and standard deviation 15.8. The overlay is `N(50, 5²)`, because `15.8 / √10 ≈ 5`. NumPy seed 1974. In that draw the mean of the means is about 50.2 and the standard deviation of the means is about 4.9.

## Chi-square

`ν` is the degrees of freedom. The demonstration writes the same sum as `χ²_k = Σ Zᵢ²` and calls the count `k`. The curves are `ν = 1`, `3`, and `5`. The `ν = 1` density is unbounded at 0, so the axes cut it off.

## Confidence intervals

`statistics/target_analogy_confidence_intervals.html` treats `σ` as known. The margin is `z × SE` with `SE = σ / √n`, not a `t*` critical value. The buttons use `z = 1`, `1.96`, and `3`. The figure uses `z* = 1.96` and draws `SE = 1`, so every interval has half-width 1.96. Nineteen centers fall inside that half-width and one is placed outside. It is a schematic of the long-run 95% hit rate, not one random run of the demonstration.

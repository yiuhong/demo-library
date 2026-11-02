# Statistical-reasoning figures

These PNGs are drawn by `generate_figures.py` with Matplotlib. They are black-on-white diagrams. Regenerate them from the repo root with `python3 tracks/images/statistical-reasoning/generate_figures.py` (NumPy and Matplotlib).

## Conceptual hierarchy

`statistics/stats_conceptual_hierarchy.html` opens on the random-walk mode, before any trial. Level 0 fixes `N = 50` steps and an up-step probability `p = 0.50`, so `μ = N(2p − 1) = 0` and `σ² = 4Np(1 − p) = 50`. Level 2 reads the end position as `X = 2K − N`. Level 1 is an empty position plot with a dashed line at 0. Level 3 draws the theoretical law from that page: the normal density times the lattice spacing `Δx = 2`, so the curve is about `P(X = x)` on the even positions. Dotted lines mark `μ ± σ`, and `σ = √50`. Level 4 has sample size `M = 0`.

## Distributions map

`statistics/probability_distributions_map.html` places sixteen distributions in five neighborhoods. The figure keeps those neighborhoods and the three link kinds: a solid arrow is a special case, a dashed arrow is a limit, and a dotted arrow is a transform or a sum. Hatching distinguishes the neighborhoods. Normal is the selected node. The side panel is the opening normal, `μ = 0` and `σ = 1`.

## Poisson point process

`statistics/poisson_point_process.html` opens on raindrops, `λ = 6` per second over a window `t = 1`, so `μ = λt = 6`. The target count is `k = 6`. One window is an exponential-gap draw with NumPy seed 38: arrivals at about 0.15, 0.35, 0.48, and 0.68 seconds, four drops. The bars are Poisson(6). For an integer mean the masses at 5 and 6 are equal and are the mode; the bar at 6 is hatched because it is the target. The curve is Binomial(20, 0.3), the page's opening overlay `Binomial(n, μ/n)` with `n = 20` sub-intervals.

## Normal curve

The density is the final formula in `statistics/building_normal_distribution.html`:

`f(x) = (1 / (σ√(2π))) exp(−(x − μ)² / (2σ²))`.

The figure is the standard normal, `μ = 0` and `σ = 1`.

## Sampling distributions

The central-limit figure uses an exponential population with mean 1 and standard deviation 1. The mean of `n` draws then follows a gamma distribution with shape `n` and scale `1/n`. The curves are `n = 2`, `n = 8`, and `n = 32`. The standard error is `σ / √n`, the formula in `statistics/central_limit_theorem.html`.

The Horowitz figure follows `statistics/horowitz_1974_simulation_CLT.html`: 96 sample means, each of size 10, from a normal population with mean 50 and standard deviation 15.8. The overlay is `N(50, 5²)`, because `15.8 / √10 ≈ 5`. NumPy seed 1974. In that draw the mean of the means is about 50.2 and the standard deviation of the means is about 4.9.

## Bernoulli trials and the binomial count

`statistics/binomial_bernoulli.html` opens at `n = 10` coins and `p = 1/2`. Each coin is a Bernoulli trial. The count of heads is Binomial(10, 1/2), with `μ = np = 5` and `σ = √(np(1 − p)) = √2.5 ≈ 1.58`. The left panel is one sequence: five heads, then five tails, so that count is 5. The bars are those exact probabilities. The curve is the normal density with that mean and standard deviation. A dashed line marks `μ` and dotted lines mark `μ ± σ`.

## Galton board

`statistics/galton_board.html` sends each bead through `n` rows of pegs. The bin is the count of right bounces. The demonstration opens at `n = 12` and `p = 1/2`, so that count is Binomial(12, 1/2), with `μ = np = 6` and `σ = √(np(1 − p)) = √3 ≈ 1.73`. The bars are those exact probabilities. The curve is the normal density with that mean and standard deviation. The highlighted path is six right bounces, then six left bounces, and it ends in bin 6.

## Chi-square

`ν` is the degrees of freedom. The demonstration writes the same sum as `χ²_k = Σ Zᵢ²` and calls the count `k`. The curves are `ν = 1`, `3`, and `5`. The `ν = 1` density is unbounded at 0, so the axes cut it off.

## Confidence intervals

`statistics/target_analogy_confidence_intervals.html` treats `σ` as known. The margin is `z × SE` with `SE = σ / √n`, not a `t*` critical value. The buttons use `z = 1`, `1.96`, and `3`. The figure uses `z* = 1.96` and draws `SE = 1`, so every interval has half-width 1.96. Nineteen centers fall inside that half-width and one is placed outside. It is a schematic of the long-run 95% hit rate, not one random run of the demonstration.

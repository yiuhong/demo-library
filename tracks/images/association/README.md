# Association figures

These PNGs are drawn by `generate_figures.py` with Matplotlib. They are black-on-white diagrams. Regenerate them from the repo root with `python3 tracks/images/association/generate_figures.py` (NumPy and Matplotlib).

## Covariance and correlation

`statistics/covariance_and_correlation.html` uses the sample divisor `n − 1`, not `n`:

`cov(X, Y) = Σ (xᵢ − x̄)(yᵢ − ȳ) / (n − 1)`, and `r = cov(X, Y) / (s_x s_y)`.

`s_x` and `s_y` use that same divisor. The scatter is 36 points, NumPy seed 8: `y = 0.85x` plus normal noise with standard deviation 0.55. For this cloud, `r = 0.81`. Correlation has no units; covariance is still in the product of the two variables’ units.

## Variance explained

On the same cloud, `R² = r² = SS_line / SS_total = 0.66`. `SS_line` is the sum of squared distances from the fitted values to the mean of y, and `SS_total` is the sum of squared distances from y to its mean. That is the straight-line share shown in `statistics/variance_explained.html`. The bar rounds the two shares to 66 percent and 34 percent.

## Adding variances

`statistics/additivity_of_variance.html` writes

`Var(X + Y) = σ_X² + σ_Y² + 2ρ σ_X σ_Y`.

The page opens at `σ_X² = 1`, `σ_Y² = 1`, and `ρ = 0`, so the covariance term is 0 and `Var(X + Y) = 2`. The figure is that case. When X and Y are independent, `Cov(X, Y) = 0` and the variances add.

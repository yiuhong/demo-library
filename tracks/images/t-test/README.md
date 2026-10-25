# t-test figures

These PNGs are drawn by `generate_figures.py` with Matplotlib. They are black-on-white diagrams. Regenerate them from the repo root with `python3 tracks/images/t-test/generate_figures.py` (NumPy and Matplotlib).

## z and t

`statistics/z_distribution_vs_t_distribution.html` compares

`z = (X̄ − μ) / (σ / √n)` with `t = (X̄ − μ) / (s / √n)`.

The t curve in the figure has `df = n − 1 = 4`. At 3, the t density is about 0.020 and the standard normal density is about 0.004.

## Independent samples

The demonstration opens on Student’s t test (`useWelch` is false) and can be switched to Welch. The track formula is the pooled standard error it shows first:

`SE = √(s_p² (1/n₁ + 1/n₂))`, with `s_p² = ((n₁ − 1) s₁² + (n₂ − 1) s₂²) / (n₁ + n₂ − 2)`.

Welch’s form, `√(s₁²/n₁ + s₂²/n₂)`, is the other option in that demonstration. The figure is the equal-spread case: eight scores in each group, means 50 and 62, and the same within-group sample standard deviation `s = √24 ≈ 4.90`. For these numbers the pooled standard error is `√6 ≈ 2.45` and `df = 14`.

## Paired samples

`statistics/paired_t_test_simulation.html` defines `D = post − pre` and, when the null mean difference is 0,

`t = d̄ / (s_D / √n)`.

`s_D` divides by `n − 1`. The figure uses eight pairs whose differences are 8, 2, 7, 1, 9, 0, 6, and 7. Their mean is 5, close to the demonstration’s population mean difference of 5, and `s_d = √12 ≈ 3.46`.

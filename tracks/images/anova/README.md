# ANOVA figures

These PNGs are drawn by `generate_figures.py` with Matplotlib. They are black-on-white diagrams. Regenerate them from the repo root with `python3 tracks/images/anova/generate_figures.py` (NumPy and Matplotlib).

## Two means and three

Both panels use one within-group pattern: the same seven z-scores scaled by a standard deviation of 8. The two-group means are 40 and 60, the opening means in `statistics/t_test_to_anova.html`. The three-group means are 30, 50, and 70.

For any two groups, the squared Student’s t equals the ANOVA F. On this two-group sketch that common value is about 33.46.

## Sums of squares

The bar uses the opening scores in `statistics/partitioning_sum_of_squares_anova.html`:

- group A: 70, 80, 90
- group B: 50, 60, 70
- group C: 90, 100, 110

`SS_between = 2400`, `SS_within = 600`, and `SS_total = 3000`. With `df_between = 2` and `df_within = 6`, `MS_between = 1200`, `MS_within = 100`, and `F = 12`.

## Two-way cell means

The parallel panel is the opening cell means in `statistics/two_way_anova.html`: female 38 and 48, male 46 and 56. Male is 8 above female in both groups, and group 2 is 10 above group 1 for both genders, so the lines are parallel and the interaction sum of squares is 0.

The crossing panel keeps the same scale and swaps the pattern: female 38 and 56, male 56 and 38.

## Repeated-measures ANOVA (k = 3)

`05-rm-anova.png` is a screenshot of `statistics/repeated_measures_anova.html` in its opening state (cross-timepoint correlation +0.90, subject S₁ isolated). It is not drawn by `generate_figures.py`.

## Residuals and spread

The right-hand groups are 12 scores each, drawn with NumPy seed 19, population means 20, 32, and 44, and a common population standard deviation of 4. In this draw the sample means are about 20.2, 32.2, and 41.6, and the sample standard deviations are about 3.0, 3.9, and 3.0.

The Q–Q panel is those groups’ residuals after subtracting each group mean, then divided by the pooled residual standard deviation. Theoretical quantiles use the plotting position `(i − 0.5) / n`, as in `statistics/q_q_plot.html`. Independence of observations is one of the three conditions and is not a feature of this picture.

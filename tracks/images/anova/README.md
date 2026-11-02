# ANOVA figures

These PNGs are drawn by `generate_figures.py` with Matplotlib. They are black-on-white diagrams. Regenerate them from the repo root with `python3 tracks/images/anova/generate_figures.py` (NumPy and Matplotlib).

## Two means and three

Both panels use one within-group pattern: the same seven z-scores scaled by a standard deviation of 8. The two-group means are 40 and 60, the opening means in `statistics/t_test_to_anova.html`. The three-group means are 30, 50, and 70.

For any two groups, the squared Student’s t equals the ANOVA F. On this two-group sketch that common value is about 33.46.

## Sums of squares

`02-sum-of-squares.png` is the opening bar on `statistics/partitioning_sum_of_squares_anova.html`: between-subjects, one factor, symmetric view, `a = 3` groups and `n = 10` scores in each. The bar is proportional to degrees of freedom, not to a numeric sum of squares. `df_A = a − 1 = 2` and `df` for subjects within A is `a(n − 1) = 27`. The script still checks the older three-group identity `SS_between + SS_within = SS_total` (2400 + 600 = 3000, `F = 12`) and does not draw those scores.

## Mixed ANOVA

`03b-mixed-anova.png` is lens 2 of `statistics/mixed_anova_2x2.html` on preset 1, the baseline noise trap. The grand mean is 50, the group effect is 4, the time effect is 6, and the interaction is 9, with between-subject spread 13.5 and within-subject spread 1.8. Five subjects per group use the page's orthogonal scores. Group A runs from 47.25 to 48.75 and group B from 46.75 to 57.25. The sums of squares are group 80, between-subjects error 2916, time 180, interaction 101.25, and within-subjects error 51.84. The F ratios are about 0.22, 27.78, and 15.62.

## Two-way cell means

The parallel panel is the opening cell means in `statistics/two_way_anova.html`: female 38 and 48, male 46 and 56. Male is 8 above female in both groups, and group 2 is 10 above group 1 for both genders, so the lines are parallel and the interaction sum of squares is 0.

The crossing panel keeps the same scale and swaps the pattern: female 38 and 56, male 56 and 38.

## Residuals and spread

The right-hand groups are 12 scores each, drawn with NumPy seed 19, population means 20, 32, and 44, and a common population standard deviation of 4. In this draw the sample means are about 20.2, 32.2, and 41.6, and the sample standard deviations are about 3.0, 3.9, and 3.0.

The Q–Q panel is those groups’ residuals after subtracting each group mean, then divided by the pooled residual standard deviation. Theoretical quantiles use the plotting position `(i − 0.5) / n`, as in `statistics/q_q_plot.html`. Independence of observations is one of the three conditions and is not a feature of this picture.

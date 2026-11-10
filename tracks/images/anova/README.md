# ANOVA figures

These PNGs are drawn by `generate_figures.py` with Matplotlib. They are black-on-white diagrams. Regenerate them from the repo root with `python3 tracks/images/anova/generate_figures.py` (NumPy and Matplotlib).

## Two means and three

Both panels use one within-group pattern: the same seven z-scores scaled by a standard deviation of 8. The two-group means are 40 and 60, the opening means in `statistics/t_test_to_anova.html`. The three-group means are 30, 50, and 70.

For any two groups, the squared Student’s t equals the ANOVA F. On this two-group sketch that common value is about 33.46.

## Paired t and repeated measures

`01b-paired-t-to-rm-anova.png` uses the k = 2 margins in `statistics/paired_t_to_rm_anova.html`: six people, timepoint means 10 and 14, and a within-time standard deviation of 4.5. Both panels draw the same six heights at pre and the same six heights at post. Only the pairing changes. The deviations from each timepoint mean, low to high, are −5.9276316101, −3.5773703665, −1.5791448239, 1.6028356914, 3.4551218223, and 6.0261892868. They sum to 0 and their sum of squares is 101.25, so the sample standard deviation is 4.5 and within-conditions is 202.5 in both panels.

The left pairing reads those deviations in the order 3rd, 5th, 1st, 6th, 4th, 2nd, and the correlation is 0. The right pairing follows the low-to-high order and swaps only the 3rd and 4th, and the correlation is 0.90. Those are the page’s zero and high-positive presets. The page’s three-timepoint generator only approximates a pairwise correlation, so these two pairings are built to hit 0 and 0.90 exactly.

Then `s_D² = 2 s² (1 − r)`. At r = 0, `s_D² = 40.5` and subjects and residual are 101.25 each. At r = 0.90, `s_D² = 4.05`, subjects is 192.375, and residual is 10.125. The bars are proportional to those sums of squares. Four of the six right-hand changes equal 4, the gap between the timepoint means, and the other two cross. The time sum of squares stays 48, so the paired F and the independent F are both about 2.370 at r = 0. At r = 0.90 the paired F is about 23.704 and the independent F stays about 2.370. For k = 2, `t²` equals the paired F.

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

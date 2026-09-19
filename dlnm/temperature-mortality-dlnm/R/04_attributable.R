# =============================================================================
# 04_attributable.R - how many deaths does non-optimal temperature account for?
#
# Backward-perspective attributable fraction (Gasparrini & Leone 2014), from the
# time-series model, relative to the MMT, split into components:
#   total | cold (< MMT) | heat (> MMT) | extreme cold | extreme heat
# "Extreme" = beyond the 2.5th / 97.5th temperature percentiles; "moderate" is
# the remainder of each side. Empirical 95% CIs from 1,000 Monte Carlo draws.
# =============================================================================

source("R/00_config.R"); source("R/00_functions.R"); check_wd()

dat <- read_out("dat")
ts  <- read_out("fit_timeseries")
x   <- dat[[spec$exposure]]
mmt <- ts$mmt$mmt
ext <- quantile(x, spec$extreme_p)

ranges <- list(
  "Total (all non-optimal temperature)" = NULL,
  "Cold (below MMT)"                    = c(min(x), mmt),
  "Heat (above MMT)"                    = c(mmt, max(x)),
  "Extreme cold (below 2.5th pct)"      = c(min(x), ext[[1]]),
  "Moderate cold"                       = c(ext[[1]], mmt),
  "Moderate heat"                       = c(mmt, ext[[2]]),
  "Extreme heat (above 97.5th pct)"     = c(ext[[2]], max(x))
)

af <- do.call(rbind, lapply(names(ranges), function(nm) {
  cbind(component = nm,
        attr_burden(x, ts$cb, dat$death, ts$par$coef, ts$par$vcov, cen = mmt,
                    range = ranges[[nm]], n_sim = spec$n_sim, seed = spec$seed))
}))

af_print <- data.frame(
  component = af$component,
  attributable_fraction_pct = fmt_ci(af$af, af$af_lo, af$af_hi),
  attributable_deaths = sprintf("%s (%s, %s)",
                                trimws(format(round(af$an),    big.mark = ",")),
                                trimws(format(round(af$an_lo), big.mark = ",")),
                                trimws(format(round(af$an_hi), big.mark = ",")))
)

write.csv(af_print, "outputs/tables/table4_attributable.csv", row.names = FALSE)
save_out(list(af = af, af_print = af_print, mmt = mmt, extreme = ext), "attributable")
print(af_print)

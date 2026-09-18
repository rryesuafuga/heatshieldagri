# =============================================================================
# 03_casecrossover.R - same question, different design.
#
# Time-stratified case-crossover, fitted as a conditional (quasi-)Poisson model
# (Armstrong, Gasparrini & Tobias, BMC Med Res Methodol 2014). Each death is
# compared with days in the same year, month and day of week, so season, trend
# and weekday are controlled by design instead of by a spline of time.
# The identical cross-basis is used, so any difference from script 02 is due to
# the design, not to the exposure model.
# =============================================================================

source("R/00_config.R"); source("R/00_functions.R"); check_wd()
suppressPackageStartupMessages(library(gnm))

dat <- read_out("dat")
ts  <- read_out("fit_timeseries")
cb_temp <- ts$cb
x <- dat[[spec$exposure]]

m_cc <- gnm(death ~ cb_temp, eliminate = stratum,
            family = quasipoisson(), data = dat)

par_cc <- get_cb_par(m_cc, "cb_temp", cb_temp)
mmt_cc <- find_mmt(cb_temp, par_cc$coef, par_cc$vcov, x,
                   search_p = spec$mmt_search_p, n_sim = spec$n_sim, seed = spec$seed)

# Centre at the *time-series* MMT so the two curves share one reference.
pred_cc <- crosspred(cb_temp, m_cc, cen = ts$mmt$mmt, by = 0.1)

at   <- ts$rr$temperature
p_at <- crosspred(cb_temp, m_cc, cen = ts$mmt$mmt, at = at)
rr_cc <- data.frame(percentile = ts$rr$percentile, temperature = at,
                    rr = unname(p_at$allRRfit), lo = unname(p_at$allRRlow),
                    hi = unname(p_at$allRRhigh))

compare <- data.frame(
  percentile  = ts$rr$percentile, temperature = at,
  time_series = fmt_ci(ts$rr$rr, ts$rr$lo, ts$rr$hi),
  case_crossover = fmt_ci(rr_cc$rr, rr_cc$lo, rr_cc$hi)
)

write.csv(compare, "outputs/tables/table3_design_comparison.csv", row.names = FALSE)
save_out(list(model = m_cc, par = par_cc, mmt = mmt_cc, pred = pred_cc,
              rr = rr_cc, compare = compare, n_strata = nlevels(dat$stratum)),
         "fit_casecrossover")

message(sprintf("Case-crossover: %d strata; own MMT %.1f C (95%% eCI %.1f, %.1f)",
                nlevels(dat$stratum), mmt_cc$mmt, mmt_cc$ci[1], mmt_cc$ci[2]))
print(compare)

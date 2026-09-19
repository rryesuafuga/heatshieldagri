# =============================================================================
# 05_sensitivity.R - do the conclusions survive reasonable modelling choices?
#
# Grid: df per year for the time spline x maximum lag. Every model is fitted to
# the SAME rows (the first max(spec$sens_lag) days are dropped for all), because
# QAIC is only comparable between models fitted to identical data.
# Reported for each: QAIC, MMT, and overall cumulative RR at the 1st and 99th
# temperature percentiles versus that model's own MMT.
# =============================================================================

source("R/00_config.R"); source("R/00_functions.R"); check_wd()

dat <- read_out("dat")
x <- dat[[spec$exposure]]
n_years <- length(unique(dat$year))
keep <- seq_len(nrow(dat)) > max(spec$sens_lag)
p01 <- round(quantile(x, 0.01), 1); p99 <- round(quantile(x, 0.99), 1)

grid <- expand.grid(df_per_year = spec$sens_df, max_lag = spec$sens_lag)

fit_one <- function(df_per_year, max_lag) {
  cb <- make_cb(x, max_lag, var_knots = quantile(x, spec$var_knots_p),
                lag_nknots = spec$lag_nknots)
  m  <- glm(death ~ cb + ns(time, df = df_per_year * n_years) + dow,
            family = quasipoisson(), data = dat, subset = keep)
  par <- get_cb_par(m, "cb", cb)
  mmt <- find_mmt(cb, par$coef, x = x, search_p = spec$mmt_search_p)$mmt
  cp  <- crosspred(cb, m, cen = mmt, at = c(p01, p99))
  data.frame(df_per_year, max_lag, qaic = fqaic(m), mmt,
             rr_cold = cp$allRRfit[[1]], rr_cold_lo = cp$allRRlow[[1]], rr_cold_hi = cp$allRRhigh[[1]],
             rr_heat = cp$allRRfit[[2]], rr_heat_lo = cp$allRRlow[[2]], rr_heat_hi = cp$allRRhigh[[2]])
}

sens <- do.call(rbind, Map(fit_one, grid$df_per_year, grid$max_lag))
sens$main_model <- sens$df_per_year == spec$df_per_year & sens$max_lag == spec$max_lag
sens$delta_qaic <- sens$qaic - min(sens$qaic)

sens_print <- data.frame(
  df_per_year = sens$df_per_year, max_lag = sens$max_lag,
  delta_QAIC = round(sens$delta_qaic, 1), MMT = round(sens$mmt, 1),
  RR_cold_1st_pct  = fmt_ci(sens$rr_cold, sens$rr_cold_lo, sens$rr_cold_hi),
  RR_heat_99th_pct = fmt_ci(sens$rr_heat, sens$rr_heat_lo, sens$rr_heat_hi),
  main_model = ifelse(sens$main_model, "<-", "")
)

write.csv(sens_print, "outputs/tables/table5_sensitivity.csv", row.names = FALSE)
save_out(list(sens = sens, sens_print = sens_print, p01 = p01, p99 = p99), "sensitivity")
print(sens_print)

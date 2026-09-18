# =============================================================================
# 02_timeseries_dlnm.R - the main model.
#
# Design : time-series regression, quasi-Poisson (allows overdispersion).
# Exposure-lag-response: DLNM cross-basis of daily mean temperature, lag 0-21.
# Confounding by season and long-term trend: natural spline of time
#   (spec$df_per_year df per year) + day of week.
# Reference for all relative risks: the minimum mortality temperature (MMT).
# =============================================================================

source("R/00_config.R"); source("R/00_functions.R"); check_wd()
dat <- read_out("dat")

x <- dat[[spec$exposure]]
n_years <- length(unique(dat$year))

cb_temp <- make_cb(x, spec$max_lag,
                   var_knots  = quantile(x, spec$var_knots_p),
                   lag_nknots = spec$lag_nknots)

m_ts <- glm(death ~ cb_temp + ns(time, df = spec$df_per_year * n_years) + dow,
            family = quasipoisson(), data = dat)

par_ts <- get_cb_par(m_ts, "cb_temp", cb_temp)

# ---- Minimum mortality temperature, with empirical CI -----------------------
mmt <- find_mmt(cb_temp, par_ts$coef, par_ts$vcov, x,
                search_p = spec$mmt_search_p, n_sim = spec$n_sim, seed = spec$seed)

# ---- Predictions centred at the MMT -----------------------------------------
pred_ts <- crosspred(cb_temp, m_ts, cen = mmt$mmt, by = 0.1)

# Overall cumulative RR at selected percentiles of the temperature distribution
pcts <- c(cold_1 = 0.01, cold_2.5 = 0.025, heat_97.5 = 0.975, heat_99 = 0.99)
at   <- round(quantile(x, pcts), 1)
p_at <- crosspred(cb_temp, m_ts, cen = mmt$mmt, at = at)
rr_ts <- data.frame(percentile = names(pcts), temperature = unname(at),
                    rr = unname(p_at$allRRfit), lo = unname(p_at$allRRlow),
                    hi = unname(p_at$allRRhigh))

write.csv(rr_ts, "outputs/tables/table2_rr_timeseries.csv", row.names = FALSE)
save_out(list(cb = cb_temp, model = m_ts, par = par_ts, mmt = mmt,
              pred = pred_ts, rr = rr_ts,
              dispersion = summary(m_ts)$dispersion, qaic = fqaic(m_ts)),
         "fit_timeseries")

message(sprintf("Time series: MMT %.1f C (95%% eCI %.1f, %.1f; %.0fth pct); dispersion %.2f",
                mmt$mmt, mmt$ci[1], mmt$ci[2], 100 * mmt$pct, summary(m_ts)$dispersion))
print(rr_ts, digits = 3)

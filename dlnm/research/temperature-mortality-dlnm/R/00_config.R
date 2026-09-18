# =============================================================================
# 00_config.R - every analysis choice in one place.
# Change a value here and the whole pipeline follows.
# =============================================================================

spec <- list(

  # ---- Main model (full-year temperature-mortality) -------------------------
  outcome      = "death",             # all-cause daily deaths
  exposure     = "temp",              # daily mean temperature (deg C)
  max_lag      = 21,                  # days: long enough for delayed cold effects
                                      # and short-term harvesting after heat
  var_knots_p  = c(0.10, 0.75, 0.90), # exposure-response: natural cubic spline,
                                      # knots at these temperature percentiles
  lag_nknots   = 3,                   # lag-response: natural cubic spline with
                                      # 3 knots equally spaced on the log scale
  df_per_year  = 8,                   # ns(time) df per year: season + trend
  mmt_search_p = c(0.01, 0.99),       # search for the minimum mortality
                                      # temperature only inside these percentiles

  # ---- Attributable burden --------------------------------------------------
  extreme_p    = c(0.025, 0.975),     # cut-offs for "extreme" cold / heat
  n_sim        = 1000,                # Monte Carlo draws for empirical CIs
  seed         = 20260918,

  # ---- Sensitivity grid -----------------------------------------------------
  sens_df      = c(6, 7, 8, 9, 10),
  sens_lag     = c(14, 21, 28),

  # ---- Heat x ozone interaction (warm season only) --------------------------
  warm_months     = 5:9,              # May-September
  int_max_lag     = 10,               # heat effects are short-lived
  int_var_knots_p = c(0.50, 0.90),    # percentiles of warm-season temperature
  int_lag_nknots  = 2,
  int_doy_df      = 4,                # ns(day of year) df, interacted with year
  o3_lag          = 0:1,              # ozone averaged over lag 0-1
  o3_high_p       = 0.75,             # "high ozone": above this warm-season pct
  int_ref_p       = 0.50,             # reference temperature (warm-season median)
  int_heat_p      = 0.99              # "heat" temperature (warm-season 99th pct)
)

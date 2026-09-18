# =============================================================================
# 06_interaction.R - does ozone modify the heat effect? Both scales.
#
# Warm season only (May-September), where heat and ozone co-occur. The heat
# DLNM (lag 0-10) is allowed to differ between low- and high-ozone days
# (ozone = mean of lag 0-1, high = above the warm-season 75th percentile).
# Season and trend: ns(day of year) interacted with year, + day of week.
#
# Joint exposure categories, all versus (reference temperature, low ozone):
#   RR10 = heat,  low ozone       RR01 = reference temperature, high ozone
#   RR11 = heat,  high ozone
# Multiplicative interaction = RR11 / (RR10 * RR01)   (1 = none)
# Additive interaction, RERI = RR11 - RR10 - RR01 + 1 (0 = none)
# "Heat" = warm-season 99th percentile, reference = warm-season median, both
# held over the whole lag window (overall cumulative association).
# CIs: Monte Carlo draws from the joint distribution of all relevant coefficients.
#
# This is an illustration of method on an open dataset, not a causal claim:
# ozone is dichotomised, and its status is taken on the day of death.
# =============================================================================

source("R/00_config.R"); source("R/00_functions.R"); check_wd()

dat <- read_out("dat")
x   <- dat[[spec$exposure]]
warm <- dat$month %in% spec$warm_months & !is.na(dat$o3_01)

# Cross-basis built on the FULL series (so early-May lags reach back into April),
# with knots placed on the warm-season temperature distribution.
cb_h <- make_cb(x, spec$int_max_lag,
                var_knots  = quantile(x[warm], spec$int_var_knots_p),
                lag_nknots = spec$int_lag_nknots)

dat$o3_high <- as.numeric(dat$o3_01 > quantile(dat$o3_01[warm], spec$o3_high_p))
cb_low  <- unclass(cb_h) * (1 - dat$o3_high)      # heat surface on low-ozone days
cb_high <- unclass(cb_h) * dat$o3_high            # heat surface on high-ozone days
colnames(cb_low)  <- paste0("L_", colnames(cb_h))
colnames(cb_high) <- paste0("H_", colnames(cb_h))

m_int <- glm(death ~ cb_low + cb_high + o3_high +
               ns(doy, df = spec$int_doy_df) * factor(year) + dow,
             family = quasipoisson(), data = dat, subset = warm)

# ---- Pull out the joint parameter vector (low surface, high surface, ozone) --
b <- coef(m_int); V <- vcov(m_int)
i_low  <- match(paste0("cb_low",  colnames(cb_low)),  names(b))
i_high <- match(paste0("cb_high", colnames(cb_high)), names(b))
i_o3   <- match("o3_high", names(b))
stopifnot(!anyNA(c(i_low, i_high, i_o3)))
idx <- c(i_low, i_high, i_o3); k <- length(i_low)

t_ref  <- unname(quantile(x[warm], spec$int_ref_p))
t_heat <- unname(quantile(x[warm], spec$int_heat_p))
b_ref  <- const_history_basis(cb_h, t_ref)[1, ]
b_heat <- const_history_basis(cb_h, t_heat)[1, ]

measures <- function(theta) {
  theta <- unname(theta)
  lo <- theta[1:k]; hi <- theta[(k + 1):(2 * k)]; o3 <- theta[2 * k + 1]
  rr10 <- exp(sum((b_heat - b_ref) * lo))
  rr01 <- exp(o3 + sum(b_ref * (hi - lo)))
  rr11 <- exp(o3 + sum(b_heat * hi) - sum(b_ref * lo))
  c(RR10_heat_lowO3 = rr10, RR01_ref_highO3 = rr01, RR11_heat_highO3 = rr11,
    RR_heat_within_highO3 = rr11 / rr01,
    multiplicative_interaction = rr11 / (rr10 * rr01),
    RERI = rr11 - rr10 - rr01 + 1)
}

est <- measures(b[idx])
set.seed(spec$seed)
sims <- t(apply(MASS::mvrnorm(spec$n_sim, b[idx], V[idx, idx]), 1, measures))
int_tab <- data.frame(measure = names(est), estimate = unname(est),
                      lo = apply(sims, 2, quantile, 0.025),
                      hi = apply(sims, 2, quantile, 0.975), row.names = NULL)

# Joint Wald test: are the two heat surfaces different at all?
d  <- b[i_high] - b[i_low]
Vd <- V[i_high, i_high] + V[i_low, i_low] - V[i_high, i_low] - V[i_low, i_high]
wald <- drop(t(d) %*% solve(Vd) %*% d)
p_wald <- pchisq(wald, df = k, lower.tail = FALSE)

int_print <- data.frame(measure = int_tab$measure,
                        estimate_95eCI = fmt_ci(int_tab$estimate, int_tab$lo, int_tab$hi))
write.csv(int_print, "outputs/tables/table6_interaction.csv", row.names = FALSE)

# Overall cumulative heat curves within each ozone stratum, for plotting
grid <- seq(quantile(x[warm], 0.01), max(x[warm]), by = 0.1)
curve_for <- function(i) crosspred(cb_h, coef = b[i], vcov = V[i, i], model.link = "log",
                                   cen = t_ref, at = grid)
save_out(list(table = int_tab, print = int_print, wald = wald, wald_df = k, p_wald = p_wald,
              t_ref = t_ref, t_heat = t_heat, n_days = sum(warm),
              n_high = sum(dat$o3_high[warm]), o3_cut = quantile(dat$o3_01[warm], spec$o3_high_p),
              curve_low = curve_for(i_low), curve_high = curve_for(i_high),
              dispersion = summary(m_int)$dispersion),
         "interaction")

message(sprintf("Interaction: %d warm-season days (%d high-ozone); ref %.1f C, heat %.1f C; Wald p %s",
                sum(warm), sum(dat$o3_high[warm]), t_ref, t_heat, format.pval(p_wald, digits = 2, eps = 0.001)))
print(int_print)

# =============================================================================
# 00_functions.R - small, documented helpers used by every script.
# No data are read here. Base R + dlnm + MASS only.
# =============================================================================

suppressPackageStartupMessages({
  library(dlnm)
  library(splines)
})

# ---- Housekeeping -----------------------------------------------------------

# All scripts assume the working directory is the root of this subfolder.
check_wd <- function() {
  if (!file.exists("R/00_config.R")) {
    stop("Run from the root of 'temperature-mortality-dlnm' ",
         "(open the .Rproj file, or setwd() there first).", call. = FALSE)
  }
  dir.create("outputs/figures", recursive = TRUE, showWarnings = FALSE)
  dir.create("outputs/tables",  recursive = TRUE, showWarnings = FALSE)
  invisible(TRUE)
}

save_out <- function(x, name) saveRDS(x, file.path("outputs", paste0(name, ".rds")))
read_out <- function(name) {
  f <- file.path("outputs", paste0(name, ".rds"))
  if (!file.exists(f)) stop("Missing ", f, " - run the earlier scripts first.", call. = FALSE)
  readRDS(f)
}

fmt_ci <- function(est, lo, hi, digits = 2) {
  sprintf(paste0("%.", digits, "f (%.", digits, "f, %.", digits, "f)"), est, lo, hi)
}

# ---- Cross-basis ------------------------------------------------------------

# Natural-spline x natural-spline cross-basis with knots fixed explicitly, so the
# identical basis can be rebuilt later for counterfactual exposure series.
make_cb <- function(x, max_lag, var_knots, lag_nknots, bound = range(x, na.rm = TRUE)) {
  crossbasis(
    x, lag = max_lag,
    argvar = list(fun = "ns", knots = var_knots, Boundary.knots = bound),
    arglag = list(fun = "ns", knots = logknots(max_lag, lag_nknots))
  )
}

# Rebuild a cross-basis for a new exposure object using the *stored* basis
# definition of an existing one (same knots, same boundary knots, same lags).
rebuild_cb <- function(cb, x_new) {
  do.call(crossbasis, list(x = x_new, lag = attr(cb, "lag"),
                           argvar = attr(cb, "argvar"),
                           arglag = attr(cb, "arglag")))
}

# Cross-basis row(s) for an exposure held constant at `value` over the whole
# lag window. Multiplying by the coefficients gives the overall cumulative
# log-risk at that value (uncentred).
const_history_basis <- function(cb, value) {
  n_lag <- diff(attr(cb, "lag")) + 1
  h <- matrix(value, nrow = length(value), ncol = n_lag)   # row i = value[i] at every lag
  out <- rebuild_cb(cb, h)
  unclass(out)[, , drop = FALSE]
}

# Coefficients and covariance of the cross-basis terms, from glm or gnm fits.
# `name` is the name of the cross-basis object in the model formula.
get_cb_par <- function(model, name, cb) {
  b <- coef(model)
  idx <- which(names(b) %in% paste0(name, colnames(cb)))
  if (length(idx) != ncol(cb)) stop("Could not match cross-basis terms for '", name, "'.")
  V <- as.matrix(vcov(model))
  list(coef = b[idx], vcov = V[idx, idx, drop = FALSE])
}

# ---- Model selection --------------------------------------------------------

# QAIC for quasi-Poisson fits, in the form used in the code accompanying
# Gasparrini et al., Lancet 2015. Lower is better; compare only models fitted
# to the same rows.
fqaic <- function(model) {
  loglik <- sum(dpois(model$y, model$fitted.values, log = TRUE))
  phi <- summary(model)$dispersion
  -2 * loglik + 2 * summary(model)$df[3] * phi
}

# ---- Minimum mortality temperature -----------------------------------------

# Point estimate: temperature with the lowest overall cumulative risk, searched
# on a grid restricted to a percentile range (avoids implausible minima in the
# sparse tails). Empirical CI: redraw the coefficients, re-find the minimum.
find_mmt <- function(cb, coef, vcov = NULL, x, search_p = c(0.01, 0.99),
                     by = 0.1, n_sim = 0, seed = 1) {
  rng  <- quantile(x, search_p, na.rm = TRUE)
  grid <- seq(rng[1], rng[2], by = by)
  B    <- const_history_basis(cb, grid)
  est  <- grid[which.min(B %*% coef)]
  out  <- list(mmt = unname(est), ci = c(NA_real_, NA_real_),
               pct = unname(mean(x <= est, na.rm = TRUE)))
  if (n_sim > 0 && !is.null(vcov)) {
    set.seed(seed)
    sims <- MASS::mvrnorm(n_sim, coef, vcov)
    mins <- grid[apply(B %*% t(sims), 2, which.min)]
    out$ci <- unname(quantile(mins, c(0.025, 0.975)))
  }
  out
}

# ---- Attributable burden ----------------------------------------------------

# Backward-perspective attributable number / fraction (Gasparrini & Leone,
# BMC Med Res Methodol 2014), written independently for this project.
#
# For each day t the risk attributable to the exposure history x[t], ..., x[t-L]
# relative to a history held at `cen` is
#     AF_t = 1 - exp( - sum_l  beta(x[t-l], l) ),   AN_t = AF_t * cases_t.
# To isolate one component (e.g. heat), exposures outside `range` are replaced by
# `cen`, so they contribute exactly zero. Empirical CIs come from Monte Carlo
# draws of the cross-basis coefficients (multivariate normal).
attr_burden <- function(x, cb, cases, coef, vcov, cen, range = NULL,
                        n_sim = 1000, seed = 1) {
  x_cf <- x
  if (!is.null(range)) x_cf[!is.na(x) & (x < range[1] | x > range[2])] <- cen

  Xc <- unclass(rebuild_cb(cb, x_cf))
  Xc <- sweep(Xc, 2, const_history_basis(cb, cen)[1, ])      # centre at `cen`
  ok <- stats::complete.cases(Xc) & !is.na(cases)

  an_fun <- function(b) sum((1 - exp(-drop(Xc[ok, , drop = FALSE] %*% b))) * cases[ok])
  den <- sum(cases[ok])
  an  <- an_fun(coef)

  set.seed(seed)
  sims   <- MASS::mvrnorm(n_sim, coef, vcov)
  an_sim <- apply(sims, 1, an_fun)

  data.frame(
    an = an, an_lo = quantile(an_sim, 0.025), an_hi = quantile(an_sim, 0.975),
    af = 100 * an / den,
    af_lo = 100 * quantile(an_sim, 0.025) / den,
    af_hi = 100 * quantile(an_sim, 0.975) / den,
    deaths = den, row.names = NULL
  )
}

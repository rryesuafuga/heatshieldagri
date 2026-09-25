# =============================================================================
# 08_export_web.R - export the numbers the web page needs as JSON.
#
# Writes outputs/web/summary.json (headline numbers that only live in the
# fitted objects) and outputs/web/curve.json (the overall cumulative
# exposure-response curve, for the temperature slider). CI copies these into
# web/frontend/public/dlnm/ so the React "Research" page stays in sync.
# No JSON package needed: the writer below is a few lines of base R.
# =============================================================================

source("R/00_config.R"); source("R/00_functions.R"); check_wd()
dir.create("outputs/web", showWarnings = FALSE)

dat <- read_out("dat"); ts <- read_out("fit_timeseries")
cc  <- read_out("fit_casecrossover"); it <- read_out("interaction")

# ---- Minimal JSON writer ----------------------------------------------------
j_num <- function(x) ifelse(is.na(x) | !is.finite(x), "null", formatC(x, digits = 7, format = "g"))
j_arr <- function(x) paste0("[", paste(trimws(j_num(x)), collapse = ","), "]")
j_obj <- function(lst) paste0("{", paste(sprintf('"%s":%s', names(lst), unlist(lst)), collapse = ","), "}")

# ---- summary.json -----------------------------------------------------------
summary <- list(
  mmt        = j_num(ts$mmt$mmt),
  mmt_lo     = j_num(ts$mmt$ci[1]),
  mmt_hi     = j_num(ts$mmt$ci[2]),
  mmt_pct    = j_num(100 * ts$mmt$pct),
  n_days     = j_num(nrow(dat)),
  n_deaths   = j_num(sum(dat$death)),
  dispersion = j_num(ts$dispersion),
  n_strata   = j_num(cc$n_strata),
  wald       = j_num(it$wald),
  wald_df    = j_num(it$wald_df),
  p_wald     = j_num(it$p_wald),
  n_warm     = j_num(it$n_days),
  n_high_o3  = j_num(it$n_high),
  o3_cut     = j_num(it$o3_cut),
  t_ref      = j_num(it$t_ref),
  t_heat     = j_num(it$t_heat),
  generated  = sprintf('"%s"', format(Sys.time(), "%Y-%m-%d"))
)
writeLines(j_obj(lapply(summary, trimws)), "outputs/web/summary.json")

# ---- curve.json -------------------------------------------------------------
p <- ts$pred
curve <- list(
  temp = j_arr(p$predvar),
  rr   = j_arr(p$allRRfit),
  lo   = j_arr(p$allRRlow),
  hi   = j_arr(p$allRRhigh)
)
writeLines(j_obj(curve), "outputs/web/curve.json")

message(sprintf("Web export: summary.json (%d fields), curve.json (%d points)",
                length(summary), length(p$predvar)))

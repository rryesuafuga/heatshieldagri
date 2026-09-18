# =============================================================================
# 01_data.R - load the open dataset, check it, describe it.
#
# Data: `chicagoNMMAPS`, shipped inside the dlnm R package (GPL >= 2).
#   Daily all-cause mortality, weather and air pollution for Chicago, USA,
#   1987-2000 (5,114 days), originally assembled for the National Morbidity,
#   Mortality and Air Pollution Study (NMMAPS).
# The data are loaded from the package at run time. Nothing is downloaded,
# nothing restricted is used, and no data file is committed to this repository.
# =============================================================================

source("R/00_config.R"); source("R/00_functions.R"); check_wd()

data("chicagoNMMAPS", package = "dlnm")
dat <- chicagoNMMAPS

# ---- Integrity checks -------------------------------------------------------
stopifnot(
  nrow(dat) == 5114,
  !anyDuplicated(dat$date),
  all(diff(dat$date) == 1),                      # complete daily series, no gaps
  !anyNA(dat[[spec$outcome]]),
  !anyNA(dat[[spec$exposure]])
)

# ---- Derived variables ------------------------------------------------------
# Time-stratified case-crossover strata: same year, month and day of week.
dat$stratum <- factor(paste(dat$year, dat$month, dat$dow, sep = "-"))

# Ozone averaged over lag 0-1 (used only in the interaction analysis).
dat$o3_01 <- rowMeans(tsModel::Lag(dat$o3, spec$o3_lag))

# ---- Descriptive table ------------------------------------------------------
describe <- function(v) {
  q <- quantile(v, c(0, .01, .25, .5, .75, .99, 1), na.rm = TRUE)
  c(n_missing = sum(is.na(v)), mean = mean(v, na.rm = TRUE), q)
}
vars <- c(death = "All-cause deaths / day", temp = "Mean temperature (C)",
          o3 = "Ozone (ppb)", pm10 = "PM10 (ug/m3)", rhum = "Relative humidity (%)")
tab1 <- data.frame(variable = unname(vars),
                   round(t(sapply(names(vars), function(v) describe(dat[[v]]))), 1),
                   check.names = FALSE, row.names = NULL)

write.csv(tab1, "outputs/tables/table1_descriptives.csv", row.names = FALSE)
save_out(dat, "dat")
save_out(tab1, "tab1")

message(sprintf("Data: %d days, %s to %s; %s deaths in total.",
                nrow(dat), min(dat$date), max(dat$date),
                format(sum(dat$death), big.mark = ",")))

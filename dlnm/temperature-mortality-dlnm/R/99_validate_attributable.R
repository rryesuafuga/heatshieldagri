# =============================================================================
# 99_validate_attributable.R - OPTIONAL check, not part of run_all.R.
#
# Compares this project's attr_burden() with the reference function attrdl()
# published by the method's authors. attrdl.R is (c) Antonio Gasparrini and is
# NOT redistributed in this repository: it is downloaded to a temporary file at
# run time, used for the comparison, and discarded.
#   Source: https://github.com/gasparrini/2014_gasparrini_BMCmrm_Rcodedata
# =============================================================================

source("R/00_config.R"); source("R/00_functions.R"); check_wd()

url <- paste0("https://raw.githubusercontent.com/gasparrini/",
              "2014_gasparrini_BMCmrm_Rcodedata/master/attrdl.R")
tmp <- tempfile(fileext = ".R")
utils::download.file(url, tmp, quiet = TRUE)
source(tmp); unlink(tmp)

dat <- read_out("dat"); ts <- read_out("fit_timeseries")
x <- dat[[spec$exposure]]; mmt <- ts$mmt$mmt

check <- function(label, range) {
  mine <- attr_burden(x, ts$cb, dat$death, ts$par$coef, ts$par$vcov,
                      cen = mmt, range = range, n_sim = 10)$af
  ref  <- 100 * attrdl(x, ts$cb, dat$death, coef = ts$par$coef, vcov = ts$par$vcov,
                       model.link = "log", type = "af", dir = "back",
                       cen = mmt, range = range)
  data.frame(component = label, this_project = mine, attrdl_reference = ref,
             abs_diff = abs(mine - ref))
}
res <- rbind(check("total", NULL),
             check("cold",  c(min(x), mmt)),
             check("heat",  c(mmt, max(x))))
print(res, digits = 8)
stopifnot(all(res$abs_diff < 1e-8))
message("attr_burden() reproduces attrdl() to within 1e-8 percentage points.")

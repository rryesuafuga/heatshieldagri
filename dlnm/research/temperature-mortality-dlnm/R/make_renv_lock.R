# =============================================================================
# make_renv_lock.R - generate a real renv.lock for this project.
#
# Run this ONCE, in R, on a machine that has the packages installed:
#     Rscript R/make_renv_lock.R
#
# It writes renv.lock in the root of this subfolder. Commit that file.
# From then on the CI workflow (.github/workflows/dlnm-demo.yml) detects the
# lockfile automatically and restores those exact versions instead of whatever
# is current on CRAN.
#
# The lockfile is NOT committed to this repository as shipped, deliberately:
# a lockfile has to be produced by renv::snapshot() on a working installation
# so that every version and hash is real. A hand-written one would fail
# renv::restore() while looking authoritative.
# =============================================================================

if (!requireNamespace("renv", quietly = TRUE)) {
  install.packages("renv")
}

if (!file.exists("R/00_config.R")) {
  stop("Run from the root of 'temperature-mortality-dlnm' ",
       "(open the .Rproj file, or setwd() there first).", call. = FALSE)
}

# Packages this project actually loads. MASS and splines ship with R; renv
# records base/recommended packages only where it needs to.
pkgs <- c("dlnm", "gnm", "tsModel", "MASS", "rmarkdown", "knitr")

missing <- pkgs[!vapply(pkgs, requireNamespace, logical(1), quietly = TRUE)]
if (length(missing)) {
  stop("Install these first, then re-run: install.packages(c(",
       paste(sprintf('"%s"', missing), collapse = ", "), "))", call. = FALSE)
}

renv::snapshot(packages = pkgs, lockfile = "renv.lock",
               prompt = FALSE, force = TRUE)

message("\nWrote renv.lock. Commit it:\n",
        "  git add renv.lock && git commit -m 'Pin package versions'\n")

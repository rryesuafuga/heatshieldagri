# =============================================================================
# run_all.R - reproduce everything. From the root of this subfolder:
#     Rscript run_all.R
# Takes about a minute. Needs R >= 4.4 (current dlnm requires it) and the
# packages dlnm, gnm, tsModel, rmarkdown (MASS and splines ship with R).
# =============================================================================

needed  <- c("dlnm", "gnm", "tsModel", "MASS", "rmarkdown")
missing <- needed[!vapply(needed, requireNamespace, logical(1), quietly = TRUE)]
if (length(missing)) {
  stop("Install first: install.packages(c(",
       paste(sprintf('"%s"', missing), collapse = ", "), "))", call. = FALSE)
}

scripts <- c("01_data.R", "02_timeseries_dlnm.R", "03_casecrossover.R",
             "04_attributable.R", "05_sensitivity.R", "06_interaction.R", "07_figures.R")
t0 <- Sys.time()
for (s in scripts) {
  message("\n=== ", s, " ===")
  source(file.path("R", s), local = new.env())
}

message("\n=== report ===")
rmarkdown::render("report/report.Rmd", quiet = TRUE)
message(sprintf("\nDone in %.0f seconds. Read report/report.md.",
                as.numeric(difftime(Sys.time(), t0, units = "secs"))))

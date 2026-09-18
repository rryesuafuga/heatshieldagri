# =============================================================================
# make_synthetic_dhs.R - Tier 2, SYNTHETIC DATA ONLY.
#
# Generates a mock DHS birth recode (BR) + geographic (GE) pair, plus a daily
# temperature series per cluster, so that the gestational-exposure code can be
# developed and run in CI without any real DHS data.
#
# WHY SYNTHETIC: real DHS microdata and cluster GPS require registration and
# per-survey approval from The DHS Program, and MAY NOT BE REDISTRIBUTED. So
# this repository is code-only for Tier 2: this generator stands in for the
# real files, and the analysis code reads whichever is present.
#
# Nothing here is a finding. The association below is INJECTED by construction
# so the method can be shown to recover a known answer.
#
# Run:  Rscript data-raw/make_synthetic_dhs.R
# Writes (git-ignored) data-raw/synthetic/:
#   synthetic_ge.csv           one row per cluster: displaced GPS
#   synthetic_br.csv           one row per birth
#   synthetic_temp_daily.csv   cluster x day mean temperature
#
# -----------------------------------------------------------------------------
# TIER-2 ANALYSIS DESIGN (what this data is shaped for)
#
# 1. Read BR (births) + GE (cluster GPS) after DHS approval        [NOT in repo]
# 2. Cluster GPS are DISPLACED by DHS before release: urban 0-2 km, rural
#    0-5 km, and 1% of rural clusters up to 10 km. Apply a 5-10 km buffer and
#    extract daily temperature from ERA5-Land (ecmwfr) or the Open-Meteo
#    Historical API (CC BY 4.0, attribution required).
# 3. Build a gestational exposure-history matrix: mean temperature per
#    gestational month (or week) for each birth.
# 4. crossbasis over gestational MONTHS (not calendar lag). Outcomes:
#    low birth weight (logistic), birth weight in grams (linear),
#    neonatal death (conditional logistic / Cox).
# 5. Adjust for maternal age, parity, SES/wealth, education and season;
#    apply survey weights (v005/1e6) and a cluster random effect.
# 6. Critical-window plot: RR by gestational month. Discuss fixed-cohort bias,
#    GPS displacement misclassification, ecological vs individual exposure,
#    and dry-bulb temperature vs WBGT/humidity.
# =============================================================================

set.seed(20260918)

out_dir <- file.path("data-raw", "synthetic")
dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)

n_clusters <- 60
births_per_cluster <- 25
years <- 2015:2020

# ---- 1. Clusters, with DHS-style GPS displacement ---------------------------
# True locations scattered over Uganda's bounding box, then displaced exactly
# as DHS does before public release.

true_lat <- runif(n_clusters, -1.30, 3.60)
true_lon <- runif(n_clusters, 29.60, 34.80)
urban    <- ifelse(runif(n_clusters) < 0.25, "U", "R")

max_km <- ifelse(urban == "U", 2, 5)
# 1% of rural clusters are displaced up to 10 km
max_km[urban == "R" & runif(n_clusters) < 0.01] <- 10

offset_km <- runif(n_clusters, 0, max_km)
bearing   <- runif(n_clusters, 0, 2 * pi)
d_lat <- offset_km * cos(bearing) / 111.32
d_lon <- offset_km * sin(bearing) / (111.32 * cos(true_lat * pi / 180))

ge <- data.frame(
  DHSCLUST   = seq_len(n_clusters),
  LATNUM     = round(true_lat + d_lat, 5),
  LONGNUM    = round(true_lon + d_lon, 5),
  URBAN_RURA = urban,
  ADM1NAME   = sample(c("Central", "Eastern", "Northern", "Western"),
                      n_clusters, replace = TRUE),
  SOURCE     = "SYNTHETIC - not a real DHS cluster"
)

# ---- 2. Daily temperature per cluster ---------------------------------------
# Seasonal cycle + latitude gradient + AR(1) weather noise. Uganda-like range.

dates <- seq(as.Date(paste0(min(years) - 1, "-01-01")),
             as.Date(paste0(max(years), "-12-31")), by = "day")
doy <- as.integer(format(dates, "%j"))

temp_daily <- do.call(rbind, lapply(seq_len(n_clusters), function(k) {
  base    <- 23.5 - 0.8 * ge$LATNUM[k] + ifelse(ge$URBAN_RURA[k] == "U", 0.9, 0)
  season  <- 2.2 * sin(2 * pi * (doy - 75) / 365.25)
  noise   <- as.numeric(stats::filter(rnorm(length(dates), 0, 1.1),
                                      0.65, method = "recursive"))
  data.frame(DHSCLUST = k, date = dates,
             temp = round(base + season + noise, 2))
}))

# Fast lookup: matrix [cluster, day index]
temp_mat <- matrix(temp_daily$temp, nrow = n_clusters, byrow = TRUE)
day_index <- setNames(seq_along(dates), as.character(dates))

# ---- 3. Births ---------------------------------------------------------------

n <- n_clusters * births_per_cluster
clust <- rep(seq_len(n_clusters), each = births_per_cluster)

birth_date <- sample(
  seq(as.Date(paste0(min(years), "-01-01")),
      as.Date(paste0(max(years), "-12-31")), by = "day"),
  n, replace = TRUE)

gest_days <- pmin(pmax(round(rnorm(n, 273, 12)), 210), 300)

mother_age <- pmin(pmax(round(rnorm(n, 27, 6)), 15), 49)
parity     <- pmin(rpois(n, 3) + 1, 12)
wealth     <- sample(1:5, n, replace = TRUE)          # v190 quintile
education  <- sample(0:3, n, replace = TRUE)          # v106

# ---- 4. Gestational exposure-history matrix ---------------------------------
# Mean temperature in each of 9 gestational months, per birth.

gest_temp <- matrix(NA_real_, nrow = n, ncol = 9,
                    dimnames = list(NULL, paste0("gm", 1:9)))

for (i in seq_len(n)) {
  conception <- birth_date[i] - gest_days[i]
  for (m in 1:9) {
    win <- seq(conception + (m - 1) * 30, conception + m * 30 - 1, by = "day")
    idx <- day_index[as.character(win)]
    idx <- idx[!is.na(idx)]
    if (length(idx)) gest_temp[i, m] <- mean(temp_mat[clust[i], idx])
  }
}

# ---- 5. Outcomes, with an INJECTED third-trimester heat effect ---------------
# Ground truth for this synthetic set: heat in gestational month 8 lowers birth
# weight. Everything else is noise. Recovering a peak at gm8 - and flat
# elsewhere - is the check that the Tier-2 pipeline works.

TRUE_WINDOW <- 8
TRUE_GRAMS_PER_DEG <- -38      # g per degC above the reference
ref_temp <- mean(gest_temp[, TRUE_WINDOW], na.rm = TRUE)

heat_excess <- pmax(gest_temp[, TRUE_WINDOW] - ref_temp, 0)
heat_excess[is.na(heat_excess)] <- 0

bw <- 3150 +
  TRUE_GRAMS_PER_DEG * heat_excess +
  18 * (wealth - 3) +
  22 * (education - 1.5) +
  -3.5 * (mother_age - 27)^2 / 10 +
  35 * pmin(parity, 4) +
  rnorm(n, 0, 470)

bw <- round(pmin(pmax(bw, 800), 5200))

lbw  <- as.integer(bw < 2500)
# Neonatal death risk rises as birth weight falls
p_nn <- plogis(-4.2 + 2.4 * (2500 - bw) / 1000)
neonatal_death <- rbinom(n, 1, p_nn)

br <- data.frame(
  caseid = sprintf("%04d %03d %02d", clust, seq_len(n), 1),
  v001   = clust,                                   # cluster
  v005   = round(runif(n, 0.6e6, 1.6e6)),           # sample weight (/1e6)
  v012   = mother_age,                              # maternal age
  v106   = education,                               # education level
  v190   = wealth,                                  # wealth quintile
  v201   = parity,                                  # children ever born
  b1     = as.integer(format(birth_date, "%m")),
  b2     = as.integer(format(birth_date, "%Y")),
  b4     = sample(c("M", "F"), n, replace = TRUE),
  b5     = 1L - neonatal_death,                     # child alive
  m19    = bw,                                      # birth weight, grams
  lbw    = lbw,
  gest_days = gest_days,
  birth_date = birth_date,
  as.data.frame(round(gest_temp, 2)),          # gm1 ... gm9
  row.names = NULL
)

# ---- 6. Write ---------------------------------------------------------------

write.csv(ge,         file.path(out_dir, "synthetic_ge.csv"),         row.names = FALSE)
write.csv(br,         file.path(out_dir, "synthetic_br.csv"),         row.names = FALSE)
write.csv(temp_daily, file.path(out_dir, "synthetic_temp_daily.csv"), row.names = FALSE)

message(sprintf(paste0(
  "Synthetic DHS written to %s\n",
  "  clusters : %d (%d urban, %d rural; displacement %.1f-%.1f km)\n",
  "  births   : %d, %d low birth weight (%.1f%%), %d neonatal deaths\n",
  "  injected : %+d g per degC of heat in gestational month %d\n",
  "SYNTHETIC DATA - no finding here is real."),
  out_dir, n_clusters, sum(urban == "U"), sum(urban == "R"),
  min(offset_km), max(offset_km),
  n, sum(lbw), 100 * mean(lbw), sum(neonatal_death),
  TRUE_GRAMS_PER_DEG, TRUE_WINDOW))

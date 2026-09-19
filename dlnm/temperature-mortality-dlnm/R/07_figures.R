# =============================================================================
# 07_figures.R - all figures, base graphics only (no extra dependencies).
# =============================================================================

source("R/00_config.R"); source("R/00_functions.R"); check_wd()

dat <- read_out("dat");               x  <- dat[[spec$exposure]]
ts  <- read_out("fit_timeseries");    cc <- read_out("fit_casecrossover")
se  <- read_out("sensitivity");       it <- read_out("interaction")

col_ts <- "#B2182B"; col_cc <- "#2166AC"; col_grey <- "grey55"
open_png <- function(name, w = 1800, h = 1200) {
  png(file.path("outputs/figures", name), width = w, height = h, res = 200)
}
band <- function(xv, lo, hi, col) {
  polygon(c(xv, rev(xv)), c(lo, rev(hi)), col = adjustcolor(col, 0.18), border = NA)
}

# ---- Figure 1: overall cumulative association, two designs -------------------
open_png("fig1_overall_two_designs.png")
layout(matrix(1:2), heights = c(3.2, 1)); par(mar = c(0.5, 4.5, 2.5, 1))
xv <- ts$pred$predvar
plot(xv, ts$pred$allRRfit, type = "n", log = "y", ylim = c(0.9, 1.8), xaxt = "n",
     xlab = "", ylab = "Relative risk (lag 0-21, cumulative)", las = 1,
     main = "Temperature and all-cause mortality, Chicago 1987-2000")
band(xv, ts$pred$allRRlow, ts$pred$allRRhigh, col_ts)
band(xv, cc$pred$allRRlow, cc$pred$allRRhigh, col_cc)
lines(xv, ts$pred$allRRfit, col = col_ts, lwd = 2.5)
lines(xv, cc$pred$allRRfit, col = col_cc, lwd = 2.5, lty = 2)
abline(h = 1, col = col_grey); abline(v = ts$mmt$mmt, lty = 3)
abline(v = quantile(x, c(0.025, 0.975)), lty = 3, col = col_grey)
text(ts$mmt$mmt, 0.93, sprintf("MMT %.1f C", ts$mmt$mmt), pos = 2, cex = 0.8)
legend("top", bty = "n", lwd = 2.5, lty = c(1, 2), col = c(col_ts, col_cc), cex = 0.85,
       legend = c("Time series (quasi-Poisson, spline of time)",
                  "Time-stratified case-crossover (conditional Poisson)"))
par(mar = c(4.5, 4.5, 0.2, 1))
hist(x, breaks = 60, col = "grey80", border = "white", main = "", las = 1,
     xlim = range(xv), xlab = "Daily mean temperature (C)", ylab = "Days")
dev.off()

# ---- Figure 2: the full exposure-lag-response surface ------------------------
open_png("fig2_surface_3d.png", w = 1600, h = 1300)
par(mar = c(1, 1, 2.5, 1))
# coarser grid than the main prediction, so the mesh stays readable
pred_3d <- crosspred(ts$cb, coef = ts$par$coef, vcov = ts$par$vcov, model.link = "log",
                     cen = ts$mmt$mmt, by = 2)
plot(pred_3d, ptype = "3d", xlab = "Temperature (C)", ylab = "Lag (days)", zlab = "RR",
     theta = 210, phi = 28, ltheta = 160, border = "grey40", col = "#FDDBC7", shade = 0.3,
     main = "Exposure-lag-response surface (RR vs MMT)")
dev.off()

# ---- Figure 3: same surface as a contour map ---------------------------------
# (filled.contour manages its own layout, so it gets a device to itself)
open_png("fig3_surface_contour.png", w = 2000, h = 1100)
plot(ts$pred, ptype = "contour", xlab = "Temperature (C)", ylab = "Lag (days)",
     key.title = title("RR", cex.main = 0.9),
     plot.title = title("Where and when the risk sits: temperature x lag",
                        xlab = "Temperature (C)", ylab = "Lag (days)"))
dev.off()

# ---- Figure 4: lag-response at extreme cold and extreme heat -----------------
open_png("fig4_lag_response.png", w = 2200, h = 1000)
par(mfrow = c(1, 2), mar = c(4.5, 4.5, 3, 1))
for (p in c(0.01, 0.99)) {
  v <- round(quantile(x, p), 1)
  plot(ts$pred, ptype = "slices", var = v, ci = "area", col = if (p < .5) col_cc else col_ts,
       lwd = 2.5, ci.arg = list(col = adjustcolor(if (p < .5) col_cc else col_ts, 0.18)),
       xlab = "Lag (days)", ylab = "RR vs MMT", las = 1, ylim = c(0.88, 1.09),
       main = sprintf("%s: %.1f C (%s percentile)", if (p < .5) "Cold" else "Heat", v,
                      if (p < .5) "1st" else "99th"))
}
dev.off()

# ---- Figure 5: sensitivity ---------------------------------------------------
open_png("fig5_sensitivity.png", w = 2200, h = 1000)
par(mfrow = c(1, 2), mar = c(4.5, 4.5, 3, 1)); s <- se$sens
off <- c(-0.22, 0, 0.22)[match(s$max_lag, spec$sens_lag)]
cols <- c("#1B9E77", "#D95F02", "#7570B3")[match(s$max_lag, spec$sens_lag)]
panel <- function(est, lo, hi, ttl) {
  plot(s$df_per_year + off, est, ylim = range(c(lo, hi, 1)), pch = ifelse(s$main_model, 19, 21),
       col = cols, bg = "white", cex = 1.3, las = 1, xlab = "df per year, spline of time",
       ylab = "RR vs model's own MMT", main = ttl, xaxt = "n")
  axis(1, at = spec$sens_df); segments(s$df_per_year + off, lo, y1 = hi, col = cols, lwd = 1.6)
  abline(h = 1, col = col_grey)
}
panel(s$rr_cold, s$rr_cold_lo, s$rr_cold_hi, sprintf("Cold: %.1f C (1st pct)", se$p01))
legend("bottomleft", bty = "n", pch = 21, col = unique(cols), pt.bg = "white", cex = 0.85,
       legend = paste("max lag", spec$sens_lag), title = "filled = main model")
panel(s$rr_heat, s$rr_heat_lo, s$rr_heat_hi, sprintf("Heat: %.1f C (99th pct)", se$p99))
dev.off()

# ---- Figure 6: heat effect by ozone stratum (warm season) --------------------
open_png("fig6_heat_by_ozone.png")
par(mar = c(4.5, 4.5, 3, 1)); lo <- it$curve_low; hi <- it$curve_high
plot(lo$predvar, lo$allRRfit, type = "n", log = "y", las = 1,
     ylim = range(c(lo$allRRlow, hi$allRRhigh)),
     xlab = "Daily mean temperature (C), warm season", ylab = "Relative risk (lag 0-10, cumulative)",
     main = "Heat-mortality association by ozone level, May-September")
band(lo$predvar, lo$allRRlow, lo$allRRhigh, col_cc); band(hi$predvar, hi$allRRlow, hi$allRRhigh, col_ts)
lines(lo$predvar, lo$allRRfit, col = col_cc, lwd = 2.5); lines(hi$predvar, hi$allRRfit, col = col_ts, lwd = 2.5)
abline(h = 1, col = col_grey); abline(v = c(it$t_ref, it$t_heat), lty = 3, col = col_grey)
legend("topleft", bty = "n", lwd = 2.5, col = c(col_cc, col_ts), cex = 0.9,
       legend = c(sprintf("Low ozone (lag 0-1 mean <= %.0f ppb)", it$o3_cut),
                  sprintf("High ozone (> %.0f ppb)", it$o3_cut)))
dev.off()

message("Figures written to outputs/figures/")

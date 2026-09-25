# =============================================================================
# app/app.R - the results, in plain English.
#
#   shiny::runApp("app")          from the project root, after run_all.R
#   Rscript app/app.R --check     no Shiny needed: builds every sentence and
#                                 prints them. CI runs this on every push.
#
# Reads only the committed outputs/tables/*.csv and outputs/figures/*.png.
# If outputs/fit_timeseries.rds exists (written by run_all.R; not committed),
# the "pick a temperature" slider is switched on as well.
#
# To publish on shinyapps.io, copy the outputs into the app folder first so
# they get bundled:   cp -r outputs app/   then   rsconnect::deployApp("app")
# =============================================================================

CHECK <- "--check" %in% commandArgs(trailingOnly = TRUE)

# ---- Locate the results ------------------------------------------------------
find_root <- function() {
  for (cand in c(getwd(), file.path(getwd(), ".."))) {
    if (dir.exists(file.path(cand, "outputs", "tables"))) return(normalizePath(cand))
  }
  stop("Could not find outputs/tables. Run 'Rscript run_all.R' from the project ",
       "root first, then shiny::runApp('app') from that same directory.", call. = FALSE)
}
root    <- find_root()
tab_dir <- file.path(root, "outputs", "tables")
fig_dir <- file.path(root, "outputs", "figures")
rds     <- file.path(root, "outputs", "fit_timeseries.rds")
dat_rds <- file.path(root, "outputs", "dat.rds")

# ---- Helpers -----------------------------------------------------------------
read_tab <- function(f) read.csv(file.path(tab_dir, f), check.names = FALSE,
                                 stringsAsFactors = FALSE)

# "1.27 (1.18, 1.36)"  or  "48,565 (29,697, 69,330)"  ->  c(estimate, lo, hi)
nums <- function(s) {
  s <- gsub("(?<=[0-9]),(?=[0-9]{3})", "", s, perl = TRUE)
  as.numeric(regmatches(s, gregexpr("-?[0-9]+\\.?[0-9]*", s))[[1]])[1:3]
}

# Relative risk -> "27% higher" / "3% lower" / "no different"
pct_change <- function(rr) {
  v <- as.integer(round(100 * (rr - 1)))
  if (v > 0) paste0(v, "% higher") else if (v < 0) paste0(abs(v), "% lower") else "no different"
}
pct_range <- function(lo, hi) {
  sprintf("%d%% to %d%%", as.integer(round(100 * (lo - 1))), as.integer(round(100 * (hi - 1))))
}
one_in <- function(af_pct) {
  if (af_pct <= 0) return("effectively none")
  sprintf("about 1 death in every %s", format(round(100 / af_pct), big.mark = ","))
}
fmt_n <- function(x) format(round(x), big.mark = ",")

# ---- Load ---------------------------------------------------------------------
t1 <- read_tab("table1_descriptives.csv")
t2 <- read_tab("table2_rr_timeseries.csv")
t3 <- read_tab("table3_design_comparison.csv")
t4 <- read_tab("table4_attributable.csv")
t5 <- read_tab("table5_sensitivity.csv")
t6 <- read_tab("table6_interaction.csv")
ts  <- if (file.exists(rds))     readRDS(rds)     else NULL
dat <- if (file.exists(dat_rds)) readRDS(dat_rds) else NULL

# ---- Facts pulled out of the tables ------------------------------------------
row2 <- function(p) t2[t2$percentile == p, ][1, ]
cold1 <- row2("cold_1"); cold25 <- row2("cold_2.5")
heat99 <- row2("heat_99"); heat975 <- row2("heat_97.5")

temp_row  <- t1[grepl("temperature", t1$variable, ignore.case = TRUE), ][1, ]
death_row <- t1[grepl("deaths",      t1$variable, ignore.case = TRUE), ][1, ]
n_days    <- if (!is.null(dat)) nrow(dat) else 5114L
n_deaths  <- if (!is.null(dat)) sum(dat$death) else round(death_row$mean * n_days)
deaths_txt <- if (!is.null(dat)) fmt_n(n_deaths) else paste("about", fmt_n(round(n_deaths, -3)))

main   <- t5[t5$main_model == "<-", ][1, ]
mmt    <- if (!is.null(ts)) ts$mmt$mmt else main$MMT
mmt_ci <- if (!is.null(ts)) ts$mmt$ci  else c(NA_real_, NA_real_)
mmt_pct <- if (!is.null(ts)) 100 * ts$mmt$pct else NA_real_

pick4 <- function(pattern) t4[grepl(pattern, t4$component, fixed = TRUE), ][1, ]
af_of <- function(pattern) nums(pick4(pattern)$attributable_fraction_pct)
an_of <- function(pattern) nums(pick4(pattern)$attributable_deaths)
af_tot <- af_of("Total"); an_tot <- an_of("Total")
af_cold <- af_of("Cold ("); an_cold <- an_of("Cold (")
af_heat <- af_of("Heat ("); an_heat <- an_of("Heat (")
an_mcold <- an_of("Moderate cold"); an_xcold <- an_of("Extreme cold")
an_xheat <- an_of("Extreme heat")

cold_grid <- sapply(t5$RR_cold_1st_pct,  function(s) nums(s)[1])
heat_grid <- sapply(t5$RR_heat_99th_pct, function(s) nums(s)[1])
best <- t5[which.min(t5$delta_QAIC), ][1, ]

i6 <- function(m) nums(t6$estimate_95eCI[t6$measure == m][1])
rr10 <- i6("RR10_heat_lowO3"); rr11 <- i6("RR11_heat_highO3")
mult <- i6("multiplicative_interaction"); reri <- i6("RERI")

d3 <- function(p) t3[t3$percentile == p, ][1, ]

# ---- The narrative ------------------------------------------------------------
# Each section: title, one or more paragraphs, optional figure and table.
sections <- list(

  list(title = "What this is",
       text = c(
         "This page explains, in plain language, what a statistical model found about daily temperature and deaths in Chicago between 1987 and 2000.",
         "It is a demonstration of standard methods on an open teaching dataset. It makes no new scientific claim, and it says nothing directly about Uganda. The last section explains why.")),

  list(title = "The data",
       text = c(
         sprintf("The dataset covers %s consecutive days and %s deaths from all causes. On a typical day %s people died; the quietest day saw %s deaths and the worst %s.",
                 fmt_n(n_days), deaths_txt, round(death_row$mean), death_row[["0%"]], death_row[["100%"]]),
         sprintf("Daily mean temperature ranged from %s °C to %s °C. A typical day was %s °C, so this is a cold city with occasional hot spells.",
                 temp_row[["0%"]], temp_row[["100%"]], temp_row[["50%"]])),
       table = t1),

  list(title = "The safest temperature",
       text = c(
         sprintf("The model first finds the temperature at which the death rate is lowest, the \"minimum mortality temperature\". In Chicago that is %.1f °C%s.",
                 mmt,
                 if (!is.na(mmt_ci[1])) sprintf(" (the model is fairly confident it lies between %.1f and %.1f °C)", mmt_ci[1], mmt_ci[2]) else ""),
         sprintf("That is a warm day for Chicago%s. Every result below is measured against this temperature: \"higher\" means higher than on a %.1f °C day.",
                 if (!is.na(mmt_pct)) sprintf(": about %.0f%% of days are cooler than this", mmt_pct) else sprintf(", well above the typical day of %s °C", temp_row[["50%"]]),
                 mmt))),

  list(title = "Cold",
       text = c(
         sprintf("On the coldest 1%% of days (around %.0f °C), the death rate over the following three weeks was %s than at the safest temperature. The plausible range is %s.",
                 cold1$temperature, pct_change(cold1$rr), pct_range(cold1$lo, cold1$hi)),
         sprintf("On the coldest 2.5%% of days (around %.1f °C) it was %s (%s).",
                 cold25$temperature, pct_change(cold25$rr), pct_range(cold25$lo, cold25$hi))),
       table = t2),

  list(title = "Heat",
       text = c(
         sprintf("On the hottest 1%% of days (around %.1f °C), the death rate over the following three weeks was %s (%s). On the hottest 2.5%% of days (around %.1f °C) it was %s (%s).",
                 heat99$temperature, pct_change(heat99$rr), pct_range(heat99$lo, heat99$hi),
                 heat975$temperature, pct_change(heat975$rr), pct_range(heat975$lo, heat975$hi)),
         sprintf("Heat matters far less than cold in this city, and the heat estimate only just clears zero: the bottom of its plausible range is %d%%. Chicago rarely gets very hot, and much of the heat signal comes from a single event, the July 1995 heat wave, when %s people died on the worst day.",
                 as.integer(round(100 * (heat99$lo - 1))), death_row[["100%"]]))),

  list(title = "Two ways of asking, one answer",
       text = c(
         "The model was fitted two different ways. The first, a time-series regression, removes the effect of season and long-term trend with a smooth curve. The second, a case-crossover design, compares each day only with other days in the same month, year and day of the week, so season is handled by the design itself rather than by a curve.",
         sprintf("They agree. For the coldest 1%% of days the two give a risk of %s and %s; for the hottest 1%%, %s and %s. When two designs with different weaknesses give the same answer, the answer is unlikely to be an artefact of either.",
                 d3("cold_1")$time_series, d3("cold_1")$case_crossover,
                 d3("heat_99")$time_series, d3("heat_99")$case_crossover)),
       fig = "fig1_overall_two_designs.png",
       caption = "The full curve under both designs. Risk is lowest at the dotted line (the safest temperature), climbs steeply to the left as it gets colder, and rises only a little to the right as it gets hotter. The histogram underneath shows how common each temperature was.",
       table = t3),

  list(title = "How many deaths",
       text = c(
         sprintf("Over the fourteen years, temperatures other than the safest one account for %.1f%% of all deaths, %s, or roughly %s deaths (plausible range %s to %s).",
                 af_tot[1], one_in(af_tot[1]), fmt_n(an_tot[1]), fmt_n(an_tot[2]), fmt_n(an_tot[3])),
         sprintf("Almost all of that is cold: %.1f%% of deaths, about %s. Heat accounts for %.2f%%, about %s, and the plausible range for heat includes zero.",
                 af_cold[1], fmt_n(an_cold[1]), af_heat[1], fmt_n(an_heat[1])),
         sprintf("Within cold, it is the moderately cold days that do the damage, not the extreme ones: moderate cold accounts for about %s deaths against %s for extreme cold, %d%% of the cold burden. Extreme days are more dangerous one by one, but there are far more moderately cold days.",
                 fmt_n(an_mcold[1]), fmt_n(an_xcold[1]), round(100 * an_mcold[1] / an_cold[1])),
         sprintf("The same holds for heat: extreme heat (the hottest 2.5%% of days) accounts for about %s deaths.", fmt_n(an_xheat[1]))),
       table = t4),

  list(title = "Timing: cold and heat work on different schedules",
       text = c(
         "Cold effects build slowly and persist across the whole three-week window. Heat effects are immediate, within a day or two, and are then followed by a period when the death rate dips below normal.",
         "That dip is called mortality displacement, or \"harvesting\": some of the people who died in the heat were already very frail and would have died within days regardless. It is one reason heat estimates are so sensitive to how many days of lag a model includes."),
       fig = "fig4_lag_response.png",
       caption = "Left: after an extremely cold day, risk stays raised for weeks. Right: after an extremely hot day, risk spikes at once and then falls below one."),

  list(title = "The full picture",
       text = "The model estimates risk at every combination of temperature and days-since-exposure. Height and colour show how much the death rate is raised relative to the safest temperature.",
       fig = "fig2_surface_3d.png",
       caption = "The whole exposure-lag-response surface. The ridge at the back left is cold, spread over many lag days; the small ridge at the front right is heat, concentrated at lag zero."),

  list(title = "Does the answer depend on our choices?",
       text = c(
         sprintf("The model was refitted %d times with different reasonable settings: how tightly to control for season (%d to %d degrees of freedom per year) and how many days of lag to include (%s).",
                 nrow(t5), min(t5$df_per_year), max(t5$df_per_year), paste(sort(unique(t5$max_lag)), collapse = ", ")),
         sprintf("The cold result barely moves: between %s and %s across every version. The heat result moves a lot: between %s and %s. A longer lag window includes more of the post-heat dip and shrinks the heat estimate, so any heat-focused study must choose its window deliberately and say why.",
                 pct_change(min(cold_grid)), pct_change(max(cold_grid)), pct_change(min(heat_grid)), pct_change(max(heat_grid))),
         sprintf("The main specification (%d df per year, %d-day lag) was fixed before seeing any results. The best-fitting version by the usual criterion would have been %d df per year and a %d-day lag, right at the edge of what was tried; that criterion keeps rewarding tighter seasonal control, which is exactly why the choice was made in advance.",
                 main$df_per_year, main$max_lag, best$df_per_year, best$max_lag)),
       fig = "fig5_sensitivity.png",
       caption = "Each point is one version of the model. Cold (left) is stable; heat (right) is not.",
       table = t5),

  list(title = "Heat and ozone together",
       text = c(
         sprintf("In summer (May to September) the model checked whether ozone changes the effect of heat. On low-ozone days, a hot day raised the death rate by %s. On high-ozone days, by %s.",
                 pct_change(rr10[1]), pct_change(rr11[1])),
         sprintf("Together they are worse than either alone would predict. The interaction ratio is %.2f (1 would mean no interaction; %s), and the extra risk beyond simply adding the two effects is %.2f (0 would mean none; %s).",
                 mult[1], sprintf("range %.2f to %.2f", mult[2], mult[3]), reri[1], sprintf("range %.2f to %.2f", reri[2], reri[3])),
         "Treat this as an illustration of the method. Ozone was split into just two groups and measured on the day of death only, while heat was accumulated over ten days."),
       fig = "fig6_heat_by_ozone.png",
       caption = "The heat curve on low-ozone days (blue) and high-ozone days (red). The red curve rises more steeply.",
       table = t6),

  list(title = "What this does not tell you about Uganda",
       text = c(
         "Chicago is a cold city. Almost the entire burden here is cold, and there is no cold burden to speak of in Uganda. The heat side of this analysis, the part that would matter in Uganda, is the weakest part: a small effect, resting heavily on one event.",
         "Exposure is a single city-wide daily temperature, not what any individual experienced. It is dry-bulb temperature only; the humidity-aware index that HeatShield Agri forecasts (WBGT) may describe heat strain better, and comparing the two is the natural next step.",
         "What transfers is the method: how to find the safest temperature, how to measure risk on either side of it, how to count attributable deaths, and how to check that the answer survives reasonable changes to the model. The numbers do not transfer."))
)

# ---- Check mode: print everything and stop ----------------------------------
if (CHECK) {
  for (s in sections) {
    cat("\n== ", s$title, " ==\n", sep = "")
    for (p in s$text) cat(strwrap(p, 90), sep = "\n")
    if (!is.null(s$fig) && !file.exists(file.path(fig_dir, s$fig)))
      stop("Missing figure: ", s$fig, call. = FALSE)
  }
  cat("\n[check] ", length(sections), " sections built; slider ",
      if (is.null(ts)) "off (no fit_timeseries.rds)" else "on", ".\n", sep = "")
  quit(save = "no", status = 0)
}

# ---- Shiny --------------------------------------------------------------------
library(shiny)
addResourcePath("figs", fig_dir)

section_ui <- function(s, i) {
  tagList(
    h2(s$title),
    lapply(s$text, function(p) tags$p(p)),
    if (!is.null(s$fig)) tagList(
      tags$img(src = paste0("figs/", s$fig), style = "max-width:100%; height:auto;"),
      tags$p(tags$em(s$caption), style = "color:#555; font-size:0.9em;")),
    if (!is.null(s$table)) conditionalPanel(
      condition = "input.show_tables",
      tags$details(open = NA, tags$summary("The numbers behind this"),
                   tableOutput(paste0("tab_", i)))),
    tags$hr()
  )
}

ui <- fluidPage(
  tags$head(tags$style(HTML(
    "body{max-width:820px;margin:auto;padding:0 16px;font-size:17px;line-height:1.55}
     h1{margin-top:1.2em} h2{margin-top:1.4em;font-size:1.35em}
     details{margin:.6em 0 1em} summary{cursor:pointer;color:#2166AC}"))),
  titlePanel("Temperature and deaths in Chicago, 1987-2000, in plain English"),
  tags$p(tags$em("A distributed lag non-linear model (DLNM) and case-crossover analysis, narrated. Every number on this page is read from the saved results; nothing is typed in by hand.")),
  checkboxInput("show_tables", "Show the underlying tables", value = FALSE),

  if (!is.null(ts)) tagList(
    tags$div(style = "background:#f4f6fa;border-radius:8px;padding:14px 18px;margin:1em 0;",
      h3("Try a temperature", style = "margin-top:0"),
      sliderInput("temp", NULL,
                  min = floor(min(ts$pred$predvar)), max = ceiling(max(ts$pred$predvar)),
                  value = round(mmt), step = 0.5, width = "100%"),
      tags$p(tags$strong(textOutput("slider_txt", inline = TRUE))))
  ) else tags$p(tags$small("Run run_all.R to enable the interactive temperature slider.")),

  do.call(tagList, Map(section_ui, sections, seq_along(sections))),
  tags$p(tags$small("Methods and full results: report/report.md in this folder. Data: chicagoNMMAPS, from the dlnm R package."))
)

server <- function(input, output, session) {
  for (i in seq_along(sections)) local({
    j <- i
    if (!is.null(sections[[j]]$table))
      output[[paste0("tab_", j)]] <- renderTable(sections[[j]]$table, striped = TRUE, digits = 2)
  })

  if (!is.null(ts)) output$slider_txt <- renderText({
    k  <- which.min(abs(ts$pred$predvar - input$temp))
    rr <- ts$pred$allRRfit[k]; lo <- ts$pred$allRRlow[k]; hi <- ts$pred$allRRhigh[k]
    if (abs(input$temp - mmt) < 0.5)
      sprintf("%.1f °C is the safest temperature. Everything is measured against it.", mmt)
    else
      sprintf("At %.1f °C, the death rate over the following three weeks is %s than at the safest temperature of %.1f °C (plausible range %s).",
              input$temp, pct_change(rr), mmt, pct_range(lo, hi))
  })
}

shinyApp(ui, server)

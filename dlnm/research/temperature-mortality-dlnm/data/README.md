# Data provenance

**No data files are stored in this folder, by design.**

| | |
|---|---|
| Dataset | `chicagoNMMAPS` |
| Obtained from | the [dlnm](https://cran.r-project.org/package=dlnm) R package, via `data("chicagoNMMAPS", package = "dlnm")` |
| Package licence | GPL (>= 2) |
| Content | 5,114 daily records for Chicago, USA, 1 Jan 1987 to 31 Dec 2000: all-cause, cardiovascular and respiratory deaths; mean temperature, dew point, relative humidity; PM10 and ozone |
| Origin | A subsample of the Chicago series from the National Morbidity, Mortality and Air Pollution Study (NMMAPS). The complete NMMAPS files are no longer distributed; this subsample remains available inside dlnm |
| Known quirks | `temp` was converted from Fahrenheit. `pm10` and `o3` are approximate reconstructions (de-trended values plus the median of the long-term trend), which is why a few values are negative. `pm10` has 251 missing days |
| Personal data | None. City-level daily counts only |

## Data deliberately not used

- Uganda DHIS2 / HMIS data: access is granted per study by the Ministry of Health, and reuse for
  another purpose needs fresh permission and ethics clearance.
- Any clinical, trial or cohort data from past or current employers and collaborators.
- HeatShield Agri user data (phone numbers, districts).

## Tier 2: gestational temperature exposure and birth outcomes (design stage)

Gestational temperature exposure and birth outcomes in Uganda, using DHS birth records linked to
gridded temperature. DHS microdata and cluster GPS files require registration and per-survey
approval from The DHS Program and **may not be redistributed**, so this part of the project is
**code-only**.

[`../data-raw/make_synthetic_dhs.R`](../data-raw/make_synthetic_dhs.R) generates a synthetic
stand-in — a mock birth recode (BR), a mock geographic file (GE) with DHS-style GPS displacement
applied (urban 0-2 km, rural 0-5 km, 1% of rural up to 10 km), and a daily temperature series per
cluster. It injects a known third-trimester heat effect, so the pipeline can be checked against a
ground truth it is supposed to recover. Output goes to `data-raw/synthetic/`, which is git-ignored.

To obtain the real data: register at [dhsprogram.com](https://dhsprogram.com/data/), request the
Uganda DHS birth recode **and** the geographic datasets (GPS requires separate justification), and
follow the terms — which prohibit redistribution.

Gridded temperature for the linkage would come from ERA5-Land (via `ecmwfr`, Copernicus licence)
or the [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api)
(CC BY 4.0, attribution required).

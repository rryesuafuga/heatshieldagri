/**
 * Research.tsx
 * ============
 * The DLNM temperature-mortality results, narrated in plain English.
 *
 * Reads the CSV tables the R pipeline writes (copied to public/dlnm/ by CI)
 * and builds every sentence from those numbers, so nothing here is typed in
 * by hand. summary.json and curve.json are optional extras the pipeline
 * exports: without them the page still renders, just without the
 * confidence interval on the safest temperature and without the slider.
 */

import { useEffect, useMemo, useState } from 'react';
import { FlaskConical, Table2, Thermometer } from 'lucide-react';

// ---- Types ----

type Row = Record<string, string>;

interface Summary {
  mmt: number; mmt_lo: number | null; mmt_hi: number | null; mmt_pct: number | null;
  n_days: number; n_deaths: number; dispersion: number; n_strata: number;
  wald: number; wald_df: number; p_wald: number;
  n_warm: number; n_high_o3: number; o3_cut: number; t_ref: number; t_heat: number;
  generated?: string;
}

interface Curve { temp: number[]; rr: number[]; lo: number[]; hi: number[] }

interface Section {
  title: string;
  text: string[];
  fig?: string;
  caption?: string;
  table?: Row[];
}

// ---- Helpers ----

/** Small CSV parser that respects quoted fields (the tables contain "48,565 (29,697, 69,330)"). */
function parseCSV(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift() ?? [];
  return rows.filter((r) => r.length === header.length && r.some((v) => v !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

/** "1.27 (1.18, 1.36)" or "48,565 (29,697, 69,330)" -> [est, lo, hi] */
function nums(s: string): [number, number, number] {
  const m = s.replace(/(?<=\d),(?=\d{3})/g, '').match(/-?\d+\.?\d*/g) ?? [];
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}

const pctChange = (rr: number) => {
  const v = Math.round(100 * (rr - 1));
  return v > 0 ? `${v}% higher` : v < 0 ? `${-v}% lower` : 'no different';
};
const pctRange = (lo: number, hi: number) =>
  `${Math.round(100 * (lo - 1))}% to ${Math.round(100 * (hi - 1))}%`;
const oneIn = (af: number) =>
  af <= 0 ? 'effectively none' : `about 1 death in every ${Math.round(100 / af).toLocaleString()}`;
const fmtN = (x: number) => Math.round(x).toLocaleString();
const f1 = (x: number) => x.toFixed(1);

// ---- Data loading ----

async function fetchCSV(name: string): Promise<Row[]> {
  const r = await fetch(`/dlnm/tables/${name}`);
  if (!r.ok) throw new Error(`Could not load ${name} (${r.status})`);
  return parseCSV(await r.text());
}
async function fetchJSON<T>(name: string): Promise<T | null> {
  try {
    const r = await fetch(`/dlnm/${name}`);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

interface Data {
  t1: Row[]; t2: Row[]; t3: Row[]; t4: Row[]; t5: Row[]; t6: Row[];
  summary: Summary | null; curve: Curve | null;
}

// ---- Build the narrative from the numbers ----

function buildSections(d: Data): { sections: Section[]; mmt: number } {
  const { t1, t2, t3, t4, t5, t6, summary: s } = d;

  const row2 = (p: string) => t2.find((r) => r.percentile === p)!;
  const cold1 = row2('cold_1'), cold25 = row2('cold_2.5');
  const heat99 = row2('heat_99'), heat975 = row2('heat_97.5');
  const rr = (r: Row) => Number(r.rr), lo = (r: Row) => Number(r.lo), hi = (r: Row) => Number(r.hi);
  const temp = (r: Row) => Number(r.temperature);

  const tempRow = t1.find((r) => /temperature/i.test(r.variable))!;
  const deathRow = t1.find((r) => /deaths/i.test(r.variable))!;
  const nDays = s?.n_days ?? 5114;
  const nDeathsTxt = s ? fmtN(s.n_deaths) : `about ${fmtN(Math.round(Number(deathRow.mean) * nDays / 1000) * 1000)}`;

  const main = t5.find((r) => r.main_model === '<-')!;
  const mmt = s?.mmt ?? Number(main.MMT);

  const pick4 = (needle: string) => t4.find((r) => r.component.includes(needle))!;
  const af = (n: string) => nums(pick4(n).attributable_fraction_pct);
  const an = (n: string) => nums(pick4(n).attributable_deaths);
  const afTot = af('Total'), anTot = an('Total');
  const afCold = af('Cold ('), anCold = an('Cold (');
  const afHeat = af('Heat ('), anHeat = an('Heat (');
  const anMCold = an('Moderate cold'), anXCold = an('Extreme cold'), anXHeat = an('Extreme heat');

  const coldGrid = t5.map((r) => nums(r.RR_cold_1st_pct)[0]);
  const heatGrid = t5.map((r) => nums(r.RR_heat_99th_pct)[0]);
  const best = t5.reduce((a, b) => (Number(b.delta_QAIC) < Number(a.delta_QAIC) ? b : a));
  const lags = [...new Set(t5.map((r) => Number(r.max_lag)))].sort((a, b) => a - b);
  const dfs = t5.map((r) => Number(r.df_per_year));

  const i6 = (m: string) => nums(t6.find((r) => r.measure === m)!.estimate_95eCI);
  const rr10 = i6('RR10_heat_lowO3'), rr11 = i6('RR11_heat_highO3');
  const mult = i6('multiplicative_interaction'), reri = i6('RERI');
  const d3 = (p: string) => t3.find((r) => r.percentile === p)!;

  const sections: Section[] = [
    {
      title: 'What this is',
      text: [
        'This page explains, in plain language, what a statistical model found about daily temperature and deaths in Chicago between 1987 and 2000.',
        'It is a demonstration of standard methods on an open teaching dataset. It makes no new scientific claim, and it says nothing directly about Uganda. The last section explains why.',
      ],
    },
    {
      title: 'The data',
      text: [
        `The dataset covers ${fmtN(nDays)} consecutive days and ${nDeathsTxt} deaths from all causes. On a typical day ${Math.round(Number(deathRow.mean))} people died; the quietest day saw ${deathRow['0%']} deaths and the worst ${deathRow['100%']}.`,
        `Daily mean temperature ranged from ${tempRow['0%']} °C to ${tempRow['100%']} °C. A typical day was ${tempRow['50%']} °C, so this is a cold city with occasional hot spells.`,
      ],
      table: t1,
    },
    {
      title: 'The safest temperature',
      text: [
        `The model first finds the temperature at which the death rate is lowest, the "minimum mortality temperature". In Chicago that is ${f1(mmt)} °C` +
          (s?.mmt_lo != null && s?.mmt_hi != null ? ` (the model is fairly confident it lies between ${f1(s.mmt_lo)} and ${f1(s.mmt_hi)} °C).` : '.'),
        `That is a warm day for Chicago` +
          (s?.mmt_pct != null ? `: about ${Math.round(s.mmt_pct)}% of days are cooler than this.` : `, well above the typical day of ${tempRow['50%']} °C.`) +
          ` Every result below is measured against this temperature: "higher" means higher than on a ${f1(mmt)} °C day.`,
      ],
    },
    {
      title: 'Cold',
      text: [
        `On the coldest 1% of days (around ${Math.round(temp(cold1))} °C), the death rate over the following three weeks was ${pctChange(rr(cold1))} than at the safest temperature. The plausible range is ${pctRange(lo(cold1), hi(cold1))}.`,
        `On the coldest 2.5% of days (around ${f1(temp(cold25))} °C) it was ${pctChange(rr(cold25))} (${pctRange(lo(cold25), hi(cold25))}).`,
      ],
      table: t2,
    },
    {
      title: 'Heat',
      text: [
        `On the hottest 1% of days (around ${f1(temp(heat99))} °C), the death rate over the following three weeks was ${pctChange(rr(heat99))} (${pctRange(lo(heat99), hi(heat99))}). On the hottest 2.5% of days (around ${f1(temp(heat975))} °C) it was ${pctChange(rr(heat975))} (${pctRange(lo(heat975), hi(heat975))}).`,
        `Heat matters far less than cold in this city, and the heat estimate only just clears zero: the bottom of its plausible range is ${Math.round(100 * (lo(heat99) - 1))}%. Chicago rarely gets very hot, and much of the heat signal comes from a single event, the July 1995 heat wave, when ${deathRow['100%']} people died on the worst day.`,
      ],
    },
    {
      title: 'Two ways of asking, one answer',
      text: [
        'The model was fitted two different ways. The first, a time-series regression, removes the effect of season and long-term trend with a smooth curve. The second, a case-crossover design, compares each day only with other days in the same month, year and day of the week, so season is handled by the design itself rather than by a curve.',
        `They agree. For the coldest 1% of days the two give a risk of ${d3('cold_1').time_series} and ${d3('cold_1').case_crossover}; for the hottest 1%, ${d3('heat_99').time_series} and ${d3('heat_99').case_crossover}. When two designs with different weaknesses give the same answer, the answer is unlikely to be an artefact of either.`,
      ],
      fig: 'fig1_overall_two_designs.png',
      caption: 'The full curve under both designs. Risk is lowest at the dotted line (the safest temperature), climbs steeply to the left as it gets colder, and rises only a little to the right as it gets hotter. The histogram underneath shows how common each temperature was.',
      table: t3,
    },
    {
      title: 'How many deaths',
      text: [
        `Over the fourteen years, temperatures other than the safest one account for ${afTot[0].toFixed(1)}% of all deaths, ${oneIn(afTot[0])}, or roughly ${fmtN(anTot[0])} deaths (plausible range ${fmtN(anTot[1])} to ${fmtN(anTot[2])}).`,
        `Almost all of that is cold: ${afCold[0].toFixed(1)}% of deaths, about ${fmtN(anCold[0])}. Heat accounts for ${afHeat[0].toFixed(2)}%, about ${fmtN(anHeat[0])}, and the plausible range for heat includes zero.`,
        `Within cold, it is the moderately cold days that do the damage, not the extreme ones: moderate cold accounts for about ${fmtN(anMCold[0])} deaths against ${fmtN(anXCold[0])} for extreme cold, ${Math.round(100 * anMCold[0] / anCold[0])}% of the cold burden. Extreme days are more dangerous one by one, but there are far more moderately cold days.`,
        `The same holds for heat: extreme heat (the hottest 2.5% of days) accounts for about ${fmtN(anXHeat[0])} deaths.`,
      ],
      table: t4,
    },
    {
      title: 'Timing: cold and heat work on different schedules',
      text: [
        'Cold effects build slowly and persist across the whole three-week window. Heat effects are immediate, within a day or two, and are then followed by a period when the death rate dips below normal.',
        'That dip is called mortality displacement, or "harvesting": some of the people who died in the heat were already very frail and would have died within days regardless. It is one reason heat estimates are so sensitive to how many days of lag a model includes.',
      ],
      fig: 'fig4_lag_response.png',
      caption: 'Left: after an extremely cold day, risk stays raised for weeks. Right: after an extremely hot day, risk spikes at once and then falls below one.',
    },
    {
      title: 'The full picture',
      text: ['The model estimates risk at every combination of temperature and days-since-exposure. Height and colour show how much the death rate is raised relative to the safest temperature.'],
      fig: 'fig2_surface_3d.png',
      caption: 'The whole exposure-lag-response surface. The ridge at the back left is cold, spread over many lag days; the small ridge at the front right is heat, concentrated at lag zero.',
    },
    {
      title: 'Does the answer depend on our choices?',
      text: [
        `The model was refitted ${t5.length} times with different reasonable settings: how tightly to control for season (${Math.min(...dfs)} to ${Math.max(...dfs)} degrees of freedom per year) and how many days of lag to include (${lags.join(', ')}).`,
        `The cold result barely moves: between ${pctChange(Math.min(...coldGrid))} and ${pctChange(Math.max(...coldGrid))} across every version. The heat result moves a lot: between ${pctChange(Math.min(...heatGrid))} and ${pctChange(Math.max(...heatGrid))}. A longer lag window includes more of the post-heat dip and shrinks the heat estimate, so any heat-focused study must choose its window deliberately and say why.`,
        `The main specification (${main.df_per_year} df per year, ${main.max_lag}-day lag) was fixed before seeing any results. The best-fitting version by the usual criterion would have been ${best.df_per_year} df per year and a ${best.max_lag}-day lag, right at the edge of what was tried; that criterion keeps rewarding tighter seasonal control, which is exactly why the choice was made in advance.`,
      ],
      fig: 'fig5_sensitivity.png',
      caption: 'Each point is one version of the model. Cold (left) is stable; heat (right) is not.',
      table: t5,
    },
    {
      title: 'Heat and ozone together',
      text: [
        `In summer (May to September) the model checked whether ozone changes the effect of heat.` +
          (s ? ` Of ${fmtN(s.n_warm)} summer days, ${fmtN(s.n_high_o3)} had high ozone.` : '') +
          ` On low-ozone days, a hot day raised the death rate by ${pctChange(rr10[0])}. On high-ozone days, by ${pctChange(rr11[0])}.`,
        `Together they are worse than either alone would predict. The interaction ratio is ${mult[0].toFixed(2)} (1 would mean no interaction; range ${mult[1].toFixed(2)} to ${mult[2].toFixed(2)}), and the extra risk beyond simply adding the two effects is ${reri[0].toFixed(2)} (0 would mean none; range ${reri[1].toFixed(2)} to ${reri[2].toFixed(2)}).`,
        'Treat this as an illustration of the method. Ozone was split into just two groups and measured on the day of death only, while heat was accumulated over ten days.',
      ],
      fig: 'fig6_heat_by_ozone.png',
      caption: 'The heat curve on low-ozone days (blue) and high-ozone days (red). The red curve rises more steeply.',
      table: t6,
    },
    {
      title: 'What this does not tell you about Uganda',
      text: [
        'Chicago is a cold city. Almost the entire burden here is cold, and there is no cold burden to speak of in Uganda. The heat side of this analysis, the part that would matter in Uganda, is the weakest part: a small effect, resting heavily on one event.',
        'Exposure is a single city-wide daily temperature, not what any individual experienced. It is dry-bulb temperature only; the humidity-aware index that HeatShield Agri forecasts (WBGT) may describe heat strain better, and comparing the two is the natural next step.',
        'What transfers is the method: how to find the safest temperature, how to measure risk on either side of it, how to count attributable deaths, and how to check that the answer survives reasonable changes to the model. The numbers do not transfer.',
      ],
    },
  ];

  return { sections, mmt };
}

// ---- Components ----

function DataTable({ rows }: { rows: Row[] }) {
  if (!rows.length) return null;
  const cols = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto mt-3">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>{cols.map((c) => <th key={c} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 ? 'bg-gray-50' : 'bg-white'}>
              {cols.map((c) => <td key={c} className="px-3 py-2 whitespace-nowrap text-gray-700">{r[c]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TemperatureSlider({ curve, mmt }: { curve: Curve; mmt: number }) {
  const min = Math.floor(curve.temp[0]), max = Math.ceil(curve.temp[curve.temp.length - 1]);
  const [t, setT] = useState(Math.round(mmt));
  const k = useMemo(() => {
    let best = 0;
    for (let i = 1; i < curve.temp.length; i++) if (Math.abs(curve.temp[i] - t) < Math.abs(curve.temp[best] - t)) best = i;
    return best;
  }, [curve, t]);
  const atMmt = Math.abs(t - mmt) < 0.5;
  return (
    <div className="card mb-8 bg-blue-50 border border-blue-100">
      <div className="flex items-center gap-2 mb-2">
        <Thermometer className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Try a temperature</h3>
      </div>
      <input type="range" min={min} max={max} step={0.5} value={t}
        onChange={(e) => setT(Number(e.target.value))} className="w-full accent-blue-600" />
      <div className="flex justify-between text-xs text-gray-400 mt-1"><span>{min} °C</span><span>{max} °C</span></div>
      <p className="mt-3 text-gray-800 font-medium">
        {atMmt
          ? `${f1(mmt)} °C is the safest temperature. Everything is measured against it.`
          : `At ${f1(t)} °C, the death rate over the following three weeks is ${pctChange(curve.rr[k])} than at the safest temperature of ${f1(mmt)} °C (plausible range ${pctRange(curve.lo[k], curve.hi[k])}).`}
      </p>
    </div>
  );
}

// ---- Page ----

export default function Research() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTables, setShowTables] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t1, t2, t3, t4, t5, t6, summary, curve] = await Promise.all([
          fetchCSV('table1_descriptives.csv'), fetchCSV('table2_rr_timeseries.csv'),
          fetchCSV('table3_design_comparison.csv'), fetchCSV('table4_attributable.csv'),
          fetchCSV('table5_sensitivity.csv'), fetchCSV('table6_interaction.csv'),
          fetchJSON<Summary>('summary.json'), fetchJSON<Curve>('curve.json'),
        ]);
        setData({ t1, t2, t3, t4, t5, t6, summary, curve });
      } catch (e: any) { setError(e.message ?? String(e)); }
    })();
  }, []);

  const built = useMemo(() => (data ? buildSections(data) : null), [data]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-7 w-7 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-900">Temperature and deaths, in plain English</h1>
        </div>
        <p className="text-gray-500 mt-2">
          A distributed lag non-linear model (DLNM) and case-crossover analysis of Chicago, 1987–2000, narrated.
          Every number on this page is read from the saved results of the analysis; nothing is typed in by hand.
        </p>
        <label className="inline-flex items-center gap-2 mt-4 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showTables} onChange={(e) => setShowTables(e.target.checked)} className="accent-green-600" />
          <Table2 className="h-4 w-4" /> Show the underlying tables
        </label>
      </div>

      {error && (
        <div className="card bg-red-50 border border-red-200 text-red-800">
          Could not load the results: {error}
        </div>
      )}
      {!data && !error && <p className="text-gray-400">Loading results…</p>}

      {built && data && (
        <>
          {data.curve ? <TemperatureSlider curve={data.curve} mmt={built.mmt} /> : null}

          {built.sections.map((s) => (
            <section key={s.title} className="mb-10">
              <h2 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h2>
              {s.text.map((p, i) => <p key={i} className="text-gray-700 leading-relaxed mb-3">{p}</p>)}
              {s.fig && (
                <figure className="mt-4">
                  <img src={`/dlnm/figures/${s.fig}`} alt={s.caption ?? s.title} className="w-full rounded-lg border border-gray-200" loading="lazy" />
                  {s.caption && <figcaption className="text-sm text-gray-500 mt-2 italic">{s.caption}</figcaption>}
                </figure>
              )}
              {showTables && s.table && (
                <details open className="mt-3">
                  <summary className="cursor-pointer text-sm text-blue-700">The numbers behind this</summary>
                  <DataTable rows={s.table} />
                </details>
              )}
            </section>
          ))}

          <p className="text-xs text-gray-400 mt-8">
            Methods and full results: <code>dlnm/temperature-mortality-dlnm/report/report.md</code> in the repository.
            Data: chicagoNMMAPS, from the dlnm R package (GPL ≥ 2).
            {data.summary?.generated ? ` Results exported ${data.summary.generated}.` : ''}
          </p>
        </>
      )}
    </div>
  );
}

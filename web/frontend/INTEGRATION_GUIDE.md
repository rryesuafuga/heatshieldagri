# HeatShield Agri — ML Integration Guide

## What You Have Now

```
web/frontend/
├── public/
│   └── models/                    ✅ DONE
│       ├── temperature_model.onnx  (2 MB)
│       ├── humidity_model.onnx     (2.1 MB)
│       ├── windspeed_model.onnx    (1.9 MB)
│       └── model_metadata.json
├── src/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── App.tsx
│   ├── store.ts
│   ├── wasm.ts
│   └── ml-inference.ts            ✅ DONE
├── package.json                   ✅ onnxruntime-web installed
└── vite.config.ts
```

## Step-by-Step Integration

### Step 1: Copy the WASM runtime files (one-time setup)

Open PowerShell in `web/frontend/`:

```powershell
# Copy ONNX Runtime WASM files to public/ so they're served as static assets
Copy-Item node_modules\onnxruntime-web\dist\*.wasm public\
```

This copies the WASM runtime (~5 MB) that onnxruntime-web needs. Without this,
it fetches from CDN on every page load (slower).

### Step 2: Add the React hook

Save `useHeatShieldML.ts` to `src/hooks/`:

```
src/hooks/useHeatShieldML.ts
```

### Step 3: Add the ML Forecast panel component

Save `MLForecastPanel.tsx` to `src/pages/`:

```
src/pages/MLForecastPanel.tsx
```

### Step 4: Update Vite config

Open `vite.config.ts` and add:

```typescript
export default defineConfig({
  // ... your existing config ...
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
});
```

### Step 5: Add MLForecastPanel to your Dashboard or Forecast page

Find the page where you display the 72-hour WBGT forecast (likely in
`src/pages/` — possibly called Dashboard, Forecast, or similar).

Add this import and component:

```tsx
import MLForecastPanel from './MLForecastPanel';

// In your JSX, below or beside your existing WBGT forecast chart:
<MLForecastPanel district={selectedDistrict} forecastHours={24} />
```

The `district` prop should match one of: Kampala, Gulu, Moroto, Mbale,
Jinja, Mbarara, Lira, Soroti, Arua, Kabale, Hoima, Fort Portal.

If your existing dashboard uses Zustand state for the selected district,
it might look something like:

```tsx
import { useStore } from '../store';

function ForecastPage() {
  const selectedDistrict = useStore((state) => state.selectedDistrict);

  return (
    <div className="space-y-6">
      {/* Your existing physics-based WBGT forecast */}
      <ExistingForecastChart />

      {/* NEW: ML-enhanced forecast */}
      <MLForecastPanel
        district={selectedDistrict || 'Kampala'}
        forecastHours={24}
      />
    </div>
  );
}
```

### Step 6: Test locally

```powershell
cd web\frontend
npm run dev
```

Open `http://localhost:5173` and navigate to your forecast page.
You should see:
1. A loading bar as the 3 ONNX models download (~6 MB total)
2. Then a 24-hour ML WBGT forecast with hourly risk bars

### Step 7: Deploy to Vercel

```powershell
git add .
git commit -m "feat: add Random Forest ML weather forecasting

- Train RF models on 5yr Open-Meteo data (Colab pipeline)
- Export to ONNX for browser inference (~6MB total)
- Add useHeatShieldML hook + MLForecastPanel component
- Predicts temperature, humidity, wind → WBGT via ISO 7243
- 17 features: lags, cyclical time encoding, rolling stats"

git push
```

Vercel auto-deploys on push. The ONNX files in `public/models/`
will be served as static assets.

## How It Works (for the Interview)

```
┌─────────────────────────────────────────────────────┐
│  User's Browser                                      │
│                                                      │
│  1. Open-Meteo Forecast API                          │
│     └─→ Fetches 4 days of hourly weather history     │
│          (temperature, humidity, wind speed)          │
│                                                      │
│  2. Feature Engineering (TypeScript)                 │
│     └─→ Creates 17 features from raw weather:        │
│          8 lag values + 4 cyclical time encodings     │
│          + 3 rolling statistics + 2 delta features    │
│                                                      │
│  3. Random Forest Inference (onnxruntime-web WASM)   │
│     └─→ 3 ONNX models predict next-hour:            │
│          temperature, humidity, wind speed            │
│                                                      │
│  4. WBGT Calculation (ISO 7243)                      │
│     └─→ 0.7×Tnwb + 0.2×Tg + 0.1×Tdb               │
│                                                      │
│  5. Recursive Multi-step Forecasting                 │
│     └─→ Repeat steps 2-4 up to 72 times             │
│          (each prediction becomes input for next)     │
│                                                      │
│  6. Risk Classification + Work Capacity              │
│     └─→ ISO 7243 thresholds + Hothaps model         │
│          → Actionable farming recommendations         │
└─────────────────────────────────────────────────────┘
```

**Key talking points:**
- "The ML models run entirely in the farmer's browser — no server required"
- "Trained on 5 years of real Open-Meteo historical data for 4 Ugandan districts"
- "Total download is ~6 MB, cached after first load"
- "Inference takes milliseconds — 24-hour forecast under 1 second"
- "Predictions feed into the same ISO 7243 WBGT formula used across all platforms"

## Troubleshooting

### "Failed to load ML models"
- Check that ONNX files are in `public/models/` (not `src/models/`)
- Open browser DevTools Network tab — are the .onnx files returning 200?
- Check file sizes match (~2 MB each, not 0 bytes)

### "Insufficient weather history"
- Open-Meteo free tier sometimes rate-limits
- The component needs 73+ hours of past data; if the API returns less, wait and retry

### WASM errors in console
- Copy WASM files: `Copy-Item node_modules\onnxruntime-web\dist\*.wasm public\`
- Add `optimizeDeps: { exclude: ['onnxruntime-web'] }` to vite.config.ts

### Vercel deployment fails
- ONNX files may be too large for Git. Consider adding them to `.gitignore`
  and hosting on a CDN, or use Vercel's 100MB file limit (your 2MB files are fine)

# HeatShield Agri

**Agricultural Worker Heat Stress Early Warning System**

Protecting Uganda's 12.4 million agricultural workers from heat-related health risks and productivity losses.

## Overview

HeatShield Agri is an AI-powered platform that predicts Wet-Bulb Globe Temperature (WBGT) at 5km resolution up to 72 hours ahead, delivering actionable heat stress warnings through three complementary channels:

1. **Web Platform** - Full-featured dashboard using Rust/WebAssembly for compute-intensive WBGT calculations
2. **Android Application** - Native mobile app for extension workers with offline capability
3. **USSD Application** - Feature phone access for farmers without smartphones

## Project Structure

```
heatshieldagri/
├── web/                    # Web Platform (Rust/Wasm + JavaScript)
│   ├── heatshield-wasm/    # Rust WebAssembly core
│   └── frontend/           # React + TypeScript UI
├── Android/                # Android Application (Kotlin)
└── USSD/                   # USSD Application (Rust)
```

## Quick Start

### Web Platform

```bash
cd web/heatshield-wasm
wasm-pack build --target web
cd ../frontend
npm install
npm run dev
```

### Android Application

```bash
cd Android
./gradlew assembleDebug
```

### USSD Application

```bash
cd USSD
cargo build --release
cargo run
```

## Technology Stack

| Platform | Languages | Frameworks |
|----------|-----------|------------|
| Web | Rust, TypeScript | React 18, wasm-bindgen |
| Android | Kotlin | Jetpack Compose, Hilt |
| USSD | Rust | Actix-web, SQLx |

## WBGT Risk Levels

| WBGT Range | Risk Level | Recommended Action |
|------------|------------|-------------------|
| < 26°C | Low | Normal work schedule |
| 26-28°C | Moderate | 15-min break per hour |
| 28-30°C | High | Work 5-10am only |
| 30-32°C | Very High | Work 6am-10am only |
| > 32°C | Extreme | Suspend outdoor work |

## License

MIT License - See LICENSE file for details.

---

**HeatShield Agri** - Protecting farmers from dangerous heat

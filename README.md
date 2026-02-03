# OpenHamClock - Modular React Architecture

A modern, modular amateur radio dashboard built with React and Vite. This is the **fully extracted modular version** - all components, hooks, and utilities are already separated into individual files.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the server (auto-builds frontend and creates .env on first run)
npm start

# Edit .env with your callsign and grid locator
# Then restart:
npm start

# Open http://localhost:3000
```

**That's it!** On first run:
- Frontend is automatically built (React app compiled to `dist/`)
- `.env` file is created from `.env.example`
- Just edit `.env` with your callsign and locator

For development with hot reload:
```bash
# Terminal 1: Backend API server
node server.js

# Terminal 2: Frontend dev server with hot reload
npm run dev
```

## ⚙️ Configuration

### First Run (Automatic Setup)

1. Run `npm start` - the server **automatically creates** `.env` from `.env.example`
2. Edit `.env` with your station info:
   ```bash
   CALLSIGN=K0CJH
   LOCATOR=EN10
   ```
3. Restart the server - you're ready to go!

If you skip editing `.env`, the Settings panel will pop up in your browser asking for your callsign.

### Configuration Priority

Settings are loaded in this order (first one wins):
1. **localStorage** - Changes made in the browser Settings panel
2. **.env file** - Your station configuration (won't be overwritten by updates)
3. **Defaults** - Built-in fallback values

### .env Options

```bash
# Required - Your Station
CALLSIGN=N0CALL
LOCATOR=FN31

# Server Settings
PORT=3000
HOST=localhost          # Use 0.0.0.0 for network access

# Display Preferences
UNITS=imperial          # or 'metric'
TIME_FORMAT=12          # or '24'
THEME=dark              # dark, light, legacy, retro
LAYOUT=modern           # modern or classic

# Optional Features
SHOW_SATELLITES=true
SHOW_POTA=true
SHOW_DX_PATHS=true

# Optional Services
ITURHFPROP_URL=         # For advanced propagation
DXSPIDER_PROXY_URL=     # Custom DX cluster proxy
OPENWEATHER_API_KEY=    # For local weather
```

### Network Access

To access OpenHamClock from other devices on your network:

```bash
# In .env:
HOST=0.0.0.0
PORT=3000
```

Then open `http://<your-computer-ip>:3000` from any device.

### Configuration Files

| File | Git Tracked | Purpose |
|------|-------------|---------|
| `.env.example` | ✅ Yes | Template with all options documented |
| `.env` | ❌ No | Your config (auto-created, never overwritten) |
| `config.example.json` | ✅ Yes | Legacy JSON config template |
| `config.json` | ❌ No | Legacy JSON config (optional) |

## 📁 Project Structure

```
openhamclock-modular/
├── src/
│   ├── main.jsx              # React entry point
│   ├── App.jsx               # Main application component
│   ├── components/           # All UI components (fully extracted)
│   │   ├── index.js          # Component exports
│   │   ├── Header.jsx        # Top bar with clocks/controls
│   │   ├── WorldMap.jsx      # Leaflet map with DX paths
│   │   ├── SpaceWeatherPanel.jsx
│   │   ├── BandConditionsPanel.jsx
│   │   ├── DXClusterPanel.jsx
│   │   ├── POTAPanel.jsx
│   │   ├── ContestPanel.jsx
│   │   ├── LocationPanel.jsx
│   │   ├── SettingsPanel.jsx
│   │   └── DXFilterManager.jsx
│   ├── hooks/                # All data fetching hooks (fully extracted)
│   │   ├── index.js          # Hook exports
│   │   ├── useSpaceWeather.js
│   │   ├── useBandConditions.js
│   │   ├── useDXCluster.js
│   │   ├── useDXPaths.js
│   │   ├── usePOTASpots.js
│   │   ├── useContests.js
│   │   ├── useLocalWeather.js
│   │   ├── usePropagation.js
│   │   ├── useMySpots.js
│   │   ├── useDXpeditions.js
│   │   ├── useSatellites.js
│   │   └── useSolarIndices.js
│   ├── utils/                # Utility functions (fully extracted)
│   │   ├── index.js          # Utility exports
│   │   ├── config.js         # App config & localStorage
│   │   ├── geo.js            # Grid squares, bearings, distances
│   │   └── callsign.js       # Band detection, filtering
│   └── styles/
│       └── main.css          # All CSS with theme variables
├── public/
│   └── index-monolithic.html # Original 5714-line reference
├── server.js                 # Backend API server
├── config.js                 # Server configuration
├── package.json
├── vite.config.js
└── index.html                # Vite entry HTML
```

## 🎨 Themes

Four themes available via Settings or `.env`:
- **Dark** (default) - Modern dark theme with amber accents
- **Light** - Light theme for daytime use
- **Legacy** - Classic HamClock green-on-black terminal style
- **Retro** - 90s Windows style with teal and silver

Themes use CSS custom properties defined in `src/styles/main.css`.

## 📐 Layouts

Two layouts available:
- **Modern** (default) - Responsive 3-column grid
- **Classic** - Original HamClock-style with black background, large colored numbers, rainbow frequency bar

## 🔌 Components

All components are fully extracted and ready to modify:

| Component | Description | File |
|-----------|-------------|------|
| Header | Top bar with clocks, weather, controls | `Header.jsx` |
| WorldMap | Leaflet map with markers & paths | `WorldMap.jsx` |
| SpaceWeatherPanel | SFI, K-index, SSN display | `SpaceWeatherPanel.jsx` |
| BandConditionsPanel | HF band condition indicators | `BandConditionsPanel.jsx` |
| DXClusterPanel | Live DX spots list | `DXClusterPanel.jsx` |
| POTAPanel | Parks on the Air activations | `POTAPanel.jsx` |
| ContestPanel | Upcoming contests | `ContestPanel.jsx` |
| LocationPanel | DE/DX info with grid squares | `LocationPanel.jsx` |
| SettingsPanel | Configuration modal | `SettingsPanel.jsx` |
| DXFilterManager | DX cluster filtering modal | `DXFilterManager.jsx` |

## 🪝 Hooks

All data fetching is handled by custom hooks:

| Hook | Purpose | Interval |
|------|---------|----------|
| `useSpaceWeather` | SFI, K-index, SSN from NOAA | 5 min |
| `useBandConditions` | Calculate band conditions | On SFI change |
| `useDXCluster` | DX spots with filtering | 5 sec |
| `useDXPaths` | DX paths for map | 10 sec |
| `usePOTASpots` | POTA activations | 1 min |
| `useContests` | Contest calendar | 30 min |
| `useLocalWeather` | Weather from Open-Meteo | 15 min |
| `usePropagation` | ITURHFProp predictions | 10 min |
| `useMySpots` | Your callsign spots | 30 sec |
| `useSatellites` | Satellite tracking | 5 sec |
| `useSolarIndices` | Extended solar data | 15 min |

## 🛠️ Utilities

| Module | Functions |
|--------|-----------|
| `config.js` | `loadConfig`, `saveConfig`, `applyTheme`, `MAP_STYLES` |
| `geo.js` | `calculateGridSquare`, `calculateBearing`, `calculateDistance`, `getSunPosition`, `getMoonPosition`, `getGreatCirclePoints` |
| `callsign.js` | `getBandFromFreq`, `getBandColor`, `detectMode`, `getCallsignInfo`, `filterDXPaths` |

## 🌐 API Endpoints

The backend server provides:

| Endpoint | Description |
|----------|-------------|
| `/api/dxcluster/spots` | DX cluster spots |
| `/api/dxcluster/paths` | DX paths with coordinates |
| `/api/solar-indices` | Extended solar data |
| `/api/propagation` | HF propagation predictions |
| `/api/contests` | Contest calendar |
| `/api/myspots/:callsign` | Spots for your callsign |
| `/api/satellites/tle` | Satellite TLE data |
| `/api/dxpeditions` | Active DXpeditions |

## 🚀 Deployment

### Raspberry Pi

One-line install for Raspberry Pi:
```bash
curl -fsSL https://raw.githubusercontent.com/accius/openhamclock/main/scripts/setup-pi.sh | bash
```

Or with kiosk mode (auto-starts fullscreen on boot):
```bash
curl -fsSL https://raw.githubusercontent.com/accius/openhamclock/main/scripts/setup-pi.sh | bash -s -- --kiosk
```

After installation:
```bash
cd ~/openhamclock
nano .env  # Edit your callsign and locator
./restart.sh
```

### Railway
```bash
# railway.toml and railway.json are included
railway up
```

### Docker
```bash
docker-compose up -d
```

### Manual
```bash
npm run build
NODE_ENV=production node server.js
```

## 🔄 Updating

For local/Pi installations, use the update script:

```bash
cd ~/openhamclock
./scripts/update.sh
```

The update script will:
1. ✅ Back up your `.env` configuration
2. ✅ Pull the latest code from GitHub
3. ✅ Install any new dependencies
4. ✅ Rebuild the frontend
5. ✅ Preserve your settings

Then restart the server:
```bash
sudo systemctl restart openhamclock
# or
./restart.sh
```

**Note:** If you installed from a zip file (not git clone), you'll need to:
1. Back up your `.env` file
2. Download the new zip
3. Extract and restore your `.env`

## 🤝 Contributing

1. Fork the repository
2. Pick a component/hook to improve
3. Make changes in the appropriate file
4. Test with all three themes
5. Submit a PR

### Code Style

- Functional components with hooks
- CSS-in-JS for component-specific styles
- CSS variables for theme colors
- JSDoc comments for functions
- Descriptive variable names

### Testing Changes

```bash
# Run dev server
npm run dev

# Check all themes work
# Test on different screen sizes
# Verify data fetching works
```

## 📄 License

MIT License - See LICENSE file

## 🙏 Credits

- K0CJH - Original OpenHamClock
- NOAA SWPC - Space weather data
- POTA - Parks on the Air API
- Open-Meteo - Weather data
- Leaflet - Mapping library

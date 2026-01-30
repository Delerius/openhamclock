# Changelog

All notable changes to OpenHamClock will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Satellite tracking with pass predictions
- SOTA API integration
- Contest calendar
- WebSocket DX cluster connection
- Azimuthal equidistant projection option

## [3.0.0] - 2024-01-30

### Added
- **Real map tiles** via Leaflet.js - no more approximated shapes!
- **8 map styles**: Dark, Satellite, Terrain, Streets, Topo, Ocean, NatGeo, Gray
- **Interactive map** - click anywhere to set DX location
- **Day/night terminator** using Leaflet.Terminator plugin
- **Great circle path** visualization between DE and DX
- **POTA activators** displayed on map with callsigns
- **Express server** with API proxy for CORS-free data fetching
- **Electron desktop app** support for Windows, macOS, Linux
- **Docker support** with multi-stage build
- **Railway deployment** configuration
- **Raspberry Pi setup script** with kiosk mode option
- **Cross-platform install scripts** (Linux, macOS, Windows)
- **GitHub Actions CI/CD** pipeline

### Changed
- Complete rewrite of map rendering using Leaflet.js
- Improved responsive layout for different screen sizes
- Better error handling for API failures
- Cleaner separation of frontend and backend

### Fixed
- CORS issues with external APIs now handled by server proxy
- Map projection accuracy improved

## [2.0.0] - 2024-01-29

### Added
- Live API integrations for NOAA space weather
- POTA API integration for activator spots
- Band conditions from HamQSL (XML parsing)
- DX cluster spot display
- Realistic continent shapes (SVG paths)
- Great circle path calculations
- Interactive map (click to set DX)

### Changed
- Improved space weather display with color coding
- Better visual hierarchy in panels

## [1.0.0] - 2024-01-29

### Added
- Initial release
- World map with day/night terminator
- UTC and local time display
- DE/DX location panels with grid squares
- Short path / Long path bearing calculations
- Distance calculations
- Sunrise/sunset calculations
- Space weather panel (mock data)
- Band conditions panel
- DX cluster panel (mock data)
- POTA activity panel (mock data)
- Responsive grid layout
- Dark theme with amber/green accents

### Acknowledgments
- Created in memory of Elwood Downey, WB0OEW
- Inspired by the original HamClock

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 3.0.0 | 2024-01-30 | Real maps, Electron, Docker, Railway |
| 2.0.0 | 2024-01-29 | Live APIs, improved map |
| 1.0.0 | 2024-01-29 | Initial release |

---

*73 de OpenHamClock contributors*

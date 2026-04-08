# YouBike Station Locator

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?style=flat&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=flat&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

A Progressive Web App (PWA) for locating YouBike bike-sharing stations across Taiwan. Track real-time bike and dock availability at 2000+ stations in 13 cities with an interactive map interface.

## Screenshot

![YouBike Station Locator](screenshot.png)
*Screenshot placeholder - Interactive map view with station markers*

## Features

- **Interactive Map View**: Leaflet-powered map with color-coded station markers
  - Green: Bikes and slots available
  - Orange: No bikes available
  - Red: No empty slots
  - Gray: Station suspended
- **13 Cities Coverage**: Taipei, New Taipei, Taoyuan, Hsinchu City, Hsinchu County, Miaoli, Taichung, Chiayi City, Chiayi County, Tainan, Kaohsiung, Pingtung, Taitung
- **Station Search**: Real-time filtering with dropdown suggestions
- **Distance Sorting**: Auto-calculate distance from user location
- **E-Bike Filter**: Filter stations with electric-assist bikes (2.0E)
- **Fare Information**: View YouBike rates and TPASS integration
- **Issue Reporting**: Report station problems with auto-fill form support
- **Bilingual Support**: Toggle between English and Traditional Chinese
- **Mobile Bottom Sheet**: Google Maps-style draggable panel with snap points (collapsed/half/full)
- **Geolocation**: Center map to current location with one tap
- **Offline Support**: Service Worker caching for offline access
- **PWA Installation**: Install as native-like app on mobile and desktop

## Tech Stack

### Core Technologies
- **HTML5**: Semantic markup, PWA meta tags
- **CSS3**: Flexbox/Grid layouts, responsive design, CSS animations
- **JavaScript (ES6+)**: async/await, arrow functions, template literals

### External Libraries
- **Leaflet 1.9.4**: Interactive maps, markers, popups, polylines
- **OpenStreetMap**: Free map tiles (no API key required)

### APIs
- **YouBike Official API**: Real-time station data (`apis.youbike.com.tw/json/station-yb2.json`)

### Browser APIs
- Geolocation API for user location
- localStorage for preferences (language, city)
- Service Worker API for offline caching
- Fetch API for async requests

## Quick Start

This is a static web application with **no build system required**.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/youbike.git
   cd youbike
   ```

2. **Start a local server**:
   ```bash
   python3 -m http.server 8001
   ```

   Or use alternatives:
   ```bash
   # Node.js
   npx serve . -p 8001

   # PHP
   php -S localhost:8001
   ```

3. **Open in browser**:
   ```
   http://localhost:8001
   ```

No `npm install`, no build commands. Just serve and browse.

## Project Structure

```
youbike/
├── index.html              # Main page with map/list views
├── manifest.webapp         # PWA manifest
├── sw.js                   # Service Worker for offline caching
├── favicon.ico
├── js/
│   ├── common.js           # Shared utilities (distance, language, cities)
│   ├── ubike.js            # Main controller (map, list, search, filters)
│   └── bottom-sheet.js     # Mobile bottom sheet component
├── img/                    # App icons (32px to 512px)
├── android/                # Android native build
│   └── app/
│       └── build.gradle    # Android config (tw.pwa.youbike)
├── ios/                    # iOS native build
│   ├── Youbike/
│   │   └── Youbike/
│   │       └── Info.plist  # iOS bundle config
│   └── sync-web.sh         # Sync web assets to iOS bundle
├── tests/
│   └── app.spec.js         # Playwright E2E tests
├── playwright.config.js    # Playwright configuration
└── package.json            # Test dependencies only
```

## Native Builds

### Android
- **Package ID**: `tw.pwa.youbike`
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 35
- **Build**: Standard Android Gradle project in `android/` directory
- **Output**: `youbike-1.0.0-1.apk`

**Build instructions**:
```bash
cd android
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/youbike-1.0.0-1.apk
```

### iOS
- **Bundle ID**: Set in Xcode project
- **Version**: 1.0.0 (Build 1)
- **Min iOS**: Set in Xcode project
- **Build**: Standard iOS Xcode project in `ios/Youbike/`

**Build instructions**:
1. Sync web assets:
   ```bash
   cd ios
   ./sync-web.sh
   ```

2. Open `ios/Youbike/Youbike.xcodeproj` in Xcode

3. Build and run on device or simulator

**Note**: The iOS app embeds web assets in the `Web/` folder within the bundle.

## Testing

End-to-end tests using Playwright:

```bash
# Install dependencies (first time only)
npm install

# Run tests (requires server running on port 8001)
npx playwright test

# Run tests in headed mode (see browser)
npx playwright test --headed
```

**Test coverage**:
- PWA manifest and service worker registration
- Page load and console error detection
- Map initialization (Leaflet)
- City selector and search functionality
- Language toggle (EN/中文)
- Responsive design (mobile/desktop viewports)
- Bottom sheet on mobile
- Geolocation button
- Fare card and report modal
- No cross-app navigation links
- localStorage preferences

## API

### YouBike Official API
```
GET https://apis.youbike.com.tw/json/station-yb2.json
```

**Response**: JSON array of all stations across Taiwan

**Example station**:
```json
{
  "sno": "500101001",
  "sna": "YouBike2.0_捷運台大醫院站(2號出口)",
  "snaen": "YouBike2.0_MRT Natl. Taiwan Univ. Hospital Sta. (Exit 2)",
  "aren": "Taipei",
  "act": "1",
  "srcUpdateTime": "2026-04-09 07:30:15",
  "updateTime": "2026-04-09 07:30:48",
  "infoTime": "2026-04-09 07:30:15",
  "latitude": "25.04123",
  "longitude": "121.51728",
  "available_rent_bikes": 15,
  "available_return_bikes": 27
}
```

**Normalized schema** (in `common.js`):
```javascript
{
  sno: string,                    // Station ID
  sna: string,                    // Name (Chinese)
  snaen: string,                  // Name (English)
  latitude: number,
  longitude: number,
  available_rent_bikes: number,   // Bikes available
  available_return_bikes: number, // Empty slots
  city: string,                   // City key
  areaCode: string                // API area code
}
```

## Service Worker Caching

| Resource | Strategy | TTL |
|----------|----------|-----|
| Static assets (HTML, JS, CSS) | Cache-first | 24 hours |
| Map tiles (OSM) | Cache-first | 7 days |
| YouBike API | Stale-while-revalidate | 5 minutes |

## Development

### Code Style
- `'use strict'` in all JS files
- ES6+: const/let, async/await, arrow functions, template literals
- CSS: Mobile-first, flexbox/grid, CSS custom properties
- Console prefixes: `[UBike]` for logging

### Mobile UI (≤768px)
- Bottom sheet with drag handle
- Snap points: Collapsed (56px), Half (50vh), Full (90vh)
- Fixed map position behind panel

### Desktop UI (>768px)
- Side panel layout
- No bottom sheet (always expanded)

## License

[License Placeholder - Add your license here]

---

**Live Demo**: [Add deployment URL here]
**Issues**: [Add issue tracker URL here]
**Contributing**: [Add contribution guidelines here]

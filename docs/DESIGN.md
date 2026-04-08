# YouBike Design Document

## Architecture Overview

YouBike is a Progressive Web App (PWA) built with vanilla JavaScript, HTML5, and CSS3. The app displays real-time bike-sharing station data on an interactive Leaflet map with OpenStreetMap tiles. It functions as a static single-page application that can be:

- Served via HTTP on GitHub Pages (https://oouyang.github.io/ubike/)
- Loaded in Android WebView or iOS WKWebView for native app wrappers
- Installed as a PWA via the Web App Manifest for offline use

The architecture follows a client-side rendering pattern with no backend server. All data is fetched directly from the YouBike Official API via CORS-enabled endpoints.

## Data Flow

### Data Sources
- **YouBike Official API**: `https://apis.youbike.com.tw/json/station-yb2.json`
  - Returns JSON array of all YouBike 2.0 stations across 13 Taiwan cities
  - Includes station name (Chinese/English), location (lat/lng), available bikes, empty slots
  - No authentication required

### Fetch-Render Cycle
1. On page load, `loadStations()` fetches station data via `fetch()` API
2. Data is normalized to common schema via `normalizeStation()` helper
3. Stations are filtered by selected city (default: Taipei)
4. In Map View: markers are rendered on Leaflet map with color coding (green=ok, orange=empty bikes, red=full slots)
5. In List View: sortable table renders with distance calculations from user location
6. Auto-refresh timer fetches fresh data every 5 minutes

### Distance Calculation
- User location obtained via Geolocation API (`navigator.geolocation.getCurrentPosition`)
- Haversine formula calculates distance between user and each station
- Results cached in-memory during session, persisted across view toggles

## UI Components

### Navigation Header
- Language toggle button (EN/中文) with localStorage persistence
- City selector dropdown (13 cities: Taipei, New Taipei, Taoyuan, etc.)
- View toggle buttons (Map/List) with active state styling
- Links to other transport apps (MRT, Rail, THSR, Bus)

### Map View (Default)
- Leaflet 1.9.4 map with OpenStreetMap tiles
- Color-coded markers: green (#80FF00), orange (#FF9E21), red (#FF4D00)
- Station search panel with autocomplete filtering
- Popup shows station name, available bikes/slots, distance, navigation links
- Locate button (bottom-right) centers map to user GPS position
- Route tracking: blue polyline shows user's travel path

### List View
- Sortable HTML table (click column header: desc → asc → reset)
- Columns: Station Name, Bikes, Slots, Distance
- Responsive design: distance column hidden on mobile (≤768px)
- Search filter highlights matching rows

### Mobile Bottom Sheet (≤768px)
- Google Maps-style draggable panel with three snap points:
  - Collapsed (56px): handle + summary line ("🚲 Taipei • 400 stations")
  - Half (50vh): handle + filters + partial list
  - Full (90vh): handle + filters + full scrollable list
- Drag handle with pill indicator
- Smooth CSS transitions with touch event handling

## Caching Strategy

### Service Worker (`sw.js`)
The app uses a multi-strategy caching approach:

| Resource Type | Strategy | TTL |
|---------------|----------|-----|
| Static assets (HTML, CSS, JS) | Cache-first | 24 hours |
| Map tiles (tile.openstreetmap.org) | Cache-first | 7 days |
| YouBike API (apis.youbike.com.tw) | Stale-while-revalidate | 5 minutes |

### Stale-While-Revalidate Logic
1. Check cache first, return cached response immediately if available
2. Fetch fresh data in background, update cache for next request
3. If cache miss, wait for network response before rendering
4. On network failure, serve stale cache if available (graceful degradation)

### Cache Invalidation
- Static assets: versioned by service worker CACHE_VERSION constant
- API responses: TTL-based expiration via cache headers
- Manual refresh: pull-to-refresh gesture on mobile clears API cache

## Localization

### Language Toggle Mechanism
- Default language detected via `navigator.language` (zh-TW/zh-CN → Chinese, else English)
- User selection stored in `localStorage` under key `ubike-lang`
- Text elements use `data-en` and `data-zh` HTML attributes
- JavaScript toggles element `textContent` based on active language
- Navigation buttons, station names, UI labels all bilingual

### Implementation Pattern
```javascript
function updateLanguage(lang) {
  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = lang === 'zh' ? el.dataset.zh : el.dataset.en;
  });
  saveLanguage(lang); // localStorage.setItem('ubike-lang', lang)
}
```

## Native Wrappers

### Android WebView
- Native Android app loads `file:///android_asset/index.html`
- Web assets synced to `/app/src/main/assets/` directory at build time
- WebView settings: JavaScript enabled, geolocation permission granted
- Bridge for native features: share sheet, push notifications, app links

### iOS WKWebView
- Native iOS app loads local HTML via `WKWebView.loadFileURL()`
- Web assets bundled in Xcode project under `Resources/` folder
- Configuration: `allowsInlineMediaPlayback`, `mediaTypesRequiringUserActionForPlayback`
- Swift bridge for native APIs: location services, haptic feedback, app shortcuts

### Asset Sync Strategy
- CI/CD pipeline copies web build to native project folders
- Git submodule links web repo to `ios/YouBike/Resources/` and `android/app/src/main/assets/`
- Native build scripts verify asset integrity before compilation

## State Management

### localStorage Keys
| Key | Purpose | Values |
|-----|---------|--------|
| `ubike-lang` | User language preference | `'en'` \| `'zh'` |
| `ubike-city` | Selected city filter | City key (e.g., `'Taipei'`) |
| `ubike-view` | Active view mode | `'map'` \| `'list'` |

### In-Memory State
- `userLocation`: GPS coordinates object `{lat, lng}` from Geolocation API
- `allStations`: Full normalized station array from API
- `filteredStations`: Subset after city/search filters applied
- `selectedMarker`: Currently highlighted station on map (for zoom/popup)
- `autoRefreshTimer`: `setInterval()` ID for 5-minute refresh cycle

### State Persistence
- Language, city, view mode: persisted to localStorage on change
- User location: ephemeral, re-fetched each session (privacy consideration)
- Station data: not persisted, always fetched fresh (real-time accuracy)
- Service worker cache serves as implicit state layer for offline mode

## Future Plan

### Short-term
- Add station availability trend charts (last 24 hours)
- Implement favorite stations with quick access
- Add ride duration estimator between two stations
- Push notifications for station full/empty alerts near favorites

### Medium-term
- Route planner: suggest optimal YouBike routes between locations
- Integrate with MRT/bus transfer suggestions
- Historical usage heatmap by time of day
- Widget support for Android/iOS home screen

### Long-term
- Predictive availability using ML (forecast bike counts)
- Social features: share rides, popular routes
- Gamification: riding streaks, distance badges

## TODO

- [ ] Add .gitignore for build artifacts
- [ ] Implement station favorite/bookmark feature
- [ ] Add pull-to-refresh for station data
- [ ] Cache station data for offline viewing
- [ ] Add unit tests for distance calculation functions
- [ ] Optimize marker rendering for "All Cities" view (2000+ markers)
- [ ] Add dark mode support
- [ ] Implement route tracking polyline persistence

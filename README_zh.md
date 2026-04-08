[English](README.md) | 繁體中文

# YouBike 站點定位器

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?style=flat&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=flat&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

一個用於查找台灣 YouBike 共享單車站點的漸進式網頁應用程式（PWA）。透過互動式地圖介面追蹤全台 13 個縣市超過 2000 個站點的即時單車與車位數量。

## 截圖

![YouBike Station Locator](screenshot.png)
*截圖範例 - 互動式地圖檢視與站點標記*

## 功能特色

- **互動式地圖檢視**：採用 Leaflet 技術的地圖，具有顏色標記的站點標誌
  - 綠色：有單車且有車位
  - 橘色：沒有單車
  - 紅色：沒有空車位
  - 灰色：站點暫停服務
- **13 個縣市覆蓋**：台北市、新北市、桃園市、新竹市、新竹縣、苗栗縣、台中市、嘉義市、嘉義縣、台南市、高雄市、屏東縣、台東縣
- **站點搜尋**：即時過濾與下拉式建議
- **距離排序**：根據使用者位置自動計算距離
- **電輔車篩選**：篩選有電動輔助自行車（2.0E）的站點
- **費率資訊**：檢視 YouBike 費率與 TPASS 整合資訊
- **問題回報**：使用自動填寫表單回報站點問題
- **雙語支援**：英文與繁體中文切換
- **行動版底部面板**：Google Maps 風格的可拖曳面板，具有吸附點（收合/半展開/全展開）
- **地理定位**：一鍵將地圖置中於目前位置
- **離線支援**：Service Worker 快取機制支援離線存取
- **PWA 安裝**：可在行動裝置與桌面安裝為類原生應用程式

## 技術架構

### 核心技術
- **HTML5**：語意化標記、PWA meta 標籤
- **CSS3**：Flexbox/Grid 版面配置、響應式設計、CSS 動畫
- **JavaScript (ES6+)**：async/await、箭頭函式、模板字串

### 外部函式庫
- **Leaflet 1.9.4**：互動式地圖、標記、彈出視窗、折線
- **OpenStreetMap**：免費地圖圖磚（無需 API 金鑰）

### APIs
- **YouBike 官方 API**：即時站點資料（`apis.youbike.com.tw/json/station-yb2.json`）

### 瀏覽器 APIs
- Geolocation API 用於使用者定位
- localStorage 用於偏好設定（語言、城市）
- Service Worker API 用於離線快取
- Fetch API 用於非同步請求

## 快速開始

這是一個靜態網頁應用程式，**不需要建置系統**。

1. **複製儲存庫**：
   ```bash
   git clone https://github.com/yourusername/youbike.git
   cd youbike
   ```

2. **啟動本地伺服器**：
   ```bash
   python3 -m http.server 8001
   ```

   或使用其他方式：
   ```bash
   # Node.js
   npx serve . -p 8001

   # PHP
   php -S localhost:8001
   ```

3. **在瀏覽器中開啟**：
   ```
   http://localhost:8001
   ```

無需 `npm install`，無需建置指令。只需啟動伺服器並瀏覽。

## 專案結構

```
youbike/
├── index.html              # 主頁面，含地圖/列表檢視
├── manifest.webapp         # PWA manifest
├── sw.js                   # Service Worker 用於離線快取
├── favicon.ico
├── js/
│   ├── common.js           # 共用工具（距離、語言、城市）
│   ├── ubike.js            # 主控制器（地圖、列表、搜尋、篩選）
│   └── bottom-sheet.js     # 行動版底部面板元件
├── img/                    # 應用程式圖示（32px 到 512px）
├── android/                # Android 原生建置
│   └── app/
│       └── build.gradle    # Android 設定（tw.pwa.youbike）
├── ios/                    # iOS 原生建置
│   ├── Youbike/
│   │   └── Youbike/
│   │       └── Info.plist  # iOS bundle 設定
│   └── sync-web.sh         # 同步網頁資源至 iOS bundle
├── tests/
│   └── app.spec.js         # Playwright E2E 測試
├── playwright.config.js    # Playwright 設定
└── package.json            # 僅測試相依套件
```

## 原生建置

### Android
- **套件 ID**：`tw.pwa.youbike`
- **最低 SDK**：24（Android 7.0）
- **目標 SDK**：35
- **建置**：`android/` 目錄中的標準 Android Gradle 專案
- **輸出**：`youbike-1.0.0-1.apk`

**建置說明**：
```bash
cd android
./gradlew assembleRelease
# 輸出：app/build/outputs/apk/release/youbike-1.0.0-1.apk
```

### iOS
- **Bundle ID**：在 Xcode 專案中設定
- **版本**：1.0.0（Build 1）
- **最低 iOS**：在 Xcode 專案中設定
- **建置**：`ios/Youbike/` 中的標準 iOS Xcode 專案

**建置說明**：
1. 同步網頁資源：
   ```bash
   cd ios
   ./sync-web.sh
   ```

2. 在 Xcode 中開啟 `ios/Youbike/Youbike.xcodeproj`

3. 在裝置或模擬器上建置並執行

**注意**：iOS 應用程式將網頁資源嵌入 bundle 內的 `Web/` 資料夾中。

## 測試

使用 Playwright 進行端對端測試：

```bash
# 安裝相依套件（僅首次）
npm install

# 執行測試（需要在 port 8001 執行伺服器）
npx playwright test

# 以視窗模式執行測試（可看到瀏覽器）
npx playwright test --headed
```

**測試涵蓋範圍**：
- PWA manifest 與 service worker 註冊
- 頁面載入與主控台錯誤偵測
- 地圖初始化（Leaflet）
- 城市選擇器與搜尋功能
- 語言切換（EN/中文）
- 響應式設計（行動/桌面視窗）
- 行動版底部面板
- 地理定位按鈕
- 費率卡片與回報對話框
- 無跨應用程式導航連結
- localStorage 偏好設定

## API

### YouBike 官方 API
```
GET https://apis.youbike.com.tw/json/station-yb2.json
```

**回應**：台灣所有站點的 JSON 陣列

**站點範例**：
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

**標準化架構**（於 `common.js` 中）：
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

## Service Worker 快取

| 資源 | 策略 | TTL |
|----------|----------|-----|
| 靜態資源（HTML、JS、CSS） | Cache-first | 24 小時 |
| 地圖圖磚（OSM） | Cache-first | 7 天 |
| YouBike API | Stale-while-revalidate | 5 分鐘 |

## 開發

### 程式碼風格
- 所有 JS 檔案使用 `'use strict'`
- ES6+：const/let、async/await、箭頭函式、模板字串
- CSS：行動優先、flexbox/grid、CSS 自訂屬性
- 主控台前綴：`[UBike]` 用於日誌記錄

### 行動版 UI（≤768px）
- 具有拖曳手把的底部面板
- 吸附點：收合（56px）、半展開（50vh）、全展開（90vh）
- 面板後方的固定地圖位置

### 桌面版 UI（>768px）
- 側邊面板版面配置
- 無底部面板（永遠展開）

## 授權

[授權佔位符 - 請在此新增您的授權]

---

**線上展示**：[請在此新增部署 URL]
**問題回報**：[請在此新增問題追蹤器 URL]
**貢獻**：[請在此新增貢獻指南]

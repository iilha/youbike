import SwiftUI
import WebKit

struct WebViewScreen: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.websiteDataStore = .default()

        let prefs = WKWebpagePreferences()
        prefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = prefs

        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.setValue(true, forKey: "allowUniversalAccessFromFileURLs")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 1, green: 1, blue: 1, alpha: 1)
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.navigationDelegate = context.coordinator

        if let htmlURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
            webView.loadFileURL(htmlURL, allowingReadAccessTo: htmlURL.deletingLastPathComponent())
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator() }

    class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = navigationAction.request.url {
                if url.isFileURL { decisionHandler(.allow); return }
                let host = url.host ?? ""
                let allowedHosts = ["tile.openstreetmap.org", "unpkg.com", "apis.youbike.com.tw",
                    "tdx.transportdata.tw", "earthquake.usgs.gov", "api.open-meteo.com",
                    "geocoding-api.open-meteo.com", "overpass-api.de", "openapi.twse.com.tw",
                    "owen-ouyang.workers.dev"]
                if allowedHosts.contains(where: { host.contains($0) }) {
                    decisionHandler(.allow); return
                }
                if url.scheme == "http" || url.scheme == "https" {
                    UIApplication.shared.open(url)
                    decisionHandler(.cancel); return
                }
            }
            decisionHandler(.allow)
        }
    }
}

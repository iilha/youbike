package tw.pwa.youbike;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.GeolocationPermissions;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.setStatusBarColor(Color.parseColor("#B71C1C"));
        window.setNavigationBarColor(Color.parseColor("#B71C1C"));

        WebView webView = new WebView(this);
        setContentView(webView);

        webView.setBackgroundColor(Color.WHITE);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings settings = webView.getSettings();

        // JavaScript (required for app functionality)
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setTextZoom(100);

        // Security: Disable file access (avoid file:// attacks, except for offline.html fallback)
        settings.setAllowFileAccess(true); // Need true for offline.html, but restrict to assets only
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);

        // Security: Block mixed content (HTTPS page loading HTTP resources)
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        // Security: Disable auto-opening windows (prevent popup abuse)
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);

        // Security: Enable Safe Browsing (if API level >= 27)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            settings.setSafeBrowsingEnabled(true);
        }

        // Set WebChromeClient for geolocation
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                    GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
        });

        // Set WebViewClient for comprehensive behavior control
        webView.setWebViewClient(new WebViewClient() {

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);

                // Inject environment flag AFTER page load (re-entrant, every page load)
                // Only for same-origin or offline.html
                if (url.startsWith(BuildConfig.WEB_ORIGIN) || url.startsWith("file:///android_asset/")) {
                    String envJson = "{" +
                        "platform: 'android'," +
                        "build: 'webview'," +
                        "nativeVersionName: '" + BuildConfig.VERSION_NAME + "'," +
                        "nativeVersionCode: " + BuildConfig.VERSION_CODE +
                        "}";
                    view.evaluateJavascript("window.__APP_ENV__ = " + envJson + ";", null);
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                Uri uri = Uri.parse(url);

                // Handle app://retry custom scheme (from offline.html)
                if ("app".equals(uri.getScheme()) && "retry".equals(uri.getHost())) {
                    view.loadUrl(BuildConfig.WEB_ORIGIN);
                    return true;
                }

                // Same origin: stay in WebView
                if (url.startsWith(BuildConfig.WEB_ORIGIN)) {
                    return false;
                }

                // Special schemes: delegate to system
                String scheme = uri.getScheme();
                if ("mailto".equals(scheme) || "tel".equals(scheme) || "market".equals(scheme) ||
                    url.startsWith("https://play.google.com/")) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(intent);
                    return true;
                }

                // External domain: open in browser
                Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                startActivity(intent);
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                                        WebResourceError error) {
                // Fallback to offline page if main frame load fails (network errors only)
                if (request.isForMainFrame()) {
                    int errorCode = error.getErrorCode();
                    // Only fallback on network errors, not HTTP 404/500
                    if (errorCode == ERROR_HOST_LOOKUP ||
                        errorCode == ERROR_CONNECT ||
                        errorCode == ERROR_TIMEOUT ||
                        errorCode == ERROR_IO) {
                        view.loadUrl("file:///android_asset/offline.html");
                    }
                }
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                // CRITICAL: Always cancel on SSL errors (never proceed)
                handler.cancel();

                // Show offline.html with security error context
                view.loadUrl("file:///android_asset/offline.html");

                android.util.Log.e("WebView", "SSL Error: " + error.getPrimaryError());
            }
        });

        // Load remote site (remote-first, uses BuildConfig.WEB_ORIGIN)
        webView.loadUrl(BuildConfig.WEB_ORIGIN);
    }
}
